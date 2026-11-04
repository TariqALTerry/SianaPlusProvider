import { describe, expect, it } from 'vitest'
import type { PunctualityWeek, QualityTechnicianRow } from '@/api/types'
import { dayjs } from '@/lib/format'
import {
  arrivalText,
  axisLabelIndexes,
  compareMetric,
  daysHeldFlag,
  mainReason,
  MAX_HANDOVER,
  percentagePoints,
  previousRange,
  pruneSelection,
  qualityComponents,
  selectAllState,
  selectionTotal,
  signalMeasure,
  sortRows,
  trendGeometry,
  visitWindow,
  weekLabel,
  wholeDaysSince,
} from './trackingLogic'

describe('previous period', () => {
  it('has the same number of days and ends the day before', () => {
    expect(previousRange({ from: '2026-10-06', to: '2026-11-04' })).toEqual({ from: '2026-09-06', to: '2026-10-05' })
    expect(previousRange({ from: '2026-11-04', to: '2026-11-04' })).toEqual({ from: '2026-11-03', to: '2026-11-03' })
    // Across a month end and a leap day.
    expect(previousRange({ from: '2028-03-01', to: '2028-03-07' })).toEqual({ from: '2028-02-23', to: '2028-02-29' })
  })
})

describe('change against the previous period', () => {
  it('colours by whether the direction is good', () => {
    expect(compareMetric(0.9, 0.8, 'higher')).toMatchObject({ direction: 'up', tone: 'good' })
    expect(compareMetric(0.7, 0.8, 'higher')).toMatchObject({ direction: 'down', tone: 'bad' })
    // Lower lateness is better.
    expect(compareMetric(12, 20, 'lower')).toMatchObject({ diff: -8, direction: 'down', tone: 'good' })
    expect(compareMetric(25, 20, 'lower')).toMatchObject({ diff: 5, direction: 'up', tone: 'bad' })
    expect(compareMetric(3, 1, 'neutral')).toMatchObject({ direction: 'up', tone: 'neutral' })
  })

  it('has nothing to say without both values, and ignores float noise', () => {
    expect(compareMetric(null, 0.8, 'higher')).toBeNull()
    expect(compareMetric(0.8, null, 'higher')).toBeNull()
    expect(compareMetric(0.1 + 0.2, 0.3, 'higher')).toEqual({ diff: 0, direction: 'same', tone: 'neutral' })
  })

  it('shows rate changes as whole percentage points', () => {
    expect(percentagePoints(0.9 - 0.82)).toBe(8)
    expect(percentagePoints(-0.034)).toBe(3)
  })
})

