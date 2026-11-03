import { describe, expect, it } from 'vitest'
import type { ExecutorPerformance } from '@/api/types'
import { dayjs } from '@/lib/format'
import {
  addCapabilityHref,
  addCoverageHref,
  dailyBars,
  initialOf,
  jobColor,
  JOB_COLORS,
  parseRadius,
  perfFlags,
  presetRange,
  reportHref,
  reportPdfName,
  resolvePeriod,
  sortPerformance,
} from './logic'

const row = (over: Partial<ExecutorPerformance>): ExecutorPerformance => ({
  executorId: 'e',
  fullName: 'فني',
  isActive: true,
  completed: 0,
  averageRating: null,
  ratingsCount: 0,
  onTimeRate: null,
  scheduledArrivals: 0,
  acceptanceRate: null,
  assignmentsOffered: 0,
  assignmentsRejected: 0,
  assignmentsTimedOut: 0,
  quotationsSent: 0,
  quotationsRejected: 0,
  quotationRejectionRate: null,
  averageWorkMinutes: null,
  warrantyClaims: 0,
  disputes: 0,
  cancelledAfterAssignment: 0,
  revenue: 0,
  ...over,
})

describe('demand helpers', () => {
  it('keeps the radius to the offered steps', () => {
    expect(parseRadius('50')).toBe(50)
    expect(parseRadius('33')).toBe(25)
    expect(parseRadius(null)).toBe(25)
  })

  it('links to the capabilities and coverage tabs with what is missing', () => {
    expect(addCapabilityHref(['a', 'b'])).toBe('/organization?tab=capabilities&add=a%2Cb')
    expect(addCoverageHref('الرياض', 'النرجس')).toBe(`/organization?tab=coverage&city=${encodeURIComponent('الرياض')}&district=${encodeURIComponent('النرجس')}`)
    expect(addCoverageHref('جدة', null)).toBe(`/organization?tab=coverage&city=${encodeURIComponent('جدة')}`)
  })
})

describe('performance', () => {
  it('flags late arrivals, low ratings and warranty claims', () => {
    expect(perfFlags(row({ onTimeRate: 0.79, averageRating: 3.9, warrantyClaims: 1, assignmentsTimedOut: 1 }))).toEqual({
      onTime: 'danger',
      rating: 'danger',
      warranty: 'attention',
      timedOut: 'attention',
      quotations: null,
    })
    expect(perfFlags(row({ onTimeRate: 0.8, averageRating: 4, warrantyClaims: 0 }))).toEqual({ onTime: null, rating: null, warranty: null, timedOut: null, quotations: null })
    expect(perfFlags(row({}))).toEqual({ onTime: null, rating: null, warranty: null, timedOut: null, quotations: null })
  })

  it('warns on quote rejections from 30 % with at least 3 quotes sent', () => {
    expect(perfFlags(row({ quotationsSent: 10, quotationsRejected: 3, quotationRejectionRate: 0.3 })).quotations).toBe('attention')
    expect(perfFlags(row({ quotationsSent: 10, quotationsRejected: 2, quotationRejectionRate: 0.2 })).quotations).toBeNull()
    // Too few quotes to judge: one rejection out of two is not a pattern.
    expect(perfFlags(row({ quotationsSent: 2, quotationsRejected: 1, quotationRejectionRate: 0.5 })).quotations).toBeNull()
    expect(perfFlags(row({ quotationsSent: 3, quotationsRejected: 1, quotationRejectionRate: 1 / 3 })).quotations).toBe('attention')
  })

  it('sorts with nulls last in both directions', () => {
    const rows = [row({ executorId: 'a', averageRating: 4.5 }), row({ executorId: 'b', averageRating: null }), row({ executorId: 'c', averageRating: 3 })]
    expect(sortPerformance(rows, 'averageRating', 'desc').map((r) => r.executorId)).toEqual(['a', 'c', 'b'])
    expect(sortPerformance(rows, 'averageRating', 'asc').map((r) => r.executorId)).toEqual(['c', 'a', 'b'])
  })

  it('builds inclusive Riyadh ranges', () => {
    expect(presetRange(7, dayjs.tz('2026-10-15 10:00', 'Asia/Riyadh'))).toEqual({ from: '2026-10-09', to: '2026-10-15' })
  })

  it('resolves the URL period: unknown falls back to 30 days, custom waits for both days', () => {
    const now = dayjs.tz('2026-10-15 10:00', 'Asia/Riyadh')
    expect(resolvePeriod({ period: '7', from: '', to: '' }, now)).toEqual({ period: '7', range: { from: '2026-10-09', to: '2026-10-15' }, ready: true })
    expect(resolvePeriod({ period: 'nonsense', from: '', to: '' }, now).period).toBe('30')
    expect(resolvePeriod({ period: 'custom', from: '2026-10-01', to: '' }, now).ready).toBe(false)
    expect(resolvePeriod({ period: 'custom', from: '2026-10-01', to: '2026-10-02' }, now)).toEqual({ period: 'custom', range: { from: '2026-10-01', to: '2026-10-02' }, ready: true })
  })
})

describe('technician report', () => {
  const day = (date: string, completed: number) => ({ date, completed, received: 0 })

  it('carries the period to the report', () => {
    expect(reportHref('e1', '30', { from: '2026-10-01', to: '2026-10-30' })).toBe('/team/e1/report')
    expect(reportHref('e1', '7', { from: '2026-10-24', to: '2026-10-30' })).toBe('/team/e1/report?period=7')
    expect(reportHref('e1', 'custom', { from: '2026-10-01', to: '2026-10-05' })).toBe('/team/e1/report?period=custom&from=2026-10-01&to=2026-10-05')
  })

  it('scales bars to the busiest day and keeps a small day visible', () => {
    const { max, bars } = dailyBars([day('2026-10-01', 0), day('2026-10-02', 1), day('2026-10-03', 100)])
    expect(max).toBe(100)
    expect(bars.map((b) => b.height)).toEqual([0, 4, 100])
  })

  it('has nothing to scale in an empty period', () => {
    expect(dailyBars([day('2026-10-01', 0)])).toEqual({ max: 0, bars: [{ date: '2026-10-01', completed: 0, height: 0 }] })
    expect(dailyBars([]).max).toBe(0)
  })

  it('names the PDF after the technician and the days, without path characters', () => {
    expect(reportPdfName('سالم العتيبي', '2026-10-01', '2026-10-30')).toBe('technician-report-سالم-العتيبي-2026-10-01-2026-10-30.pdf')
    expect(reportPdfName(' a/b:c ', '2026-10-01', '2026-10-30')).toBe('technician-report-a-b-c-2026-10-01-2026-10-30.pdf')
    expect(reportPdfName('', '2026-10-01', '2026-10-30')).toBe('technician-report-2026-10-01-2026-10-30.pdf')
  })
})

describe('map helpers', () => {
  it('colours jobs: late, unassigned, normal', () => {
    expect(jobColor({ isLate: true, executorId: 'x' })).toBe(JOB_COLORS.late)
    expect(jobColor({ isLate: false, executorId: null })).toBe(JOB_COLORS.unassigned)
    expect(jobColor({ isLate: false, executorId: 'x' })).toBe(JOB_COLORS.normal)
  })

  it('takes the first letter of a name', () => {
    expect(initialOf(' سالم العتيبي')).toBe('س')
    expect(initialOf('')).toBe('?')
  })
})
