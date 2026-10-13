import { describe, expect, it } from 'vitest'
import { activeDistribution, workHrefForStatus } from './logic'

describe('home status distribution (§8.2)', () => {
  it('keeps active statuses only, in lifecycle order, with shares', () => {
    const segments = activeDistribution([
      { status: 'Completed', count: 40 },
      { status: 'Scheduled', count: 3 },
      { status: 'AssignedToProvider', count: 1 },
      { status: 'Cancelled', count: 2 },
      { status: 'InProgress', count: 0 },
      { status: 'Rejected', count: 5 },
    ])
    expect(segments.map((s) => s.status)).toEqual(['AssignedToProvider', 'Scheduled'])
    expect(segments.map((s) => s.share)).toEqual([0.25, 0.75])
  })

  it('is empty without active work', () => {
    expect(activeDistribution([{ status: 'Completed', count: 3 }])).toEqual([])
  })

  it('links to the work list filtered by status', () => {
    expect(workHrefForStatus('WaitingCustomerApproval')).toBe('/work?status=WaitingCustomerApproval')
  })
})