describe('sorting', () => {
  const rows = [
    { id: 'a', rate: 0.9, name: 'سالم' },
    { id: 'b', rate: null, name: 'أحمد' },
    { id: 'c', rate: 0.5, name: 'خالد' },
  ]
  it('keeps nulls last in both directions', () => {
    expect(sortRows(rows, 'rate', 'asc').map((r) => r.id)).toEqual(['c', 'a', 'b'])
    expect(sortRows(rows, 'rate', 'desc').map((r) => r.id)).toEqual(['a', 'c', 'b'])
  })
  it('sorts names with the collator', () => {
    expect(sortRows(rows, 'name', 'asc').map((r) => r.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('visit window', () => {
  it('reads in Riyadh time, one day', () => {
    expect(visitWindow('2026-11-02T07:00:00Z', '2026-11-02T09:00:00Z')).toEqual({ date: '2026/11/02', range: '10:00–12:00', end: '12:00' })
  })
  it('carries the end date across midnight', () => {
    expect(visitWindow('2026-11-02T19:00:00Z', '2026-11-02T22:00:00Z')).toEqual({ date: '2026/11/02', range: '22:00 – 2026/11/03 01:00', end: '01:00' })
  })
  it('has only an end without a start', () => {
    expect(visitWindow(null, '2026-11-02T09:00:00Z')).toEqual({ date: '2026/11/02', range: null, end: '12:00' })
  })
  it('dates the arrival only when it is another day', () => {
    expect(arrivalText('2026-11-02T09:40:00Z', '2026/11/02')).toBe('12:40')
    expect(arrivalText('2026-11-02T21:10:00Z', '2026/11/02')).toBe('2026/11/03 00:10')
  })
})

describe('weekly trend', () => {
  const week = (weekStart: string, onTimeRate: number | null, visits = 4): PunctualityWeek => ({
    weekStart,
    visits: onTimeRate === null ? 0 : visits,
    onTime: 0,
    late: 0,
    early: 0,
    onTimeRate,
    averageLateMinutes: null,
    p90LateMinutes: null,
  })

  it('places weeks in bands on a fixed 0–100 % scale and breaks the line at empty weeks', () => {
    const weeks = [week('2026-10-04', 1), week('2026-10-11', 0.5), week('2026-10-18', null), week('2026-10-25', 0)]
    const g = trendGeometry(weeks, 400, 100, false)
    expect(g.band).toBe(100)
    expect(g.points.map((p) => p.x)).toEqual([50, 150, 250, 350])
    expect(g.points.map((p) => p.y)).toEqual([0, 50, null, 100])
    expect(g.segments.map((s) => s.map((p) => p.index))).toEqual([[0, 1], [3]])
  })

  it('mirrors time for right-to-left', () => {
    const g = trendGeometry([week('2026-10-04', 1), week('2026-10-11', 1)], 200, 100, true)
    expect(g.points.map((p) => p.x)).toEqual([150, 50])
  })

  it('keeps the first and last axis labels and thins the rest to fit', () => {
    expect(axisLabelIndexes(0, 300)).toEqual([])
    expect(axisLabelIndexes(1, 300)).toEqual([0])
    expect(axisLabelIndexes(5, 400)).toEqual([0, 1, 2, 3, 4])
    const many = axisLabelIndexes(53, 320)
    expect(many[0]).toBe(0)
    expect(many[many.length - 1]).toBe(52)
    expect(many.length).toBeLessThanOrEqual(5)
  })

  it('labels a week by its Sunday', () => {
    expect(weekLabel('2026-11-01', 'en')).toBe('1 Nov')
  })
})

describe('quality score parts', () => {
  const row = (over: Partial<QualityTechnicianRow>): QualityTechnicianRow => ({
    executorId: 'e',
    fullName: 'فني',
    providerOrganizationId: 'p',
    providerName: 'منشأة',
    completed: 0,
    fastCompletions: 0,
    quotationsSent: 0,
    quotationsRejected: 0,
    assignmentsOffered: 0,
    assignmentsDeclined: 0,
    assignmentsTimedOut: 0,
    disputes: 0,
    ratingsCount: 0,
    lowRatings: 0,
    averageRating: null,
    warrantyClaims: 0,
    score: null,
    grade: 'InsufficientData',
    ...over,
  })

  it('weighs each rate as the formula says and adds up to 100 − score', () => {
    const parts = qualityComponents(
      row({ completed: 10, fastCompletions: 2, disputes: 1, quotationsSent: 4, quotationsRejected: 2, assignmentsOffered: 12, assignmentsDeclined: 2, assignmentsTimedOut: 1, ratingsCount: 5, lowRatings: 1, warrantyClaims: 1 }),
    )
    const points = Object.fromEntries(parts.map((p) => [p.key, Math.round(p.points * 100) / 100]))
    expect(points).toEqual({ fast: 5, disputes: 2, quotations: 7.5, assignments: 3.75, ratings: 3, warranty: 1 })
    expect(parts.find((p) => p.key === 'assignments')).toMatchObject({ count: 3, of: 12 })
    expect(100 - parts.reduce((s, p) => s + p.points, 0)).toBeCloseTo(77.75)
  })

  it('costs nothing where there is nothing to measure', () => {
    const parts = qualityComponents(row({ completed: 5 }))
    expect(parts.every((p) => p.points === 0)).toBe(true)
    expect(parts.find((p) => p.key === 'quotations')).toMatchObject({ rate: null, of: 0 })
    expect(mainReason(parts)).toBeNull()
  })

  it('names the part that cost the most', () => {
    const parts = qualityComponents(row({ completed: 10, fastCompletions: 1, quotationsSent: 2, quotationsRejected: 2 }))
    expect(mainReason(parts)?.key).toBe('quotations')
  })
})

describe('signal measures', () => {
  it('reads value and limit by kind', () => {
    expect(signalMeasure({ kind: 'FastCompletion', value: 12, limit: 45 })).toEqual({ type: 'fast', minutes: 12, limit: 45 })
    expect(signalMeasure({ kind: 'LowRating', value: 2, limit: null })).toEqual({ type: 'rating', rating: 2 })
    expect(signalMeasure({ kind: 'QuotationRejected', value: 350.5, limit: null })).toEqual({ type: 'quote', amount: 350.5 })
    expect(signalMeasure({ kind: 'Dispute', value: 3, limit: null })).toBeNull()
    expect(signalMeasure({ kind: 'FastCompletion', value: null, limit: 45 })).toBeNull()
  })
})

describe('cash', () => {
  it('flags cash held 3 days for attention and 7 for danger', () => {
    expect(daysHeldFlag(0)).toBeNull()
    expect(daysHeldFlag(2)).toBeNull()
    expect(daysHeldFlag(3)).toBe('attention')
    expect(daysHeldFlag(6)).toBe('attention')
    expect(daysHeldFlag(7)).toBe('danger')
  })

  const items = [
    { serviceItemId: 'a', amount: 0.1 },
    { serviceItemId: 'b', amount: 0.2 },
    { serviceItemId: 'c', amount: 150.35 },
  ]

  it('totals the selection in halalas', () => {
    expect(selectionTotal(items, new Set(['a', 'b']))).toEqual({ count: 2, amount: 0.3 })
    expect(selectionTotal(items, new Set(['a', 'b', 'c']))).toEqual({ count: 3, amount: 150.65 })
    expect(selectionTotal(items, new Set())).toEqual({ count: 0, amount: 0 })
    // An id no longer listed (handed over meanwhile) doesn't count.
    expect(selectionTotal(items, new Set(['c', 'gone']))).toEqual({ count: 1, amount: 150.35 })
  })

  it('drops ids that left the list after a refresh', () => {
    expect([...pruneSelection(new Set(['a', 'gone']), items)]).toEqual(['a'])
  })

  it('reads the select-all box', () => {
    expect(selectAllState(items, new Set())).toBe(false)
    expect(selectAllState(items, new Set(['a']))).toBe('indeterminate')
    expect(selectAllState(items, new Set(['a', 'b', 'c']))).toBe(true)
    expect(selectAllState([], new Set(['a']))).toBe(false)
  })

  it('counts whole days held', () => {
    const now = dayjs.utc('2026-11-04T12:00:00Z')
    expect(wholeDaysSince('2026-11-04T08:00:00Z', now)).toBe(0)
    expect(wholeDaysSince('2026-11-03T12:00:00Z', now)).toBe(1)
    expect(wholeDaysSince('2026-10-28T13:00:00Z', now)).toBe(6)
    expect(wholeDaysSince('2026-11-05T12:00:00Z', now)).toBe(0)
  })

  it('caps a handover at the server limit', () => {
    expect(MAX_HANDOVER).toBe(200)
  })
})
