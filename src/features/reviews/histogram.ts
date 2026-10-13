export interface HistogramRow {
  stars: 1 | 2 | 3 | 4 | 5
  count: number
  /** Share of all ratings, 0–1 (0 when there are none). */
  fraction: number
}

/**
 * `distribution[5]` from the summary (index 0 = 1★ … index 4 = 5★) → rows from 5★ down to 1★.
 * Missing or negative entries count as zero, so a short or malformed array never breaks the chart.
 */
export function histogramRows(distribution: readonly number[] | null | undefined): HistogramRow[] {
  const counts = [0, 1, 2, 3, 4].map((i) => {
    const n = distribution?.[i]
    return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0
  })
  const total = counts.reduce((a, b) => a + b, 0)
  return ([5, 4, 3, 2, 1] as const).map((stars) => {
    const count = counts[stars - 1]!
    return { stars, count, fraction: total > 0 ? count / total : 0 }
  })
}
