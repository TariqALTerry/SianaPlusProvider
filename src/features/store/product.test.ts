import { describe, expect, it } from 'vitest'
import { checkStockDelta, insufficientStockAvailable } from './product'

describe('stock movement', () => {
  it('needs a non-zero whole number that keeps stock at zero or more', () => {
    expect(checkStockDelta('', 4)).toEqual({ ok: false, reason: 'empty', next: 4 })
    expect(checkStockDelta('0', 4)).toEqual({ ok: false, reason: 'invalid', next: 4 })
    expect(checkStockDelta('1.5', 4)).toEqual({ ok: false, reason: 'invalid', next: 4 })
    expect(checkStockDelta('-5', 4)).toEqual({ ok: false, reason: 'negative', next: -1 })
    expect(checkStockDelta('-4', 4)).toEqual({ ok: true, delta: -4, next: 0 })
    expect(checkStockDelta(' +10 ', 4)).toEqual({ ok: true, delta: 10, next: 14 })
  })

  it('reads `available` from InsufficientStock data', () => {
    expect(insufficientStockAvailable({ productId: 'p', available: 3 })).toBe(3)
    expect(insufficientStockAvailable(undefined)).toBeNull()
    expect(insufficientStockAvailable({ available: 'x' })).toBeNull()
  })
})
