import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'
import {
  formatDateTime,
  formatDuration,
  formatMoney,
  formatPercent,
  isoToRiyadhInput,
  parseUtc,
  riyadhDateToIso,
  riyadhInputToIso,
} from './format'
import { isDeletedAccount, maskPhone } from './phone'
import { fromPercent, toPercent } from './utils'

describe('money', () => {
  it('always shows two decimals with the currency', () => {
    expect(formatMoney(1234.5, 'en')).toBe('1,234.50 SAR')
    expect(formatMoney(1234.5, 'ar')).toBe('1,234.50 ر.س')
    expect(formatMoney(0, 'en')).toBe('0.00 SAR')
    expect(formatMoney(null, 'en')).toBe('—')
  })

  it('formats fractions as percentages', () => {
    expect(formatPercent(0.15, 'en')).toBe('15%')
  })

  it('converts commission percentages both ways', () => {
    expect(fromPercent(15)).toBe(0.15)
    expect(toPercent(0.155)).toBe(15.5)
    expect(fromPercent(null)).toBeNull()
  })
})

describe('dates (UTC in, Asia/Riyadh out)', () => {
  it('reads zone-less .NET timestamps as UTC', () => {
    expect(parseUtc('2026-01-01T21:30:00')?.toISOString()).toBe('2026-01-01T21:30:00.000Z')
  })

  it('displays in Riyadh time (+03:00) regardless of the machine zone', () => {
    expect(formatDateTime('2026-01-01T21:30:00Z', 'en')).toBe('2026/01/02 00:30')
  })

  it('round-trips datetime-local inputs through Riyadh time', () => {
    expect(riyadhInputToIso('2026-03-10T09:00')).toBe('2026-03-10T06:00:00.000Z')
    expect(isoToRiyadhInput('2026-03-10T06:00:00Z')).toBe('2026-03-10T09:00')
  })

  it('turns a Riyadh day into an inclusive UTC range', () => {
    expect(riyadhDateToIso('2026-03-10', 'start')).toBe('2026-03-09T21:00:00.000Z')
    expect(riyadhDateToIso('2026-03-10', 'end')).toBe('2026-03-10T20:59:59.999Z')
  })

  it('formats compact durations', () => {
    expect(formatDuration(45, 'en')).toBe('45m')
    expect(formatDuration(200, 'en')).toBe('3h 20m')
    expect(formatDuration(2 * 1440 + 240, 'en')).toBe('2d 4h')
  })
})

describe('personal data', () => {
  it('masks phone numbers', () => {
    expect(maskPhone('0501231571')).toBe('05X XXX 1571')
    expect(maskPhone('+966501231571')).toBe('+966 5X XXX 1571')
  })

  it('recognizes deleted accounts', () => {
    expect(isDeletedAccount('deleted-3f2a', null)).toBe(true)
    expect(isDeletedAccount('deleted-3f2a', '0501231571')).toBe(false)
    expect(isDeletedAccount('0501231571', null)).toBe(false)
  })
})

describe('csv', () => {
  it('escapes quotes, commas and formula injection', () => {
    const csv = toCsv([{ a: 'x,"y"', b: '=SUM(A1)' }], [
      { header: 'A', value: (r) => r.a },
      { header: 'B', value: (r) => r.b },
    ])
    expect(csv).toBe('A,B\r\n"x,""y""",\'=SUM(A1)')
  })
})
