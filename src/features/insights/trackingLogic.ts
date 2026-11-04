import type { CashItem, PunctualityWeek, QualitySignal, QualityTechnicianRow } from '@/api/types'
import { dayjs, parseUtc, toRiyadh } from '@/lib/format'

/**
 * Presentation helpers of the tracking pages (دقة المواعيد, مؤشرات الجودة, النقد مع الفنيين).
 * The server computes every metric; nothing here re-derives a number it already sends.
 */

// ── Period comparison ────────────────────────────────────────────────────────

/** The same number of whole days, ending the day before `range.from`. */
export function previousRange(range: { from: string; to: string }): { from: string; to: string } {
  const from = dayjs(range.from)
  const to = dayjs(range.to)
  const days = to.diff(from, 'day') + 1
  const prevTo = from.subtract(1, 'day')
  return { from: prevTo.subtract(days - 1, 'day').format('YYYY-MM-DD'), to: prevTo.format('YYYY-MM-DD') }
}

export type Better = 'higher' | 'lower' | 'neutral'
export type DeltaTone = 'good' | 'bad' | 'neutral'

export interface Delta {
  /** current − previous, in the metric's own unit. */
  diff: number
  direction: 'up' | 'down' | 'same'
  tone: DeltaTone
}

/** Change against the previous period; null when either side has no value. Tiny float noise counts as no change. */
export function compareMetric(current: number | null | undefined, previous: number | null | undefined, better: Better): Delta | null {
  if (current === null || current === undefined || previous === null || previous === undefined) return null
  const diff = current - previous
  if (Math.abs(diff) < 1e-9) return { diff: 0, direction: 'same', tone: 'neutral' }
  const direction = diff > 0 ? 'up' : 'down'
  if (better === 'neutral') return { diff, direction, tone: 'neutral' }
  const good = (direction === 'up') === (better === 'higher')
  return { diff, direction, tone: good ? 'good' : 'bad' }
}

/** A rate change (0..1 fractions) as whole percentage points. */
export function percentagePoints(diff: number): number {
  return Math.round(Math.abs(diff) * 100)
}

// ── Sorting ──────────────────────────────────────────────────────────────────

/** Sorts by one key with nulls ("—") always last, whichever the direction. */
export function sortRows<T, K extends keyof T>(rows: readonly T[], key: K, dir: 'asc' | 'desc', collator = new Intl.Collator('ar')): T[] {
  const sign = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const x = a[key] as unknown
    const y = b[key] as unknown
    if ((x === null || x === undefined) && (y === null || y === undefined)) return 0
    if (x === null || x === undefined) return 1
    if (y === null || y === undefined) return -1
    if (typeof x === 'string' && typeof y === 'string') return sign * collator.compare(x, y)
    return sign * ((x as number) - (y as number))
  })
}

// ── Punctuality ──────────────────────────────────────────────────────────────

/**
 * The visit window as Riyadh text: the day, then `10:00–12:00` (left-to-right text; across midnight the end
 * carries its date too). A window without a start has only its end: the page reads it as "by 12:00".
 */
export function visitWindow(start: string | null, end: string): { date: string; range: string | null; end: string } {
  const e = toRiyadh(end)
  if (!e) return { date: '—', range: null, end: '—' }
  const s = toRiyadh(start)
  const date = (s ?? e).format('YYYY/MM/DD')
  if (!s) return { date, range: null, end: e.format('HH:mm') }
  const sameDay = s.format('YYYY-MM-DD') === e.format('YYYY-MM-DD')
  return { date, range: sameDay ? `${s.format('HH:mm')}–${e.format('HH:mm')}` : `${s.format('HH:mm')} – ${e.format('YYYY/MM/DD HH:mm')}`, end: e.format('HH:mm') }
}

/** The arrival time, with its date only when it differs from the window's day. */
export function arrivalText(arrivedAt: string, windowDay: string): string {
  const a = toRiyadh(arrivedAt)
  if (!a) return '—'
  return a.format('YYYY/MM/DD') === windowDay ? a.format('HH:mm') : a.format('YYYY/MM/DD HH:mm')
}

