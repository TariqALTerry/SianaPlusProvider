import { describe, expect, it } from 'vitest'
import {
  adjustedOnHand,
  adjustRequest,
  canOverrideNegative,
  canSeeCosts,
  canWriteInventory,
  defaultCredit,
  EMPTY_PART,
  formatQuantity,
  movementDirection,
  nextReturnStatuses,
  parseDecimal,
  partRequest,
  receiveRequest,
  returnStatusBlocked,
  settingsAccess,
  validateAdjust,
  validatePart,
  validateReceive,
  validateReturn,
  validateTransfer,
  type AdjustDraft,
  type ReceiveDraft,
} from './logic'

describe('inventory permissions (phase 6 §1)', () => {
  it('the front desk reads only, without costs', () => {
    expect(canWriteInventory('frontDesk')).toBe(false)
    expect(canSeeCosts('frontDesk')).toBe(false)
    expect(canWriteInventory('supervisor')).toBe(true)
    expect(canSeeCosts('supervisor')).toBe(true)
  })

  it('only the owner goes below zero and saves the settings', () => {
    expect(canOverrideNegative('owner')).toBe(true)
    expect(canOverrideNegative('supervisor')).toBe(false)
    expect(settingsAccess('owner')).toBe('edit')
    expect(settingsAccess('supervisor')).toBe('read')
    expect(settingsAccess('frontDesk')).toBe('none')
  })
})

describe('quantities (two decimals)', () => {
  it('parses Arabic digits and decimal commas, rounding to two places', () => {
    expect(parseDecimal('2.5')).toBe(2.5)
    expect(parseDecimal('٣٫٧٥')).toBe(3.75)
    expect(parseDecimal('1,234')).toBe(1.23)
    expect(parseDecimal('-4')).toBe(-4)
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('abc')).toBeNull()
  })

  it('formats 0 to 2 decimals', () => {
    expect(formatQuantity(3, 'en')).toBe('3')
    expect(formatQuantity(1.25, 'en')).toBe('1.25')
    expect(formatQuantity(-0.5, 'en')).toBe('-0.5')
    expect(formatQuantity(null, 'en')).toBe('—')
  })

  it('reads a movement: in, out, or a record-only return from a device', () => {
    expect(movementDirection({ kind: 'Receive', quantity: 3 })).toBe('in')
    expect(movementDirection({ kind: 'Issue', quantity: -1 })).toBe('out')
    expect(movementDirection({ kind: 'ReturnToSupplier', quantity: -2 })).toBe('out')
    expect(movementDirection({ kind: 'ReturnToSupplier', quantity: 0 })).toBe('recordOnly')
  })
})

const receive = (over: Partial<ReceiveDraft> = {}): ReceiveDraft => ({
  branchId: 'b1',
  partItemId: 'p1',
  quantity: '2',
  unitCost: '',
  supplierId: null,
  batchRef: '',
  note: '',
  ...over,
})

describe('receive (§5)', () => {
  it('needs a branch, a part and a quantity above zero', () => {
    expect(validateReceive(receive())).toEqual({})
    expect(validateReceive(receive({ branchId: null, partItemId: null, quantity: '' }))).toEqual({ branchId: 'required', partItemId: 'required', quantity: 'required' })
    expect(validateReceive(receive({ quantity: '0' })).quantity).toBe('positive')
    expect(validateReceive(receive({ unitCost: '-1' })).unitCost).toBe('notNegative')
  })

  it('a blank unit cost is null (the part default applies)', () => {
    expect(receiveRequest(receive({ quantity: '1.5', batchRef: ' B-7 ' }))).toMatchObject({ quantity: 1.5, unitCost: null, batchRef: 'B-7', supplierId: null, note: null })
    expect(receiveRequest(receive({ unitCost: '12.5', supplierId: 's1' }))).toMatchObject({ unitCost: 12.5, supplierId: 's1' })
  })
})

const adjust = (over: Partial<AdjustDraft> = {}): AdjustDraft => ({
  branchId: 'b1',
  partItemId: 'p1',
  mode: 'delta',
  value: '-2',
  reason: 'كسر',
  allowNegative: false,
  ...over,
})

