import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { recordRequest, useNetStatus } from './netStatus'
import { deviceId, session } from './session'
import type { ApiErrorShape, ApiResponse, AuthResponse } from './types'

/**
 * The only HTTP configuration point: base URL, auth header, Accept-Language, envelope
 * unwrapping, single-flight token refresh, 429 back-off and the request counter.
 * Feature `api.ts` files call `http.get/post/...` and receive the unwrapped `data`.
 */

export const API_ORIGIN = String(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

const TIMEOUT_MS = 30_000
const BACKOFF_MS = 10_000
/** Refresh proactively when the access token has less than this left. */
const REFRESH_LEAD_MS = 60_000
const REFRESH_PATH = '/api/auth/refresh'

// ── Error type ──────────────────────────────────────────────────────────────

export class ApiError extends Error implements ApiErrorShape {
  readonly status: number
  readonly errorCode: string | null
  readonly details: unknown

  constructor(shape: ApiErrorShape) {
    super(shape.message)
    this.name = 'ApiError'
    this.status = shape.status
    this.errorCode = shape.errorCode
    this.details = shape.details
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** Normalizes anything a request can reject with. `status: 0` = never reached the server. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (axios.isCancel(error)) return new ApiError({ status: 0, errorCode: 'Aborted', message: 'Aborted' })
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as Partial<ApiResponse<unknown>> | undefined
    return new ApiError({
      status: error.response?.status ?? 0,
      errorCode: body?.errorCode ?? (error.response ? null : 'NetworkError'),
      message: body?.message || error.message,
      details: body?.data ?? undefined,
    })
  }
  if (error instanceof Error) return new ApiError({ status: 0, errorCode: null, message: error.message })
  return new ApiError({ status: 0, errorCode: null, message: 'UnknownError' })
}

// ── Hooks the app wires in (keeps this module free of router/store imports) ──

/**
 * Why the http layer ended a session (§4 of the brief):
 * - `blocked`: the account is inactive, suspended or pending approval;
 * - `tenant`: the organization is suspended or its subscription expired;
 * - `missing`: the organization/tenant could not be resolved;
 * - `expired`: the refresh token was rejected.
 */
export type SessionEndReason = 'expired' | 'blocked' | 'tenant' | 'missing'

const SESSION_END_CODES: Record<string, SessionEndReason> = {
  AccountInactive: 'blocked',
  AccountSuspended: 'blocked',
  AccountPendingApproval: 'blocked',
  TenantSuspended: 'tenant',
  SubscriptionExpired: 'tenant',
  TenantNotFound: 'missing',
  TenantRequired: 'missing',
  ProviderOrganizationNotFound: 'missing',
}

/** Exposed for the sign-in screen, which gets these codes before any session exists. */
export function sessionEndReasonFor(errorCode: string | null | undefined): SessionEndReason | null {
  return (errorCode && SESSION_END_CODES[errorCode]) || null
}

let onSessionEnd: (reason: SessionEndReason, message?: string) => void = () => {}

export function setSessionEndHandler(handler: typeof onSessionEnd): void {
  onSessionEnd = handler
}

/**
 * Codes that mean the organization's state changed under us — status (`ProviderNotOperational`),
 * business model (`MarketplaceNotEnabled`), store flag (`StoreModuleDisabled`) or the caller's
 * role (`OwnerOnly`). The app refetches the organization and `/me`; the failing action's dialog
 * still shows the server message.
 */
const STALE_STATE_CODES = new Set(['ProviderNotOperational', 'MarketplaceNotEnabled', 'StoreModuleDisabled', 'OwnerOnly'])
let onStaleState: (errorCode: string) => void = () => {}

export function setStaleStateHandler(handler: typeof onStaleState): void {
  onStaleState = handler
}

// ── Instances ───────────────────────────────────────────────────────────────

export const client = axios.create({
  baseURL: API_ORIGIN,
  timeout: TIMEOUT_MS,
  headers: { Accept: 'application/json' },
  // `Status=A&Status=B` — ASP.NET binds repeated keys to a list; brackets would not bind.
  paramsSerializer: { indexes: null },
})

/** Interceptor-free, so a 401 from the refresh call can never trigger another refresh. */
const bare = axios.create({ baseURL: API_ORIGIN, timeout: TIMEOUT_MS })

/** Exposed for unit tests (adapter injection) only. */
export const refreshClient = bare

function currentLanguage(): string {
  return document.documentElement.lang === 'en' ? 'en' : 'ar'
}

// ── Refresh (single-flight) ─────────────────────────────────────────────────

let refreshInFlight: Promise<string> | null = null

async function doRefresh(): Promise<string> {
  const accessToken = session.accessToken
  const refreshToken = session.refreshToken
  if (!accessToken || !refreshToken) throw new ApiError({ status: 401, errorCode: 'NoSession', message: 'NoSession' })

  recordRequest()
  const response = await bare.post<ApiResponse<AuthResponse>>(
    REFRESH_PATH,
    { accessToken, refreshToken, deviceId: deviceId() },
    { headers: { 'Accept-Language': currentLanguage() } },
  )
  const auth = response.data.data
  if (!response.data.success || !auth) {
    throw new ApiError({ status: 401, errorCode: response.data.errorCode ?? 'InvalidRefreshToken', message: response.data.message })
  }

  session.save(auth)
  return auth.accessToken
}

/** Every concurrent caller awaits the same refresh; the token rotates exactly once. */
export function refreshAccessToken(): Promise<string> {
  refreshInFlight ??= doRefresh().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

function tokenNeedsRefresh(now = Date.now()): boolean {
  const exp = session.expiresAt
  if (!exp || !session.refreshToken) return false
  const at = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(exp) ? exp : `${exp}Z`)
  return Number.isFinite(at) && at - now < REFRESH_LEAD_MS
}

// ── Interceptors ────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

client.interceptors.request.use(async (config) => {
  // 429 back-off: hold every request until the window passes instead of hammering.
  const until = useNetStatus.getState().rateLimitedUntil
  if (until && until > Date.now()) await sleep(until - Date.now())

  if (tokenNeedsRefresh()) {
    try {
      await refreshAccessToken()
    } catch {
      // Fall through: the request goes out with the old token and the 401 path decides.
    }
  }

  if (session.accessToken) config.headers.set('Authorization', `Bearer ${session.accessToken}`)
  config.headers.set('Accept-Language', currentLanguage())
  recordRequest()
  return config
})

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean
}

