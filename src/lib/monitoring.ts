/**
 * Opt-in real-user monitoring: production errors and Core Web Vitals, sent to Sentry.
 *
 * - `VITE_SENTRY_DSN` empty (the default): every export is a no-op, nothing is registered and
 *   nothing is downloaded. This stub is all that ships in the initial bundle.
 * - With a DSN: `monitoringSdk.ts` (and `@sentry/react`) load through a dynamic `import()` once the
 *   browser is idle after the first render. Errors raised before that are queued and sent then.
 */

type Reporter = (error: unknown, componentStack?: string | null) => void

// Kept a plain literal expression so the build folds it to `false` and drops this module's code.
const DSN: string = import.meta.env.VITE_SENTRY_DSN || ''
export const monitoringEnabled = DSN !== ''

let report: Reporter | null = null
let started = false
let loading = false
/** Errors kept while the SDK is still loading; the rest are dropped. */
const pending: Array<Parameters<Reporter>> = []

/** Reports an error the app caught itself (the error boundaries). No-op without a DSN. */
export function reportError(error: unknown, componentStack?: string | null): void {
  if (!monitoringEnabled) return
  if (report) report(error, componentStack)
  else if (pending.length < 20) pending.push([error, componentStack])
}

if (monitoringEnabled) {
  // Registered before main.tsx's reload-on-stale-chunk handler: an SDK chunk that fails to load
  // (ad blocker, offline) must not reload the page. Other chunks keep the normal behaviour.
  window.addEventListener('vite:preloadError', (event) => {
    const message = String((event as Event & { payload?: Error }).payload?.message ?? '')
    if (!loading || (message.includes('/assets/') && !message.includes('monitoringSdk'))) return
    event.preventDefault()
    event.stopImmediatePropagation()
  })
}

/** Called once from main.tsx after the first render. Without a DSN it returns immediately. */
export function startMonitoring(): void {
  if (!monitoringEnabled || started) return
  started = true

  // Until the SDK installs its own global handlers, queue what would otherwise be lost.
  const onError = (event: ErrorEvent) => reportError(event.error ?? event.message)
  const onRejection = (event: PromiseRejectionEvent) => reportError(event.reason)
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)

  const load = () => {
    loading = true
    import('./monitoringSdk')
      .then((sdk) => {
        if (!sdk) throw new Error('monitoring unavailable')
        report = sdk.initSentry(DSN.trim())
        pending.splice(0).forEach((args) => report?.(...args))
      })
      .catch(() => {
        // The app carries on without monitoring.
        pending.length = 0
      })
      .finally(() => {
        loading = false
        window.removeEventListener('error', onError)
        window.removeEventListener('unhandledrejection', onRejection)
      })
  }
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(load, { timeout: 5_000 })
  else setTimeout(load, 2_000)
}
