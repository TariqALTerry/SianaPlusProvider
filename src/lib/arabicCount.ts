/**
 * Arabic number agreement for counted units ("منذ دقيقتين"، "خلال 7 أيام"، "منذ 12 يومًا").
 *
 * The forms follow CLDR's Arabic plural categories (the same ones `Intl.PluralRules('ar')` and i18next use):
 * - 1 → the noun alone ("دقيقة"، "يوم")
 * - 2 → the dual without the number ("دقيقتين"، or "دقيقتان" with `case: 'nominative'`)
 * - n % 100 in 3–10 → plural ("3 دقائق"، "7 أيام")
 * - n % 100 in 11–99 → singular accusative ("22 دقيقة"، "25 يومًا"، "12 شهرًا")
 * - 0, 100, 101, 102, 200… and fractions → singular ("100 يوم"، "1.5 ساعة")
 *
 * The genitive dual (‑ين) is the default because almost every use follows a preposition (منذ، خلال، بعد، قبل) or a
 * noun ("ضمان يومين"). Latin digits, as everywhere else in the panel.
 *
 * In translations use the i18next formatters registered in `@/i18n`: `'ينتهي خلال {{count, days}}'`,
 * `'بقي {{count, days(case: nominative)}}'`.
 */

export type CountUnit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'
export type ArabicCase = 'genitive' | 'nominative'

interface Forms {
  one: string
  two: string
  twoNom: string
  few: string
  many: string
}

const AR: Record<CountUnit, Forms> = {
  second: { one: 'ثانية', two: 'ثانيتين', twoNom: 'ثانيتان', few: 'ثوانٍ', many: 'ثانية' },
  minute: { one: 'دقيقة', two: 'دقيقتين', twoNom: 'دقيقتان', few: 'دقائق', many: 'دقيقة' },
  hour: { one: 'ساعة', two: 'ساعتين', twoNom: 'ساعتان', few: 'ساعات', many: 'ساعة' },
  day: { one: 'يوم', two: 'يومين', twoNom: 'يومان', few: 'أيام', many: 'يومًا' },
  week: { one: 'أسبوع', two: 'أسبوعين', twoNom: 'أسبوعان', few: 'أسابيع', many: 'أسبوعًا' },
  month: { one: 'شهر', two: 'شهرين', twoNom: 'شهران', few: 'أشهر', many: 'شهرًا' },
  year: { one: 'سنة', two: 'سنتين', twoNom: 'سنتان', few: 'سنوات', many: 'سنة' },
}

const EN: Record<CountUnit, [string, string]> = {
  second: ['second', 'seconds'],
  minute: ['minute', 'minutes'],
  hour: ['hour', 'hours'],
  day: ['day', 'days'],
  week: ['week', 'weeks'],
  month: ['month', 'months'],
  year: ['year', 'years'],
}

/** "12" / "1,234" / 12 → 12; anything else → null. */
function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const s = value.trim().replace(/[,،\s]/g, '')
    if (!/^-?\d+(\.\d+)?$/.test(s)) return null
    return Number(s)
  }
  return null
}

/** `n` units in Arabic with the right agreement: `countAr(2, 'minute')` → "دقيقتين", `countAr(25, 'day')` → "25 يومًا". */
export function countAr(value: number, unit: CountUnit, options: { case?: ArabicCase } = {}): string {
  const f = AR[unit]
  const n = Math.abs(value)
  const shown = String(value)
  if (!Number.isInteger(n)) return `${shown} ${f.one}`
  if (n === 1) return f.one
  if (n === 2) return options.case === 'nominative' ? f.twoNom : f.two
  const rest = n % 100
  if (rest >= 3 && rest <= 10) return `${shown} ${f.few}`
  if (rest >= 11 && rest <= 99) return `${shown} ${f.many}`
  return `${shown} ${f.one}`
}

/** `n` units in the UI language. A value that is not a number comes back as it is. */
export function formatCount(value: unknown, unit: CountUnit, language: string, options: { case?: ArabicCase } = {}): string {
  const n = toNumber(value)
  if (n === null) return value === null || value === undefined ? '—' : String(value)
  if (language === 'en') return `${n} ${Math.abs(n) === 1 ? EN[unit][0] : EN[unit][1]}`
  return countAr(n, unit, options)
}

/**
 * Relative time in Arabic from a signed difference in milliseconds (positive = in the past): "منذ دقيقتين"،
 * "منذ 22 دقيقة"، "بعد 3 أيام". The rounding thresholds are dayjs's, so the switch from minutes to hours, days, months
 * and years lands where the English text switches.
 */
export function relativeAr(diffMs: number): string {
  const past = diffMs >= 0
  const seconds = Math.abs(diffMs) / 1000
  const minutes = seconds / 60
  const hours = minutes / 60
  const days = hours / 24
  let text: string
  if (seconds < 45) text = 'لحظات'
  else if (seconds < 90) text = countAr(1, 'minute')
  else if (minutes < 45) text = countAr(Math.round(minutes), 'minute')
  else if (minutes < 90) text = countAr(1, 'hour')
  else if (hours < 22) text = countAr(Math.round(hours), 'hour')
  else if (hours < 36) text = countAr(1, 'day')
  else if (days < 26) text = countAr(Math.round(days), 'day')
  else if (days < 46) text = countAr(1, 'month')
  else if (days < 320) text = countAr(Math.max(2, Math.round(days / 30.4)), 'month')
  else if (days < 548) text = countAr(1, 'year')
  else text = countAr(Math.max(2, Math.round(days / 365)), 'year')
  return past ? `منذ ${text}` : `بعد ${text}`
}

/** i18next formatter names → unit, registered in `@/i18n` (`{{count, days}}`). */
export const COUNT_FORMATTERS: Record<string, CountUnit> = {
  seconds: 'second',
  minutes: 'minute',
  hours: 'hour',
  days: 'day',
  weeks: 'week',
  months: 'month',
  years: 'year',
}