let backoffTimer: ReturnType<typeof setTimeout> | undefined

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const status = error.response?.status
    const config = error.config as RetriableConfig | undefined
    const code = error.response?.data?.errorCode

    if (status === 429) {
      const until = Date.now() + BACKOFF_MS
      useNetStatus.getState().setRateLimitedUntil(until)
      clearTimeout(backoffTimer)
      backoffTimer = setTimeout(() => useNetStatus.getState().setRateLimitedUntil(null), BACKOFF_MS)
    }

    if (code && STALE_STATE_CODES.has(code)) onStaleState(code)

    const endReason = (status === 403 || status === 404) && session.accessToken ? sessionEndReasonFor(code) : null
    if (endReason) {
      session.clear()
      onSessionEnd(endReason, error.response?.data?.message)
      return Promise.reject(toApiError(error))
    }

    if (status === 401 && config && !config._retried && session.refreshToken) {
      config._retried = true
      let token: string
      try {
        token = await refreshAccessToken()
      } catch (refreshError) {
        // Only a *rejected* refresh ends the session; a network blip during it is just this
        // request's error and the next request tries again.
        const failure = toApiError(refreshError)
        if (failure.status !== 0 && failure.status < 500) {
          session.clear()
          onSessionEnd('expired')
        }
        return Promise.reject(failure)
      }
      config.headers.set('Authorization', `Bearer ${token}`)
      return client.request(config)
    }

    if (status === 401 && !session.refreshToken && session.accessToken) {
      session.clear()
      onSessionEnd('expired')
    }

    return Promise.reject(toApiError(error))
  },
)

// ── Envelope unwrapping ─────────────────────────────────────────────────────

async function send<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await client.request<ApiResponse<T>>(config)
  const body = response.data
  if (!body || body.success !== true) {
    throw new ApiError({
      status: response.status,
      errorCode: body?.errorCode ?? null,
      message: body?.message ?? 'UnknownError',
      details: body?.data,
    })
  }
  // Void endpoints return `data: ""`; numeric endpoints may return 0 — both are valid.
  return body.data as T
}

/** Drops null/undefined/'' so the server applies its own defaults. */
export function cleanParams(params: object | undefined): Record<string, unknown> | undefined {
  if (!params) return undefined
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v) && v.length === 0) continue
    out[k] = v
  }
  return out
}

export const http = {
  get: <T>(url: string, params?: object, signal?: AbortSignal) =>
    send<T>({ method: 'GET', url, params: cleanParams(params), signal }),
  post: <T = string>(url: string, body?: unknown) => send<T>({ method: 'POST', url, data: body ?? {} }),
  put: <T = string>(url: string, body?: unknown) => send<T>({ method: 'PUT', url, data: body ?? {} }),
  patch: <T = string>(url: string, body?: unknown) => send<T>({ method: 'PATCH', url, data: body ?? {} }),
  delete: <T = string>(url: string) => send<T>({ method: 'DELETE', url }),
  upload: <T>(url: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return send<T>({ method: 'POST', url, data: form })
  },
}
