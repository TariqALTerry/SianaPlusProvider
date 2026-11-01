import type { ExecutorAvailability, ExecutorPerformance, TechnicianDayCount } from '@/api/types'
import { nowRiyadh } from '@/lib/format'

/** PROVIDER-PLATFORM-PHASE2-PROMPT §3–§6 helpers: presentation only, the server computes every metric. */

// ── Demand (§3) ──────────────────────────────────────────────────────────────

export const DEMAND_RADII = [10, 25, 50, 100] as const
export const DEFAULT_RADIUS = 25

export function parseRadius(raw: string | number | null | undefined): number {
  const n = Number(raw)
  return (DEMAND_RADII as readonly number[]).includes(n) ? n : DEFAULT_RADIUS
}

/** Where "أضف القدرة" / "أضف التغطية" lead (ملف المنشأة, with the missing items preselected). */
export function addCapabilityHref(missingCapabilityIds: readonly string[]): string {
  const p = new URLSearchParams({ tab: 'capabilities' })
  if (missingCapabilityIds.length) p.set('add', missingCapabilityIds.join(','))
  return `/organization?${p}`
}

export function addCoverageHref(city: string, district: string | null): string {
  const p = new URLSearchParams({ tab: 'coverage', city })
  if (district) p.set('district', district)
  return `/organization?${p}`
}

// ── Team performance (§4) ────────────────────────────────────────────────────

export const PERF_PERIODS = ['7', '30', '90', 'custom'] as const
export type PerfPeriod = (typeof PERF_PERIODS)[number]

export function presetRange(days: number, now = nowRiyadh()): { from: string; to: string } {
  return { from: now.subtract(days - 1, 'day').format('YYYY-MM-DD'), to: now.format('YYYY-MM-DD') }
}

/** The period in the URL, as days. A custom period is ready once both days are chosen. */
export function resolvePeriod(state: { period: string; from: string; to: string }, now = nowRiyadh()): { period: PerfPeriod; range: { from: string; to: string }; ready: boolean } {
  const period: PerfPeriod = (PERF_PERIODS as readonly string[]).includes(state.period) ? (state.period as PerfPeriod) : '30'
  if (period !== 'custom') return { period, range: presetRange(Number(period), now), ready: true }
  return { period, range: { from: state.from, to: state.to }, ready: !!state.from && !!state.to }
}

export type Flag = 'danger' | 'attention' | null

/** §4 colouring: on-time < 80 % red, rating < 4 red, any warranty claim or timed-out job orange. */
export function perfFlags(p: Pick<ExecutorPerformance, 'onTimeRate' | 'averageRating' | 'warrantyClaims' | 'assignmentsTimedOut'>): { onTime: Flag; rating: Flag; warranty: Flag; timedOut: Flag } {
  return {
    onTime: p.onTimeRate !== null && p.onTimeRate < 0.8 ? 'danger' : null,
    rating: p.averageRating !== null && p.averageRating < 4 ? 'danger' : null,
    warranty: p.warrantyClaims > 0 ? 'attention' : null,
    timedOut: p.assignmentsTimedOut > 0 ? 'attention' : null,
  }
}

export type PerfSortKey = keyof Pick<
  ExecutorPerformance,
  'fullName' | 'completed' | 'averageRating' | 'onTimeRate' | 'acceptanceRate' | 'assignmentsTimedOut' | 'averageWorkMinutes' | 'warrantyClaims' | 'disputes' | 'cancelledAfterAssignment' | 'revenue'
>

/** Sorts with nulls ("—") always last, whichever the direction. */
export function sortPerformance(rows: readonly ExecutorPerformance[], key: PerfSortKey, dir: 'asc' | 'desc', collator = new Intl.Collator('ar')): ExecutorPerformance[] {
  const sign = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const x = a[key]
    const y = b[key]
    if (x === null && y === null) return 0
    if (x === null) return 1
    if (y === null) return -1
    if (typeof x === 'string' && typeof y === 'string') return sign * collator.compare(x, y)
    return sign * ((x as number) - (y as number))
  })
}

// ── Technician report ────────────────────────────────────────────────────────

/** The report keeps the period the performance page was showing. */
export function reportHref(executorId: string, period: PerfPeriod, range: { from: string; to: string }): string {
  const p = new URLSearchParams()
  if (period !== '30') p.set('period', period)
  if (period === 'custom') {
    p.set('from', range.from)
    p.set('to', range.to)
  }
  const query = p.toString()
  return `/team/${executorId}/report${query ? `?${query}` : ''}`
}

/** Bar heights as a share of the busiest day; a day with work never drops below a visible sliver. */
export function dailyBars(days: readonly TechnicianDayCount[]): { max: number; bars: Array<{ date: string; completed: number; height: number }> } {
  const max = days.reduce((m, d) => Math.max(m, d.completed), 0)
  return {
    max,
    bars: days.map((d) => ({ date: d.date, completed: d.completed, height: d.completed === 0 ? 0 : Math.max(4, Math.round((d.completed / max) * 100)) })),
  }
}

/** The server does not expose its filename across origins, and every report would be named the same. */
export function reportPdfName(name: string, from: string, to: string): string {
  const safe = name.replace(/[\\/:*?"<>|]+/g, ' ').trim().replace(/\s+/g, '-')
  return `technician-report${safe ? `-${safe}` : ''}-${from}-${to}.pdf`
}

// ── Team map (§6) ────────────────────────────────────────────────────────────

/** Executor badge colour by availability; a stale location is drawn faded on top of this. */
export function availabilityColor(a: ExecutorAvailability | string, offNow: boolean): string {
  if (offNow) return 'hsl(215 14% 55%)'
  switch (a) {
    case 'Available':
      return 'hsl(142 64% 36%)'
    case 'Busy':
      return 'hsl(25 90% 48%)'
    case 'OnLeave':
      return 'hsl(215 14% 55%)'
    default:
      return 'hsl(215 20% 40%)'
  }
}

export const JOB_COLORS = { late: 'hsl(0 72% 50%)', unassigned: 'hsl(280 60% 50%)', normal: 'hsl(214 80% 45%)' } as const

export function jobColor(job: { isLate: boolean; executorId: string | null }): string {
  if (job.isLate) return JOB_COLORS.late
  if (!job.executorId) return JOB_COLORS.unassigned
  return JOB_COLORS.normal
}

export function initialOf(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase()
}
