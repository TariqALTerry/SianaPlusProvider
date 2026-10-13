import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/http'
import type { ExecutorCandidateResponse, ServiceItemStatus } from '@/api/types'
import { dayjs, DISPLAY_TZ } from '@/lib/format'
import {
  availableWorkActions,
  bestCandidateId,
  canRejectIncoming,
  commissionAmount,
  defaultScheduleWindow,
  delegateSkipped,
  ineligibleReasons,
  initials,
  isContactHidden,
  isLiveStatus,
  isStaleItemDetail,
  loadRatio,
  statusesFor,
  TAB_STATUSES,
  workErrorDetail,
} from './logic'

const person = { id: 'e1', fullName: 'فهد', phoneNumber: null }

describe('work list quick tabs (§8.4)', () => {
  it('maps every tab to the brief’s statuses', () => {
    expect(TAB_STATUSES.all).toEqual([])
    expect(TAB_STATUSES.needsTechnician).toEqual(['AssignedToProvider', 'Rejected'])
    expect(TAB_STATUSES.awaitingTechnician).toEqual(['AssignedToExecutor'])
    expect(TAB_STATUSES.scheduled).toEqual(['Accepted', 'Scheduled'])
    expect(TAB_STATUSES.inProgress).toEqual(['EnRoute', 'Arrived', 'Assessment', 'WaitingCustomerApproval', 'InProgress', 'WaitingCustomerConfirmation'])
    expect(TAB_STATUSES.onHold).toEqual(['Paused', 'Disputed'])
    expect(TAB_STATUSES.finished).toEqual(['Completed', 'Cancelled', 'Refunded', 'PartiallyRefunded'])
  })

  it('lets an explicit ?status= win over the tab, and ignores unknown tabs', () => {
    expect(statusesFor('scheduled', [])).toEqual(['Accepted', 'Scheduled'])
    expect(statusesFor('scheduled', ['Paused'])).toEqual(['Paused'])
    expect(statusesFor('nope', [])).toEqual([])
  })
})

describe('actions by status (§8.4 action table)', () => {
  const actions = (status: ServiceItemStatus, withExecutor: boolean) => [...availableWorkActions({ status, executor: withExecutor ? person : null })].sort()

  it('offers assign / delegate / schedule / reject while waiting for a technician', () => {
    expect(actions('AssignedToProvider', false)).toEqual(['assign', 'delegate', 'reject', 'schedule'])
  })

  it('does not let the organization decline a technician-declined item', () => {
    expect(actions('Rejected', false)).toEqual(['assign', 'delegate'])
    expect(canRejectIncoming('Rejected')).toBe(false)
    expect(canRejectIncoming('AssignedToProvider')).toBe(true)
  })

  it('offers reassign / unassign once a technician holds the item', () => {
    expect(actions('AssignedToExecutor', true)).toEqual(['delegate', 'reassign', 'reject', 'schedule', 'unassign'])
    expect(actions('Accepted', true)).toEqual(['delegate', 'reassign', 'schedule', 'unassign'])
    expect(actions('Scheduled', true)).toEqual(['delegate', 'reassign', 'schedule', 'unassign'])
    expect(actions('Paused', true)).toEqual(['delegate', 'reassign', 'unassign'])
  })

  it('offers nothing once work has started or finished', () => {
    for (const s of ['EnRoute', 'InProgress', 'WaitingCustomerConfirmation', 'Completed', 'Cancelled', 'Disputed'] as const) {
      expect(actions(s, true)).toEqual([])
    }
  })
})

describe('privacy, polling and money', () => {
  it('hides the customer until a technician accepts', () => {
    expect(isContactHidden('AssignedToExecutor')).toBe(true)
    expect(isContactHidden('Rejected')).toBe(true)
    expect(isContactHidden('Accepted')).toBe(false)
  })

  it('polls items that can still change', () => {
    expect(isLiveStatus('Scheduled')).toBe(true)
    expect(isLiveStatus('Disputed')).toBe(true)
    expect(isLiveStatus('Completed')).toBe(false)
    expect(isLiveStatus('PartiallyRefunded')).toBe(false)
  })

  it('computes the commission and load ratios safely', () => {
    expect(commissionAmount(200, 170)).toBe(30)
    expect(commissionAmount(100, 120)).toBe(0)
    expect(loadRatio(2, 4)).toBe(0.5)
    expect(loadRatio(5, 4)).toBe(1)
    expect(loadRatio(0, 0)).toBe(1)
  })
})

describe('delegate result (§8.3)', () => {
  it('detects a skipped auto-assign', () => {
    expect(delegateSkipped({ status: 'AssignedToProvider', executor: null })).toBe(true)
    expect(delegateSkipped({ status: 'Rejected', executor: null })).toBe(true)
    expect(delegateSkipped({ status: 'AssignedToExecutor', executor: person })).toBe(false)
  })
})

