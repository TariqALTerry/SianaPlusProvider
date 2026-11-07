import { describe, expect, it } from 'vitest'
import type { BranchTransferResponse, CounterWarrantyLineItem, CounterWarrantyLookupItem } from '@/api/types'
import {
  cashDifference,
  claimNeedsGoodwill,
  claimProblem,
  claimRequest,
  closeNoteRequired,
  defaultLineIds,
  differenceTone,
  emptyClaim,
  intakePrefill,
  isFutureDate,
  lineSelectable,
  lineState,
  lookupQuery,
  parseCount,
  serviceHref,
  transferActions,
  transferDirection,
} from './logic'

const line = (id: string, over: Partial<CounterWarrantyLineItem> = {}): CounterWarrantyLineItem => ({
  id,
  description: id,
  kind: 'Part',
  quantity: 1,
  warrantyDays: 90,
  startsAt: '2026-10-01T00:00:00Z',
  endsAt: '2026-12-30T00:00:00Z',
  daysRemaining: 50,
  claimable: true,
  claimedAt: null,
  claimServiceItemId: null,
  partItemId: null,
  sku: null,
  supplierName: null,
  batchRef: null,
  ...over,
})

const warranty = (over: Partial<CounterWarrantyLookupItem> = {}) =>
  ({
    warrantyId: 'w1',
    inWarranty: true,
    lines: [],
    customerPhone: '+966501234567',
    canonicalServiceId: 'svc',
    deviceName: 'iPhone',
    brand: 'Apple',
    model: '13',
    imei: '3567',
    serialNumber: null,
    ...over,
  }) as CounterWarrantyLookupItem

describe('transfers (phase 5 §5)', () => {
  const tr = { availableActions: ['Cancel', 'Pickup', 'Send'], fromBranch: { id: 'a' }, toBranch: { id: 'b' }, fulfillmentChannel: 'WalkIn', serviceItemId: 's1' } as unknown as BranchTransferResponse

  it('shows the staff actions in order and ignores the courier ones', () => {
    expect(transferActions(tr)).toEqual(['Send', 'Cancel'])
    expect(transferActions({ availableActions: [] })).toEqual([])
  })

  it('opens a counter item in the counter and a platform service in the work pages', () => {
    expect(serviceHref(tr)).toBe('/counter/items/s1')
    expect(serviceHref({ ...tr, fulfillmentChannel: 'PickupDelivery' })).toBe('/work/s1')
  })

  it('reads the direction from the selected branch', () => {
    expect(transferDirection(tr, 'a')).toBe('out')
    expect(transferDirection(tr, 'b')).toBe('in')
    expect(transferDirection(tr, 'c')).toBeNull()
    expect(transferDirection(tr, null)).toBeNull()
  })
})