describe('adjust (§5)', () => {
  it('sends exactly one of quantityDelta or countedOnHand', () => {
    expect(adjustRequest(adjust(), 'supervisor')).toMatchObject({ quantityDelta: -2, countedOnHand: null })
    expect(adjustRequest(adjust({ mode: 'count', value: '7' }), 'supervisor')).toMatchObject({ quantityDelta: null, countedOnHand: 7 })
  })

  it('needs a reason and a real change; a count is never negative', () => {
    expect(validateAdjust(adjust())).toEqual({})
    expect(validateAdjust(adjust({ reason: ' ' })).reason).toBe('required')
    expect(validateAdjust(adjust({ value: '0' })).value).toBe('required')
    expect(validateAdjust(adjust({ mode: 'count', value: '0' }))).toEqual({})
    expect(validateAdjust(adjust({ mode: 'count', value: '-1' })).value).toBe('notNegative')
  })

  it('allowNegative only for the owner', () => {
    expect(adjustRequest(adjust({ allowNegative: true }), 'owner').allowNegative).toBe(true)
    expect(adjustRequest(adjust({ allowNegative: true }), 'supervisor').allowNegative).toBe(false)
  })

  it('previews the on-hand after the change', () => {
    expect(adjustedOnHand(5, { mode: 'delta', value: '-2' })).toBe(3)
    expect(adjustedOnHand(5, { mode: 'count', value: '9' })).toBe(9)
    expect(adjustedOnHand(5, { mode: 'delta', value: '' })).toBeNull()
  })
})

describe('transfer (§5)', () => {
  it('needs two different branches and a positive quantity', () => {
    const base = { fromBranchId: 'a', toBranchId: 'b', partItemId: 'p', quantity: '1', note: '' }
    expect(validateTransfer(base)).toEqual({})
    expect(validateTransfer({ ...base, toBranchId: 'a' }).toBranchId).toBe('sameBranch')
    expect(validateTransfer({ ...base, quantity: '-1' }).quantity).toBe('positive')
  })
})

describe('parts (§3)', () => {
  it('validates the SKU, names, numbers and warranty days', () => {
    expect(validatePart({ ...EMPTY_PART, sku: 'SCR-1', nameAr: 'شاشة' })).toEqual({})
    expect(validatePart(EMPTY_PART)).toMatchObject({ sku: 'required', nameAr: 'required' })
    expect(validatePart({ ...EMPTY_PART, sku: 'A', nameAr: 'x', defaultPrice: '-1' }).defaultPrice).toBe('notNegative')
    expect(validatePart({ ...EMPTY_PART, sku: 'A', nameAr: 'x', defaultWarrantyDays: '3651' }).defaultWarrantyDays).toBe('range')
    expect(validatePart({ ...EMPTY_PART, sku: 'A', nameAr: 'x', defaultWarrantyDays: '1.5' }).defaultWarrantyDays).toBe('whole')
  })

  it('builds the full-replace body: upper-case SKU, blanks as null, 0 warranty = none', () => {
    const body = partRequest({ ...EMPTY_PART, sku: ' scr-1 ', nameAr: 'شاشة', defaultPrice: '150', defaultWarrantyDays: '0' })
    expect(body).toMatchObject({ sku: 'SCR-1', nameEn: '', unit: null, defaultCost: 0, defaultPrice: 150, defaultWarrantyDays: null, reorderLevel: 0 })
    expect(partRequest({ ...EMPTY_PART, sku: 'A', nameAr: 'x', defaultWarrantyDays: '90' }).defaultWarrantyDays).toBe(90)
  })
})

describe('supplier returns (§8)', () => {
  it('offers only the allowed transitions', () => {
    expect(nextReturnStatuses('Draft')).toEqual(['Sent', 'Rejected'])
    expect(nextReturnStatuses('Sent')).toEqual(['Credited', 'Rejected'])
    expect(nextReturnStatuses('Credited')).toEqual([])
    expect(nextReturnStatuses('Rejected')).toEqual([])
  })

  it('sending needs a supplier; credit defaults to quantity × unit cost', () => {
    expect(returnStatusBlocked({ supplierId: null }, 'Sent')).toBe('supplierRequired')
    expect(returnStatusBlocked({ supplierId: null }, 'Rejected')).toBeNull()
    expect(defaultCredit({ quantity: 1.5, unitCost: 33.33 })).toBe(50)
  })

  it('a new return needs branch, part, quantity and reason; an edit needs no branch or part', () => {
    const d = { branchId: null, partItemId: null, supplierId: null, quantity: '1', batchRef: '', reason: 'معيبة', fromStock: true, note: '' }
    expect(validateReturn(d)).toEqual({ branchId: 'required', partItemId: 'required' })
    expect(validateReturn(d, true)).toEqual({})
    expect(validateReturn({ ...d, reason: '' }, true).reason).toBe('required')
  })
})
