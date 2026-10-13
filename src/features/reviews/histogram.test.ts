import { describe, expect, it } from 'vitest'
import { histogramRows } from './histogram'

describe('rating histogram', () => {
  it('orders 5★ to 1★ with shares of the total', () => {
    // distribution[0] = 1★ … distribution[4] = 5★
    const rows = histogramRows([1, 0, 1, 2, 6])
    expect(rows.map((r) => r.stars)).toEqual([5, 4, 3, 2, 1])
    expect(rows.map((r) => r.count)).toEqual([6, 2, 1, 0, 1])
    expect(rows.map((r) => r.fraction)).toEqual([0.6, 0.2, 0.1, 0, 0.1])
    expect(rows.reduce((a, r) => a + r.fraction, 0)).toBeCloseTo(1)
  })

  it('gives zero shares when there are no ratings', () => {
    expect(histogramRows([0, 0, 0, 0, 0]).every((r) => r.fraction === 0)).toBe(true)
    expect(histogramRows(null).map((r) => r.count)).toEqual([0, 0, 0, 0, 0])
  })

  it('treats missing or invalid entries as zero', () => {
    const rows = histogramRows([2, -1, Number.NaN])
    expect(rows.find((r) => r.stars === 1)).toEqual({ stars: 1, count: 2, fraction: 1 })
    expect(rows.filter((r) => r.stars !== 1).every((r) => r.count === 0)).toBe(true)
  })
})