describe('warranty lookup and claim (phase 5 §6, phase 6 §11)', () => {
  it('needs one field at least, trimmed', () => {
    expect(lookupQuery({ phone: ' ', imei: '', code: '' })).toBeNull()
    expect(lookupQuery({ phone: ' 0501234567 ', imei: '', code: 'W-1' })).toEqual({ phone: '0501234567', imei: null, code: 'W-1' })
  })

  it('classifies lines and who may pick them', () => {
    const claimable = line('a')
    const claimed = line('b', { claimable: false, claimedAt: '2026-11-01T00:00:00Z', claimServiceItemId: 'x' })
    const expired = line('c', { claimable: false, daysRemaining: 0 })
    expect([lineState(claimable), lineState(claimed), lineState(expired)]).toEqual(['claimable', 'claimed', 'expired'])
    expect(lineSelectable(claimable, 'frontDesk')).toBe(true)
    expect(lineSelectable(expired, 'frontDesk')).toBe(false)
    expect(lineSelectable(expired, 'supervisor')).toBe(true)
    expect(lineSelectable(claimed, 'owner')).toBe(false)
    expect(defaultLineIds([claimable, claimed, expired])).toEqual(['a'])
  })

  it('is free only when every chosen line is in its days', () => {
    expect(claimNeedsGoodwill(warranty(), [])).toBe(false)
    expect(claimNeedsGoodwill(warranty({ inWarranty: false }), [])).toBe(true)
    const item = warranty({ lines: [line('a'), line('c', { claimable: false })] })
    expect(claimNeedsGoodwill(item, ['a'])).toBe(false)
    expect(claimNeedsGoodwill(item, ['a', 'c'])).toBe(true)
  })

  it('checks the claim before saving', () => {
    const item = warranty({ lines: [line('a')] })
    const base = { ...emptyClaim(item, 'br'), description: 'الشاشة تطفي' }
    expect(claimProblem(base, item, 'frontDesk')).toBeNull()
    expect(claimProblem({ ...base, branchId: null }, item, 'owner')).toBe('branch')
    expect(claimProblem({ ...base, description: ' ' }, item, 'owner')).toBe('description')
    expect(claimProblem({ ...base, lineIds: [] }, item, 'owner')).toBe('lines')
    expect(claimProblem({ ...base, goodwill: true }, item, 'frontDesk')).toBe('goodwillNotAllowed')
    expect(claimProblem({ ...base, goodwill: true }, item, 'supervisor')).toBe('goodwillReason')
    expect(claimProblem({ ...base, goodwill: true, goodwillReason: 'عميل دائم', goodwillAmount: '-1' }, item, 'supervisor')).toBe('goodwillAmount')
    expect(claimProblem({ ...base, goodwill: true, goodwillReason: 'عميل دائم', goodwillAmount: '50' }, item, 'supervisor')).toBeNull()
  })

  it('builds the body: lines named, goodwill and technician from a manager only', () => {
    const item = warranty({ lines: [line('a'), line('b')] })
    const draft = { ...emptyClaim(item, 'br'), description: ' عطل ', executorId: 'ex', goodwill: true, goodwillReason: ' مجاملة ', goodwillAmount: '25', lockCode: '' }
    const manager = claimRequest(draft, 'owner')
    expect(manager).toMatchObject({ branchId: 'br', description: 'عطل', executorId: 'ex', goodwill: true, goodwillReason: 'مجاملة', goodwillAmount: 25, lockCode: null, lineIds: ['a', 'b'] })
    const desk = claimRequest(draft, 'frontDesk')
    expect(desk).toMatchObject({ executorId: null, goodwill: false, goodwillReason: null, goodwillAmount: null })
    expect(claimRequest({ ...draft, goodwillAmount: '' }, 'owner').goodwillAmount).toBeNull()
  })

  it('prefills the paid intake from the device when the warranty is over', () => {
    expect(intakePrefill(warranty())).toEqual({
      phone: '+966501234567',
      canonicalServiceId: 'svc',
      device: { name: 'iPhone', brand: 'Apple', model: '13', imei: '3567', serialNumber: null },
    })
  })
})

describe('cash close (phase 5 §7)', () => {
  it('reads the counted cash', () => {
    expect(parseCount('')).toBeNull()
    expect(parseCount('-5')).toBeNull()
    expect(parseCount('abc')).toBeNull()
    expect(parseCount('120.5')).toBe(120.5)
    expect(parseCount('0')).toBe(0)
  })

  it('colours the difference and asks for a note when there is one', () => {
    expect(cashDifference(100.1, 100.3)).toBe(-0.2)
    expect(differenceTone(0)).toBe('success')
    expect(differenceTone(-0.2)).toBe('danger')
    expect(differenceTone(5)).toBe('attention')
    expect(closeNoteRequired(null)).toBe(false)
    expect(closeNoteRequired(0)).toBe(false)
    expect(closeNoteRequired(-1)).toBe(true)
  })

  it('refuses a day after today', () => {
    expect(isFutureDate('2026-11-08', '2026-11-07')).toBe(true)
    expect(isFutureDate('2026-11-07', '2026-11-07')).toBe(false)
    expect(isFutureDate('', '2026-11-07')).toBe(false)
  })
})
