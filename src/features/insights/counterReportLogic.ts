import { formatNumber } from '@/lib/format'

/**
 * Pure helpers of the counter report (`/insights/counter`). The report's rates are already percentages (0–100, one
 * decimal), unlike the fractions of the other insights pages.
 */

/** "87.5%" from a 0–100 value; null → "—". */
export function percentText(value: number | null | undefined, language: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${formatNumber(value, language, Number.isInteger(value) ? 0 : 1)}%`
}

/** The width of a plain bar against the largest value, 0–100. A non-zero value always shows a sliver. */
export function barPercent(value: number | null | undefined, max: number): number {
  if (!value || value <= 0 || !max || max <= 0) return 0
  return Math.max(2, Math.min(100, (value / max) * 100))
}

export function maxOf<T>(rows: readonly T[], pick: (row: T) => number | null | undefined): number {
  return rows.reduce((m, r) => Math.max(m, pick(r) ?? 0), 0)
}

/** Hours (decimal) → minutes for `<Duration />`; null stays null. */
export function hoursToMinutes(hours: number | null | undefined): number | null {
  return hours === null || hours === undefined ? null : Math.round(hours * 60)
}

/** Quantities are decimals with two places (a part sold by the metre): no trailing zeros. */
export function quantityText(value: number | null | undefined, language: string): string {
  if (value === null || value === undefined) return '—'
  return formatNumber(value, language, Number.isInteger(value) ? 0 : 2)
}

/** A defect rate this high (with at least a few issued) is worth a warning colour. */
export const DEFECT_WARN_RATE = 10
export const DEFECT_MIN_ISSUED = 3

export function defectFlag(rate: number | null, issued: number): 'danger' | null {
  return rate !== null && issued >= DEFECT_MIN_ISSUED && rate >= DEFECT_WARN_RATE ? 'danger' : null
}

/** The revenue split as rows for bars, in a fixed order, total last. */
export function revenueRows(r: { parts: number; labor: number; fees: number; storageFees: number }): Array<{ key: 'parts' | 'labor' | 'fees' | 'storageFees'; value: number }> {
  return (['parts', 'labor', 'fees', 'storageFees'] as const).map((key) => ({ key, value: r[key] }))
}