/** A week's Sunday (`yyyy-MM-dd`, already a platform day) as a short axis label: `2 Nov` / `2 نوفمبر`. */
export function weekLabel(weekStart: string, lang: string): string {
  return dayjs(weekStart).locale(lang === 'en' ? 'en-gb' : 'ar').format('D MMM')
}

export interface TrendPoint {
  index: number
  week: PunctualityWeek
  /** Centre of the week's band, 0..width, already mirrored for RTL. */
  x: number
  /** null when the week had no visits: the line breaks there. */
  y: number | null
}

/**
 * Geometry of the weekly on-time chart: one band per week, the rate on a fixed 0–100 % scale (a rate's axis
 * never auto-zooms, or a 2-point wobble looks like a collapse). Runs of weeks with visits become line segments.
 */
export function trendGeometry(
  weeks: readonly PunctualityWeek[],
  width: number,
  height: number,
  rtl: boolean,
): { band: number; points: TrendPoint[]; segments: TrendPoint[][]; yOf: (rate: number) => number } {
  const n = Math.max(weeks.length, 1)
  const band = width / n
  const yOf = (rate: number) => height - Math.min(1, Math.max(0, rate)) * height
  const points = weeks.map((week, index) => {
    const centre = band * index + band / 2
    return { index, week, x: rtl ? width - centre : centre, y: week.onTimeRate === null ? null : yOf(week.onTimeRate) }
  })
  const segments: TrendPoint[][] = []
  let run: TrendPoint[] = []
  for (const p of points) {
    if (p.y === null) {
      if (run.length) segments.push(run)
      run = []
    } else run.push(p)
  }
  if (run.length) segments.push(run)
  return { band, points, segments, yOf }
}

/** Which week labels fit under the axis: always the first and the last, then evenly spaced. */
export function axisLabelIndexes(count: number, width: number, minGap = 64): number[] {
  if (count <= 0) return []
  if (count === 1) return [0]
  const fit = Math.max(2, Math.floor(width / minGap))
  if (count <= fit) return Array.from({ length: count }, (_, i) => i)
  const step = Math.ceil((count - 1) / (fit - 1))
  const out: number[] = []
  for (let i = 0; i < count - 1; i += step) out.push(i)
  // Keep the last label clear of the one before it.
  if (out.length && count - 1 - out[out.length - 1]! < step / 2) out.pop()
  out.push(count - 1)
  return out
}

// ── Quality ──────────────────────────────────────────────────────────────────

export type QualityComponentKey = 'fast' | 'disputes' | 'quotations' | 'assignments' | 'ratings' | 'warranty'

export interface QualityComponent {
  key: QualityComponentKey
  /** Weight in the score (QualityTechnicianRow's formula). */
  weight: number
  count: number
  of: number
  /** count ÷ of, 0..1; null when there is nothing to measure against. */
  rate: number | null
  /** Points this component takes off 100. */
  points: number
}

/** The weights of the score, in the order of the formula on QualityTechnicianRow. */
export const QUALITY_WEIGHTS: Readonly<Record<QualityComponentKey, number>> = {
  fast: 0.25,
  disputes: 0.2,
  quotations: 0.15,
  assignments: 0.15,
  ratings: 0.15,
  warranty: 0.1,
}

export const QUALITY_GOOD = 80
export const QUALITY_WATCH = 60

/**
 * The six parts of a technician's score with what they cost. Denominators: fast finishes, disputes and warranty
 * claims over completed services; quotations over quotations sent; declined or unanswered over assignments
 * offered; low ratings over ratings received.
 */
