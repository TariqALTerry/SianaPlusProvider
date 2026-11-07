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

/**
 * A list read with a `branchId` the user no longer has (`BranchNotFound`, PROVIDER-BRANCHES phase 1 §4): the branch
 * switcher clears its saved choice, and the queries run again without it.
 */
let onBranchRejected: () => void = () => {}

export function setBranchRejectedHandler(handler: () => void): void {
  onBranchRejected = handler
}

function isBranchScopedRead(config: AxiosRequestConfig | undefined): boolean {
  const params = config?.params as Record<string, unknown> | undefined
  return (config?.method ?? 'get').toLowerCase() === 'get' && !!params && params.branchId !== undefined
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

/**
 * A `responseType: 'blob'` call gets its error body as a Blob. Read it back into the envelope so
 * the code and the localized message work as on any other call; anything else is left out.
 */
async function readBlobEnvelope(error: AxiosError<ApiResponse<unknown>>): Promise<void> {
  const body: unknown = error.response?.data
  if (!error.response || !(body instanceof Blob)) return
  let parsed: ApiResponse<unknown> | undefined
  try {
    parsed = JSON.parse(await body.text()) as ApiResponse<unknown>
  } catch {
    parsed = undefined
  }
  error.response.data = parsed as ApiResponse<unknown>
}

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    await readBlobEnvelope(error)
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
    if (code === 'BranchNotFound' && isBranchScopedRead(config)) onBranchRejected()

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
  /** `timeout` overrides the 30 s default for the few slow calls (the store's AI draft). */
  post: <T = string>(url: string, body?: unknown, options?: { timeout?: number }) => send<T>({ method: 'POST', url, data: body ?? {}, timeout: options?.timeout }),
  put: <T = string>(url: string, body?: unknown) => send<T>({ method: 'PUT', url, data: body ?? {} }),
  patch: <T = string>(url: string, body?: unknown) => send<T>({ method: 'PATCH', url, data: body ?? {} }),
  delete: <T = string>(url: string) => send<T>({ method: 'DELETE', url }),
  upload: <T>(url: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return send<T>({ method: 'POST', url, data: form })
  },
  /** A file behind the session (a PDF report): no envelope on success, the usual `ApiError` on failure. */
  blob: async (url: string, params?: object, options?: { timeout?: number }) => {
    const response = await client.request<Blob>({ method: 'GET', url, params: cleanParams(params), responseType: 'blob', timeout: options?.timeout })
    return response.data
  },
  /** multipart/form-data with text fields and an optional file (e.g. a service message). */
  form: <T>(url: string, fields: Record<string, string | null | undefined>, file?: File | null) => {
    const form = new FormData()
    for (const [key, value] of Object.entries(fields)) if (value) form.append(key, value)
    if (file) form.append('file', file)
    return send<T>({ method: 'POST', url, data: form })
  },
}

/**
 * The public pages (the tracking page `/t/{token}`, PROVIDER-BRANCHES phase 4 §6): no `Authorization`, no refresh, no
 * session handling, and no back-off shared with the signed-in app. Same envelope and `ApiError` as `http`.
 */
const publicClient = axios.create({ baseURL: API_ORIGIN, timeout: TIMEOUT_MS, headers: { Accept: 'application/json' } })

async function sendPublic<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await publicClient.request<ApiResponse<T>>({ ...config, headers: { 'Accept-Language': currentLanguage() } })
    const body = response.data
    if (!body || body.success !== true) {
      throw new ApiError({ status: response.status, errorCode: body?.errorCode ?? null, message: body?.message ?? 'UnknownError', details: body?.data })
    }
    return body.data as T
  } catch (error) {
    const e = toApiError(error)
    // A 429 from the rate limiter may come without the envelope.
    if (e.status === 429 && !e.errorCode) throw new ApiError({ status: 429, errorCode: 'TooManyRequests', message: e.message, details: e.details })
    throw e
  }
}

export const publicHttp = {
  get: <T>(url: string, signal?: AbortSignal) => sendPublic<T>({ method: 'GET', url, signal }),
  post: <T>(url: string, body?: unknown) => sendPublic<T>({ method: 'POST', url, data: body ?? {} }),
}
