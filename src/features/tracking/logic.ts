import type { DayOfWeek, PublicTrackingHoursResponse, RepairOutcome, TrackingStage } from '@/api/types'

/**
 * Pure helpers of the public tracking page `/t/{token}` (PROVIDER-BRANCHES-PROVIDER-PLATFORM-PROMPT phase 4 §6).
 */

/** The token is base64url, up to 64 characters: anything else is "not found" without asking the server. */
export function isTokenShaped(token: string | undefined): token is string {
  return !!token && token.length <= 64 && /^[A-Za-z0-9_-]+$/.test(token)
}

// ── The stage bar ────────────────────────────────────────────────────────────

/** The happy path, in order. `NotRepairable` and `Cancelled` are drawn differently. */
export const TRACKING_STEPS = ['Received', 'Diagnosing', 'AwaitingApproval', 'InRepair', 'Ready', 'Delivered'] as const
export type TrackingStepKey = (typeof TRACKING_STEPS)[number] | 'NotRepairable'
export type StepState = 'done' | 'current' | 'todo'

export type Stepper = { kind: 'cancelled' } | { kind: 'steps'; steps: Array<{ key: TrackingStepKey; state: StepState }> }

/** A delivered device that was not repaired keeps the "not repairable" step instead of repair and ready. */
const NOT_REPAIRED: ReadonlySet<RepairOutcome> = new Set(['NotRepairable', 'QuoteRejected'])

/**
 * The bar: the current stage and every one before it shaded. `NotRepairable` replaces InRepair and Ready with one step
 * ("تعذّر الإصلاح، الجهاز جاهز للاستلام"); `Cancelled` is a grey bar only.
 */
export function stepper(stage: TrackingStage, repairOutcome?: RepairOutcome | null): Stepper {
  if (stage === 'Cancelled') return { kind: 'cancelled' }
  const notRepaired = stage === 'NotRepairable' || (stage === 'Delivered' && !!repairOutcome && NOT_REPAIRED.has(repairOutcome))
  const keys: TrackingStepKey[] = notRepaired ? ['Received', 'Diagnosing', 'AwaitingApproval', 'NotRepairable', 'Delivered'] : [...TRACKING_STEPS]
  const current = keys.indexOf(stage as TrackingStepKey)
  return {
    kind: 'steps',
    steps: keys.map((key, i) => ({
      key,
      // Delivered is the end: everything is done.
      state: stage === 'Delivered' || i < current ? 'done' : i === current ? 'current' : 'todo',
    })),
  }
}

/** "جاهز للاستلام" block: ready, or ready without repair. */
export function isReadyStage(stage: TrackingStage): boolean {
  return stage === 'Ready' || stage === 'NotRepairable'
}

// ── Branch contacts ──────────────────────────────────────────────────────────

/**
 * Digits for `https://wa.me/<digits>`: international, no `+` or `00`. A Saudi local mobile (`05…`) gets 966.
 * Null when nothing usable is left.
 */
export function waDigits(phone: string | null | undefined): string | null {
  if (!phone) return null
  let d = phone.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (/^05\d{8}$/.test(d)) d = `966${d.slice(1)}`
  else if (/^5\d{8}$/.test(d)) d = `966${d}`
  return d.length >= 8 ? d : null
}

export function waHref(phone: string | null | undefined): string | null {
  const d = waDigits(phone)
  return d ? `https://wa.me/${d}` : null
}

export function telHref(phone: string | null | undefined): string | null {
  const p = phone?.replace(/[^\d+]/g, '')
  return p ? `tel:${p}` : null
}

/** Opening hours with Saturday first (the server already sends them so; kept stable if it ever does not). */
const WEEK_FROM_SATURDAY: readonly DayOfWeek[] = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export function saturdayFirst<T extends Pick<PublicTrackingHoursResponse, 'dayOfWeek'>>(days: readonly T[]): T[] {
  return [...days].sort((a, b) => WEEK_FROM_SATURDAY.indexOf(a.dayOfWeek) - WEEK_FROM_SATURDAY.indexOf(b.dayOfWeek))
}

/** dayjs `.day()` (0 = Sunday) → the enum value. */
export function dayOfWeekFromIndex(index: number): DayOfWeek {
  const days: readonly DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[((index % 7) + 7) % 7]!
}

// ── The one-time code ────────────────────────────────────────────────────────

/** Whole seconds left until `iso` (never negative); 0 when missing or past. */
export function secondsUntil(iso: string | null | undefined, now: number = Date.now()): number {
  if (!iso) return 0
  const at = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`)
  if (!Number.isFinite(at)) return 0
  return Math.max(0, Math.ceil((at - now) / 1000))
}

/** `m:ss` for the resend countdown. */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export const REJECT_REASON_MAX = 500

// ── Errors ───────────────────────────────────────────────────────────────────

export type PageFailure = 'notFound' | 'rateLimited' | 'other'

/** The page itself could not load: a bad or expired link says only that; 429 asks to wait. */
export function pageFailure(error: { status: number; errorCode: string | null }): PageFailure {
  if (error.errorCode === 'TrackingNotFound' || error.status === 404) return 'notFound'
  if (error.errorCode === 'TooManyRequests' || error.status === 429) return 'rateLimited'
  return 'other'
}

/** Code and decision errors the page explains in its own words; others show the server's message. */
export const OWN_WORDS_ERRORS = ['OtpInvalid', 'OtpExpired', 'OtpAttemptsExceeded', 'OtpResendTooSoon', 'WhatsAppCustomerPhoneMissing', 'TooManyRequests', 'QuotationNotPending'] as const
export type OwnWordsError = (typeof OWN_WORDS_ERRORS)[number]

export function ownWordsError(code: string | null | undefined): OwnWordsError | null {
  return (OWN_WORDS_ERRORS as readonly string[]).includes(code ?? '') ? (code as OwnWordsError) : null
}

/** After these the old code is dead: the customer must ask for a new one. */
export function needsNewCode(code: string | null | undefined): boolean {
  return code === 'OtpExpired' || code === 'OtpAttemptsExceeded'
}
