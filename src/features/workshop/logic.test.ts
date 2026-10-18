import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/http'
import type { ExecutorCandidateResponse } from '@/api/types'
import {
  isHandover,
  isValidCode,
  matchesSearch,
  nextSteps,
  normalizeCode,
  plannedTrip,
  trackingError,
  trackingErrorCode,
  tripCandidates,
  tripNeeds,
  updateProblems,
} from './logic'

describe('custody steps', () => {
  it('offers only the next step, as the server allows', () => {
    expect(nextSteps('AtCustomer')).toEqual([{ to: 'PickedUp', handover: true }])
    expect(nextSteps('PickedUp')).toEqual([{ to: 'AtWorkshop', handover: false }])
    expect(nextSteps('AtWorkshop')).toEqual([{ to: 'ReadyForReturn', handover: false }])
    // Out with a courier/technician, or handed to the customer at the workshop.
    expect(nextSteps('ReadyForReturn')).toEqual([
      { to: 'OutForReturn', handover: false },
      { to: 'Returned', handover: true },
    ])
    expect(nextSteps('OutForReturn')).toEqual([{ to: 'Returned', handover: true }])
    expect(nextSteps('Returned')).toEqual([])
  })

  it('needs the code and a photo only to collect or hand back', () => {
    expect(isHandover('PickedUp')).toBe(true)
    expect(isHandover('Returned')).toBe(true)
    expect(isHandover('AtWorkshop')).toBe(false)
    expect(isHandover('OutForReturn')).toBe(false)
  })

  it('reads the 4-digit code, Arabic-Indic digits included', () => {
    expect(normalizeCode('١٢٣٤')).toBe('1234')
    expect(normalizeCode('12 3-45')).toBe('1234')
    expect(isValidCode('123')).toBe(false)
    expect(isValidCode('0042')).toBe(true)
  })
})

describe('trips', () => {
  const leg = (type: 'Pickup' | 'Return', status: 'Planned' | 'Done') => ({
    id: type + status,
    type,
    status,
    executorId: 'e',
    executorName: 'سالم',
    executorKind: 'Courier' as const,
    scheduledStart: null,
    scheduledEnd: null,
    completedAt: null,
  })

  it('finds the planned trip of a type', () => {
    expect(plannedTrip([leg('Pickup', 'Done'), leg('Return', 'Planned')], 'Return')?.id).toBe('ReturnPlanned')
    expect(plannedTrip([leg('Pickup', 'Done')], 'Pickup')).toBeNull()
  })

  it('offers a pickup while a device is with the customer, a return while one is away', () => {
    expect(tripNeeds([{ stage: 'AtCustomer' }])).toEqual({ Pickup: true, Return: false })
    expect(tripNeeds([{ stage: 'AtWorkshop' }, { stage: 'Returned' }])).toEqual({ Pickup: false, Return: true })
    expect(tripNeeds([{ stage: 'OutForReturn' }])).toEqual({ Pickup: false, Return: false })
  })

  it('offers delivery members (first) and the assigned technician only', () => {
    const c = (id: string, canDeliver: boolean, availability: 'Available' | 'Busy') =>
      ({ executorId: id, canRepair: !canDeliver || id === 'both', canDeliver, availability }) as ExecutorCandidateResponse
    const list = [c('t1', false, 'Available'), c('d1', true, 'Busy'), c('t2', false, 'Busy'), c('d2', true, 'Available'), c('both', true, 'Available')]
    // t2 is the service's technician: allowed without the delivery role; t1 is not.
    expect(tripCandidates(list, 't2').map((x) => x.executorId)).toEqual(['d2', 'both', 'd1', 't2'])
    expect(tripCandidates(list, null).map((x) => x.executorId)).toEqual(['d2', 'both', 'd1'])
  })
})

describe('progress update form', () => {
  const now = Date.parse('2026-10-17T09:00:00Z')

  it('requires a note for Other and Delayed only', () => {
    expect(updateProblems({ kind: 'Delayed', note: '  ', expectedReadyAt: null }, now)).toEqual(['noteRequired'])
    expect(updateProblems({ kind: 'Other', note: 'x', expectedReadyAt: null }, now)).toEqual([])
    expect(updateProblems({ kind: 'InspectionStarted', note: '', expectedReadyAt: null }, now)).toEqual([])
    expect(updateProblems({ kind: 'Testing', note: 'x'.repeat(1001), expectedReadyAt: null }, now)).toEqual(['noteTooLong'])
  })

  it('keeps the ready date within now..4 months', () => {
    expect(updateProblems({ kind: 'Testing', note: '', expectedReadyAt: '2026-10-20T09:00:00Z' }, now)).toEqual([])
    expect(updateProblems({ kind: 'Testing', note: '', expectedReadyAt: '2026-10-16T09:00:00Z' }, now)).toEqual(['readyInvalid'])
    expect(updateProblems({ kind: 'Testing', note: '', expectedReadyAt: '2027-03-01T09:00:00Z' }, now)).toEqual(['readyInvalid'])
  })
})

describe('workshop search', () => {
  const d = { tagCode: 'WS-1001', itemNumber: 'SI-10053-2' }
  it('matches the tag however it is typed, or the item number', () => {
    expect(matchesSearch(d, 'WS-1001')).toBe(true)
    expect(matchesSearch(d, 'ws1001')).toBe(true)
    expect(matchesSearch(d, '1001')).toBe(true)
    expect(matchesSearch(d, 'WS-1002')).toBe(false)
    expect(matchesSearch(d, '10053')).toBe(true)
    expect(matchesSearch({ tagCode: null, itemNumber: null }, 'WS')).toBe(false)
    expect(matchesSearch(d, '  ')).toBe(true)
  })
})

describe('tracking errors', () => {
  const err = (errorCode: string, details?: unknown) => new ApiError({ status: 400, errorCode, message: 'server', details })

  it('words the known codes and drops raw details', () => {
    const e = trackingError(err('CustodyStepInvalid', { from: 'AtCustomer', to: 'Returned' }), (code, d) => `${code}:${String(d.from)}>${String(d.to)}`)
    expect(e?.message).toBe('CustodyStepInvalid:AtCustomer>Returned')
    expect(e?.errorCode).toBe('CustodyStepInvalid')
    expect(e?.details).toBeUndefined()
    for (const code of ['HandoverCodeInvalid', 'HandoverCodeLocked', 'CustodyPhotoRequired', 'TrackingPhotoInvalid', 'ProgressNoteRequired', 'ExpectedReadyAtInvalid', 'ServiceItemClosed', 'ExecutorCannotRepair', 'ExecutorCannotDeliver', 'ExecutorRolesRequired']) {
      expect(trackingErrorCode(err(code))).toBe(code)
    }
  })

  it('keeps the server message for anything else', () => {
    expect(trackingError(err('TripNotFound'), () => 'x')?.message).toBe('server')
    expect(trackingError(null, () => 'x')).toBeNull()
  })
})
