import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import 'dayjs/locale/ar'
import 'dayjs/locale/en-gb'
import { LOCALES, type Language } from '@/i18n'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)

/** Every timestamp is displayed in Riyadh time, whatever the viewer's machine says. */
export const DISPLAY_TZ = 'Asia/Riyadh'

function lang(language: string): Language {
  return language === 'en' ? 'en' : 'ar'
}

/**
 * The API returns UTC; .NET may omit the trailing `Z`, which `new Date()` would read as local
 * time. `dayjs.utc` parses a zone-less string as UTC, and honours an explicit offset.
 */
export function parseUtc(value: string | null | undefined): dayjs.Dayjs | null {
  if (!value) return null
  const d = dayjs.utc(value)
  return d.isValid() ? d : null
}

export function toRiyadh(value: string | null | undefined): dayjs.Dayjs | null {
  return parseUtc(value)?.tz(DISPLAY_TZ) ?? null
}

// ── Numbers & money ─────────────────────────────────────────────────────────

const numberFormats = new Map<string, Intl.NumberFormat>()
function nf(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`
  let f = numberFormats.get(key)
  if (!f) {
    f = new Intl.NumberFormat(locale, options)
    numberFormats.set(key, f)
  }
  return f
}

export function formatNumber(value: number | null | undefined, language: string, fractionDigits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return nf(LOCALES[lang(language)], { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(value)
}

/** SAR with exactly two decimals; the currency label follows the number in both languages. */
export function formatMoney(value: number | null | undefined, language: string, withCurrency = true): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const n = nf(LOCALES[lang(language)], { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  if (!withCurrency) return n
  return lang(language) === 'en' ? `${n} SAR` : `${n} ر.س`
}

export function formatPercent(fraction: number | null | undefined, language: string, fractionDigits = 1): string {
  if (fraction === null || fraction === undefined || Number.isNaN(fraction)) return '—'
  return nf(LOCALES[lang(language)], {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(fraction)
}

// ── Dates ───────────────────────────────────────────────────────────────────

export function formatDateTime(value: string | null | undefined, language: string): string {
  const d = toRiyadh(value)
  if (!d) return '—'
  return d.locale(lang(language) === 'en' ? 'en-gb' : 'ar').format('YYYY/MM/DD HH:mm')
}

export function formatDate(value: string | null | undefined, language: string): string {
  const d = toRiyadh(value)
  if (!d) return '—'
  return d.locale(lang(language) === 'en' ? 'en-gb' : 'ar').format('YYYY/MM/DD')
}

export function formatTime(value: string | null | undefined): string {
  return toRiyadh(value)?.format('HH:mm') ?? '—'
}

/** "قبل 12 دقيقة" / "12 minutes ago". */
export function formatRelative(value: string | null | undefined, language: string, now: dayjs.ConfigType = undefined): string {
  const d = parseUtc(value)
  if (!d) return '—'
  return d.locale(lang(language) === 'en' ? 'en-gb' : 'ar').from(now ? dayjs(now) : dayjs())
}

/** Compact duration from minutes: 45د · 3س 20د · 2ي 4س. */
export function formatDuration(minutes: number | null | undefined, language: string): string {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return '—'
  const en = lang(language) === 'en'
  const m = Math.max(0, Math.round(minutes))
  const days = Math.floor(m / 1440)
  const hours = Math.floor((m % 1440) / 60)
  const mins = m % 60
  const u = en ? { d: 'd', h: 'h', m: 'm' } : { d: 'ي', h: 'س', m: 'د' }
  if (days > 0) return hours ? `${days}${u.d} ${hours}${u.h}` : `${days}${u.d}`
  if (hours > 0) return mins ? `${hours}${u.h} ${mins}${u.m}` : `${hours}${u.h}`
  return `${mins}${u.m}`
}

export function minutesSince(value: string | null | undefined, now = dayjs()): number | null {
  const d = parseUtc(value)
  return d ? now.diff(d, 'minute') : null
}

/** A Riyadh-local `datetime-local` input value (YYYY-MM-DDTHH:mm) → ISO UTC for the API. */
export function riyadhInputToIso(local: string | null | undefined): string | null {
  if (!local) return null
  const d = dayjs.tz(local, DISPLAY_TZ)
  return d.isValid() ? d.utc().toISOString() : null
}

/** ISO UTC → value for a `datetime-local` input, in Riyadh time. */
export function isoToRiyadhInput(value: string | null | undefined): string {
  return toRiyadh(value)?.format('YYYY-MM-DDTHH:mm') ?? ''
}

/** A `date` input (YYYY-MM-DD, Riyadh day) → ISO UTC at the start (or end) of that day. */
export function riyadhDateToIso(date: string | null | undefined, edge: 'start' | 'end' = 'start'): string | null {
  if (!date) return null
  const d = dayjs.tz(date, DISPLAY_TZ)
  if (!d.isValid()) return null
  return (edge === 'start' ? d.startOf('day') : d.endOf('day')).utc().toISOString()
}

export function nowRiyadh(): dayjs.Dayjs {
  return dayjs().tz(DISPLAY_TZ)
}

export { dayjs }