export function qualityComponents(r: QualityTechnicianRow): QualityComponent[] {
  const part = (key: QualityComponentKey, count: number, of: number): QualityComponent => {
    const rate = of > 0 ? Math.min(1, count / of) : null
    return { key, weight: QUALITY_WEIGHTS[key], count, of, rate, points: rate === null ? 0 : 100 * QUALITY_WEIGHTS[key] * rate }
  }
  return [
    part('fast', r.fastCompletions, r.completed),
    part('disputes', r.disputes, r.completed),
    part('quotations', r.quotationsRejected, r.quotationsSent),
    part('assignments', r.assignmentsDeclined + r.assignmentsTimedOut, r.assignmentsOffered),
    part('ratings', r.lowRatings, r.ratingsCount),
    part('warranty', r.warrantyClaims, r.completed),
  ]
}

/** The component that cost the most points (the reason a score is low), or null when none cost anything. */
export function mainReason(components: readonly QualityComponent[]): QualityComponent | null {
  let top: QualityComponent | null = null
  for (const c of components) if (c.points >= 0.5 && (!top || c.points > top.points)) top = c
  return top
}

/** What a signal measured, by kind: minutes worked against the expected minimum, the rating, or the quote's total. */
export type SignalMeasure =
  | { type: 'fast'; minutes: number; limit: number | null }
  | { type: 'rating'; rating: number }
  | { type: 'quote'; amount: number }
  | null

export function signalMeasure(s: Pick<QualitySignal, 'kind' | 'value' | 'limit'>): SignalMeasure {
  if (s.value === null || s.value === undefined) return null
  switch (s.kind) {
    case 'FastCompletion':
      return { type: 'fast', minutes: s.value, limit: s.limit ?? null }
    case 'LowRating':
      return { type: 'rating', rating: s.value }
    case 'QuotationRejected':
      return { type: 'quote', amount: s.value }
    default:
      return null
  }
}

// ── Cash ─────────────────────────────────────────────────────────────────────

/** The server takes at most this many services per handover (`CashHandoverTooMany`). */
export const MAX_HANDOVER = 200

export const CASH_DAYS_ATTENTION = 3
export const CASH_DAYS_DANGER = 7

/** Cash held this many whole days is a reminder (≥ 3) or overdue (≥ 7). */
export function daysHeldFlag(days: number): 'danger' | 'attention' | null {
  if (days >= CASH_DAYS_DANGER) return 'danger'
  if (days >= CASH_DAYS_ATTENTION) return 'attention'
  return null
}

/** Sum of the selected items, added in halalas so 0.1 + 0.2 stays 0.30. Ids no longer listed don't count. */
export function selectionTotal(items: readonly Pick<CashItem, 'serviceItemId' | 'amount'>[], selected: ReadonlySet<string>): { count: number; amount: number } {
  let count = 0
  let halalas = 0
  for (const item of items) {
    if (!selected.has(item.serviceItemId)) continue
    count++
    halalas += Math.round(item.amount * 100)
  }
  return { count, amount: halalas / 100 }
}

/** The selection, keeping only ids still in the list (after a refresh some may have been handed over). */
export function pruneSelection(selected: ReadonlySet<string>, items: readonly Pick<CashItem, 'serviceItemId'>[]): Set<string> {
  const listed = new Set(items.map((i) => i.serviceItemId))
  return new Set([...selected].filter((id) => listed.has(id)))
}

/** The "select all" box: checked, partly checked, or not. */
export function selectAllState(items: readonly Pick<CashItem, 'serviceItemId'>[], selected: ReadonlySet<string>): boolean | 'indeterminate' {
  if (!items.length) return false
  const n = items.reduce((c, i) => c + (selected.has(i.serviceItemId) ? 1 : 0), 0)
  if (n === 0) return false
  return n === items.length ? true : 'indeterminate'
}

/** Whole days since a collection (24-hour periods, as the server counts `DaysHeld`). */
export function wholeDaysSince(value: string, now: dayjs.ConfigType = undefined): number {
  const d = parseUtc(value)
  if (!d) return 0
  return Math.max(0, Math.floor(dayjs(now).diff(d, 'hour') / 24))
}
