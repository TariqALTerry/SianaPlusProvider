import { describe, expect, it } from 'vitest'
import { barPercent, defectFlag, hoursToMinutes, maxOf, percentText, quantityText, revenueRows } from './counterReportLogic'

describe('counter report helpers', () => {
  it('formats 0–100 rates as percent, null as a dash', () => {
    expect(percentText(87.5, 'en')).toBe('87.5%')
    expect(percentText(100, 'en')).toBe('100%')
    expect(percentText(null, 'en')).toBe('—')
  })

  it('sizes plain bars against the largest value', () => {
    expect(barPercent(50, 200)).toBe(25)
    expect(barPercent(0, 200)).toBe(0)
    expect(barPercent(1, 10_000)).toBe(2)
    expect(barPercent(300, 200)).toBe(100)
    expect(barPercent(5, 0)).toBe(0)
    expect(maxOf([{ v: 3 }, { v: null }, { v: 9 }], (r) => r.v)).toBe(9)
  })

  it('converts hours and quantities', () => {
    expect(hoursToMinutes(1.5)).toBe(90)
    expect(hoursToMinutes(null)).toBeNull()
    expect(quantityText(2, 'en')).toBe('2')
    expect(quantityText(1.5, 'en')).toBe('1.50')
  })

  it('flags a high defect rate only with enough issued', () => {
    expect(defectFlag(20, 10)).toBe('danger')
    expect(defectFlag(20, 2)).toBeNull()
    expect(defectFlag(null, 10)).toBeNull()
    expect(defectFlag(5, 10)).toBeNull()
  })

  it('orders the revenue split', () => {
    expect(revenueRows({ parts: 1, labor: 2, fees: 3, storageFees: 4 }).map((r) => r.key)).toEqual(['parts', 'labor', 'fees', 'storageFees'])
  })
})
