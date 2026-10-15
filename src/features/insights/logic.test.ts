import { describe, expect, it } from 'vitest'
import type { ExecutorPerformance } from '@/api/types'
import { dayjs } from '@/lib/format'
import { addCapabilityHref, addCoverageHref, initialOf, jobColor, JOB_COLORS, parseRadius, perfFlags, presetRange, sortPerformance } from './logic'

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
    expect(perfFlags(row({ onTimeRate: 0.79, averageRating: 3.9, warrantyClaims: 1 }))).toEqual({ onTime: 'danger', rating: 'danger', warranty: 'attention' })
    expect(perfFlags(row({ onTimeRate: 0.8, averageRating: 4, warrantyClaims: 0 }))).toEqual({ onTime: null, rating: null, warranty: null })
    expect(perfFlags(row({}))).toEqual({ onTime: null, rating: null, warranty: null })
  })

  it('sorts with nulls last in both directions', () => {
    const rows = [row({ executorId: 'a', averageRating: 4.5 }), row({ executorId: 'b', averageRating: null }), row({ executorId: 'c', averageRating: 3 })]
    expect(sortPerformance(rows, 'averageRating', 'desc').map((r) => r.executorId)).toEqual(['a', 'c', 'b'])
    expect(sortPerformance(rows, 'averageRating', 'asc').map((r) => r.executorId)).toEqual(['c', 'a', 'b'])
  })

  it('builds inclusive Riyadh ranges', () => {
    expect(presetRange(7, dayjs.tz('2026-10-15 10:00', 'Asia/Riyadh'))).toEqual({ from: '2026-10-09', to: '2026-10-15' })
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
