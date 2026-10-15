import { describe, expect, it } from 'vitest'
import { defaultWeek, invalidDays, toEntries, toRows } from './schedule'

describe('working hours', () => {
  it('maps the server list to a Sunday-first week and back', () => {
    const rows = toRows([{ dayOfWeek: 'Monday', start: '09:00:00', end: '18:00:00' }])
    expect(rows[0]).toEqual({ day: 'Sunday', works: false, start: '08:00', end: '17:00' })
    expect(rows[1]).toEqual({ day: 'Monday', works: true, start: '09:00', end: '18:00' })
    expect(toEntries(rows)).toEqual([{ dayOfWeek: 'Monday', start: '09:00', end: '18:00' }])
  })

  it('an empty list means no restriction: no working day', () => {
    expect(toRows([]).every((r) => !r.works)).toBe(true)
    expect(toEntries(toRows([]))).toEqual([])
  })

  it('defaults to Sunday–Thursday and flags an end before the start', () => {
    expect(toEntries(defaultWeek()).map((e) => e.dayOfWeek)).toEqual(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'])
    const rows = defaultWeek()
    rows[0] = { ...rows[0]!, start: '18:00', end: '09:00' }
    expect(invalidDays(rows)).toEqual(['Sunday'])
  })
})