describe('candidate picker (§8.5)', () => {
  const c = (over: Partial<ExecutorCandidateResponse>): ExecutorCandidateResponse => ({
    executorId: 'x',
    userId: 'u',
    fullName: 'سالم العتيبي',
    phoneNumber: null,
    specialization: null,
    availability: 'Available',
    hasAllCapabilities: true,
    maxConcurrentJobs: 3,
    activeJobs: 0,
    averageRating: 0,
    completedItemsCount: 0,
    distanceKm: null,
    isEligible: true,
    score: 0.8,
    hasCapacity: true,
    ...over,
  })

  it('lists the reasons an executor is ineligible', () => {
    expect(ineligibleReasons(c({}))).toEqual([])
    expect(ineligibleReasons(c({ isEligible: false, hasAllCapabilities: false }))).toEqual(['capabilities'])
    expect(ineligibleReasons(c({ isEligible: false, availability: 'Busy', hasCapacity: false }))).toEqual(['unavailable', 'maxJobs'])
    // Inactive account: the server says ineligible without a specific flag.
    expect(ineligibleReasons(c({ isEligible: false }))).toEqual(['unavailable'])
  })

  it('marks the first eligible row as the best, keeping the server order', () => {
    expect(bestCandidateId([c({ executorId: 'a', isEligible: false }), c({ executorId: 'b' }), c({ executorId: 'c' })])).toBe('b')
    expect(bestCandidateId([c({ isEligible: false })])).toBeNull()
  })

  it('builds avatar initials', () => {
    expect(initials('سالم العتيبي')).toBe('سع')
    expect(initials('fahad')).toBe('F')
    expect(initials('')).toBe('؟')
  })
})

describe('structured assignment errors', () => {
  const err = (errorCode: string, details: unknown) => new ApiError({ status: 400, errorCode, message: 'msg', details })

  it('reads ExecutorAtCapacity, ExecutorLacksCapability and InvalidStatusTransition', () => {
    expect(workErrorDetail(err('ExecutorAtCapacity', { maxConcurrentJobs: 3, activeJobs: 3 })).detail).toEqual({ kind: 'capacity', maxConcurrentJobs: 3, activeJobs: 3 })
    expect(workErrorDetail(err('ExecutorLacksCapability', { missingCapabilityIds: ['a', 'b'] })).detail).toEqual({ kind: 'capabilities', count: 2 })
    expect(workErrorDetail(err('InvalidStatusTransition', { from: 'Accepted', to: 'Rejected' })).detail).toEqual({ kind: 'transition', from: 'Accepted', to: 'Rejected' })
  })

  it('turns item-changed-elsewhere codes into their own hints', () => {
    expect(workErrorDetail(err('ServiceItemNotReassignable', null)).detail).toEqual({ kind: 'notReassignable' })
    expect(workErrorDetail(err('ExecutorNotAssigned', null)).detail).toEqual({ kind: 'notAssigned' })
    expect(workErrorDetail(err('ConcurrentModification', null)).detail).toEqual({ kind: 'concurrent' })
    expect(isStaleItemDetail({ kind: 'concurrent' })).toBe(true)
    expect(isStaleItemDetail({ kind: 'capabilities', count: 1 })).toBe(false)
    expect(isStaleItemDetail(null)).toBe(false)
  })

  it('keeps the server message and drops the raw details', () => {
    const { error, detail } = workErrorDetail(err('ExecutorUnavailable', { foo: 1 }))
    expect(detail).toBeNull()
    expect(error?.message).toBe('msg')
    expect(error?.errorCode).toBe('ExecutorUnavailable')
    expect(error?.details).toBeUndefined()
    expect(workErrorDetail(null)).toEqual({ error: null, detail: null })
  })
})

describe('schedule dialog defaults', () => {
  const now = dayjs.tz('2026-10-05 10:20', DISPLAY_TZ)

  it('keeps a future window', () => {
    expect(defaultScheduleWindow('2026-10-06T06:00:00Z', '2026-10-06T08:00:00Z', now)).toEqual({ start: '2026-10-06T09:00', end: '2026-10-06T11:00' })
  })

  it('proposes the next full hour when there is no window or it is past', () => {
    expect(defaultScheduleWindow(null, null, now)).toEqual({ start: '2026-10-05T11:00', end: '2026-10-05T13:00' })
    expect(defaultScheduleWindow('2026-10-01T06:00:00Z', null, now)).toEqual({ start: '2026-10-05T11:00', end: '2026-10-05T13:00' })
  })
})
