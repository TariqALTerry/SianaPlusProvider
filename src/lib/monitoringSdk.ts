import * as Sentry from '@sentry/react'
import type { Breadcrumb, Event } from '@sentry/react'
import { session } from '@/api/session'

/**
 * The Sentry half of `monitoring.ts`. Only ever loaded through that module's dynamic `import()`,
 * once a DSN is configured, so neither this file nor `@sentry/react` is in the initial bundle.
 * (The file name deliberately avoids "sentry": ad blockers match that in script URLs.)
 *
 * No PII: only the signed-in user's id is attached; the Authorization header, tokens and
 * search / phone / email query values are scrubbed from URLs, breadcrumbs, spans and events.
 */

const env = import.meta.env
const DEFAULT_TRACES_SAMPLE_RATE = 0.1

export function tracesSampleRate(value: unknown): number {
  const raw = String(value ?? '').trim()
  const rate = raw === '' ? Number.NaN : Number(raw)
  return Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : DEFAULT_TRACES_SAMPLE_RATE
}

// ── Scrubbing (pure; unit-tested) ───────────────────────────────────────────

const SENSITIVE_PARAM = /token|auth|password|secret|otp|code|phone|mobile|email|search|^q$/i
const SENSITIVE_KEY = /authorization|cookie|token|password|secret/i
const QUERY_PAIR = /([?&])([^=&#\s]+)=([^&#\s]*)/g
const BEARER = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi
const REDACTED = '[Filtered]'

function decodeSafe(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * Redacts bearer tokens and the values of sensitive query parameters (tokens, OTP codes, phone,
 * email, search terms) wherever they appear: full URLs, paths or span descriptions.
 */
export function scrubText(text: string): string {
  return text
    .replace(BEARER, `Bearer ${REDACTED}`)
    .replace(QUERY_PAIR, (pair, sep: string, key: string) => (SENSITIVE_PARAM.test(decodeSafe(key)) ? `${sep}${key}=${REDACTED}` : pair))
}

/** Recursively replaces credential-like keys and scrubs every string. */
function scrubValue(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return scrubText(value)
  if (depth > 4 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1))
  const out: Record<string, unknown> = {}
  for (const [key, v] of Object.entries(value)) out[key] = SENSITIVE_KEY.test(key) ? REDACTED : scrubValue(v, depth + 1)
  return out
}

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  return {
    ...breadcrumb,
    ...(breadcrumb.message ? { message: scrubText(breadcrumb.message) } : {}),
    ...(breadcrumb.data ? { data: scrubValue(breadcrumb.data) as Breadcrumb['data'] } : {}),
  }
}

/** For error and transaction events alike: user id only, no cookies/bodies, no credentials. */
export function scrubEvent<T extends Event>(event: T): T {
  if (event.user) event.user = event.user.id === undefined ? {} : { id: event.user.id }
  if (event.request) {
    const request = { ...event.request }
    delete request.cookies
    delete request.data
    delete request.query_string
    event.request = scrubValue(request) as T['request']
  }
  if (event.message) event.message = scrubText(event.message)
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = scrubText(exception.value)
  }
  if (event.breadcrumbs) event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb)
  for (const span of event.spans ?? []) {
    if (span.description) span.description = scrubText(span.description)
    if (span.data) span.data = scrubValue(span.data) as typeof span.data
  }
  return event
}

/** `/work/3f2a…/quote` → `/work/:id/quote`, so page loads group by route, not by record. */
export function spanName(pathname: string): string {
  return pathname
    .split('/')
    .map((segment) => (/^\d+$|^[0-9a-f]{8}-[0-9a-f]{4}-|^[a-z]{1,4}-\d+/i.test(segment) ? ':id' : segment))
    .join('/')
}

// ── Init ────────────────────────────────────────────────────────────────────

function syncUser(): void {
  const id = session.user?.id
  Sentry.setUser(id ? { id } : null)
}

/** Starts the SDK and returns the reporter `monitoring.ts` forwards caught errors to. */
export function initSentry(dsn: string): (error: unknown, componentStack?: string | null) => void {
  Sentry.init({
    dsn,
    release: `siana-provider@${__APP_VERSION__}`,
    environment: String(env.VITE_SENTRY_ENVIRONMENT ?? '').trim() || env.MODE,
    sendDefaultPii: false,
    integrations: [
      // Page loads, navigations and web vitals (LCP, INP, CLS, FCP, TTFB).
      Sentry.browserTracingIntegration({
        beforeStartSpan: (options) => ({ ...options, name: spanName(options.name) }),
      }),
    ],
    tracesSampleRate: tracesSampleRate(env.VITE_SENTRY_TRACES_SAMPLE_RATE),
    // Never add sentry-trace/baggage headers to API calls: the API's CORS policy doesn't allow them.
    tracePropagationTargets: [],
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
    beforeSend: (event) => scrubEvent(event),
    beforeSendTransaction: (event) => scrubEvent(event),
  })
  syncUser()
  session.subscribe(syncUser)
  return (error, componentStack) => {
    Sentry.captureException(error, componentStack ? { contexts: { react: { componentStack } } } : undefined)
  }
}
