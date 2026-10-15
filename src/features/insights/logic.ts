import type { ExecutorAvailability, ExecutorPerformance } from '@/api/types'
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

export type Flag = 'danger' | 'attention' | null

/** §4 colouring: on-time < 80 % red, rating < 4 red, any warranty claim orange. */
export function perfFlags(p: Pick<ExecutorPerformance, 'onTimeRate' | 'averageRating' | 'warrantyClaims'>): { onTime: Flag; rating: Flag; warranty: Flag } {
  return {
    onTime: p.onTimeRate !== null && p.onTimeRate < 0.8 ? 'danger' : null,
    rating: p.averageRating !== null && p.averageRating < 4 ? 'danger' : null,
    warranty: p.warrantyClaims > 0 ? 'attention' : null,
  }
}

export type PerfSortKey = keyof Pick<
  ExecutorPerformance,
  'fullName' | 'completed' | 'averageRating' | 'onTimeRate' | 'acceptanceRate' | 'averageWorkMinutes' | 'warrantyClaims' | 'disputes' | 'cancelledAfterAssignment' | 'revenue'
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
