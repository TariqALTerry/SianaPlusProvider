import { describe, expect, it } from 'vitest'
import type { ProviderBranchResponse } from '@/api/types'
import { branchDraft, branchFieldForError, branchRequest, closureProblem, EMPTY_BRANCH, hoursRequest, hoursRows, invalidHours, validateBranch } from './logic'
import { resolveScope } from './scope'

const option = (id: string, over: object = {}) => ({ id, name: id, code: id.toUpperCase(), isMain: false, isActive: true, receivesPlatformDevices: true, counterEnabled: false, termsText: null, termsVersion: 0, phone: null, addressLine: null, ...over })
const counter = { available: true, reason: null }

describe('branch form (phase 1 §3)', () => {
  it('validates name, code and the storage numbers (phase 5 §4)', () => {
    expect(validateBranch({ ...EMPTY_BRANCH, name: 'الفرع', code: 'RYD1' })).toEqual({})
    expect(validateBranch({ ...EMPTY_BRANCH, name: ' ', code: 'R' })).toEqual({ name: 'required', code: 'codeInvalid' })
    expect(validateBranch({ ...EMPTY_BRANCH, name: 'x', code: 'RYD-1' }).code).toBe('codeInvalid')
    expect(validateBranch({ ...EMPTY_BRANCH, name: 'x', code: 'AB', abandonAfterDays: '29' }).abandonAfterDays).toBe('abandonRange')
    expect(validateBranch({ ...EMPTY_BRANCH, name: 'x', code: 'AB', abandonAfterDays: '365' }).abandonAfterDays).toBeUndefined()
    expect(validateBranch({ ...EMPTY_BRANCH, name: 'x', code: 'AB', storageFeePerDay: '21' }).storageFeePerDay).toBe('feeRange')
    expect(validateBranch({ ...EMPTY_BRANCH, name: 'x', code: 'AB', storageFeePerDay: '20' }).storageFeePerDay).toBeUndefined()
    expect(validateBranch({ ...EMPTY_BRANCH, name: 'x', code: 'AB', freeStorageDays: '2' }).freeStorageDays).toBe('freeRange')
    expect(validateBranch({ ...EMPTY_BRANCH, name: 'x', code: 'AB', freeStorageDays: '90' }).freeStorageDays).toBeUndefined()
  })

  it('builds the full-replace body: upper-case code, both coordinates or none, blanks as null', () => {
    const body = branchRequest({ ...EMPTY_BRANCH, name: ' الملز ', code: 'ryd1', latitude: 24.123456789, longitude: null, city: ' ', abandonAfterDays: '30' })
    expect(body.name).toBe('الملز')
    expect(body.code).toBe('RYD1')
    expect(body.latitude).toBeNull()
    expect(body.longitude).toBeNull()
    expect(body.city).toBeNull()
    expect(body.abandonAfterDays).toBe(30)
    expect(body.storageFeePerDay).toBeNull()
    const located = branchRequest({ ...EMPTY_BRANCH, name: 'x', code: 'AB', latitude: 24.1234567, longitude: 46.7654321 })
    expect([located.latitude, located.longitude]).toEqual([24.123457, 46.765432])
  })

  it('round-trips a branch into the form', () => {
    const b = { ...branchRequest({ ...EMPTY_BRANCH, name: 'x', code: 'AB', termsText: 'شروط' }), freeStorageDays: 3, phone: '0112345678' } as unknown as ProviderBranchResponse
    const d = branchDraft(b)
    expect(d.termsText).toBe('شروط')
    expect(d.freeStorageDays).toBe('3')
    expect(d.phone).toBe('0112345678')
  })

  it('maps server codes to fields', () => {
    expect(branchFieldForError('BranchCodeTaken')).toBe('code')
    expect(branchFieldForError('BranchNameTooLong')).toBe('name')
    expect(branchFieldForError('BranchHasDevices')).toBeNull()
  })
})

describe('opening hours and closures (phase 1 §3)', () => {
  it('reads the week, sends only set days, and checks the times', () => {
    const rows = hoursRows([
      { dayOfWeek: 'Sunday', opens: '09:00', closes: '21:00', isClosed: false },
      { dayOfWeek: 'Friday', opens: null, closes: null, isClosed: true },
    ])
    expect(rows.map((r) => r.mode)).toEqual(['open', 'unset', 'unset', 'unset', 'unset', 'closed', 'unset'])
    expect(hoursRequest(rows)).toEqual([
      { dayOfWeek: 'Sunday', isClosed: false, opens: '09:00', closes: '21:00' },
      { dayOfWeek: 'Friday', isClosed: true, opens: null, closes: null },
    ])
    const bad = rows.map((r) => (r.day === 'Sunday' ? { ...r, closes: '08:00' } : r))
    expect(invalidHours(bad)).toEqual(['Sunday'])
    expect(invalidHours(rows)).toEqual([])
  })

  it('checks a closure: both dates, in order, not over, within a year', () => {
    const today = '2026-11-07'
    expect(closureProblem('', '2026-11-08', today)).toBe('missing')
    expect(closureProblem('2026-11-10', '2026-11-08', today)).toBe('order')
    expect(closureProblem('2026-11-01', '2026-11-02', today)).toBe('past')
    expect(closureProblem('2026-11-10', '2027-11-08', today)).toBe('tooFar')
    expect(closureProblem('2026-11-10', '2026-11-12', today)).toBeNull()
  })
})

describe('branch switcher scope (phase 1 §4)', () => {
  it('the owner: "all" by default, or the saved branch', () => {
    const data = { allBranches: true, branches: [option('a', { isMain: true }), option('b')], counter }
    expect(resolveScope(data, null)).toMatchObject({ mode: 'all', selected: null, branchId: undefined })
    expect(resolveScope(data, 'b')).toMatchObject({ mode: 'all', branchId: 'b' })
    // A saved branch that is gone falls back to "all".
    expect(resolveScope(data, 'zzz')).toMatchObject({ mode: 'all', branchId: undefined })
  })

  it('one linked branch: shown by name, no branchId sent', () => {
    expect(resolveScope({ allBranches: false, branches: [option('a')], counter }, null)).toMatchObject({ mode: 'fixed', branchId: undefined, selected: { id: 'a' } })
  })

  it('several linked branches: one of them, never "all"', () => {
    const data = { allBranches: false, branches: [option('a'), option('b')], counter }
    expect(resolveScope(data, null)).toMatchObject({ mode: 'pick', branchId: 'a' })
    expect(resolveScope(data, 'b')).toMatchObject({ mode: 'pick', branchId: 'b' })
  })

  it('no branch (front desk unlinked) and while loading', () => {
    expect(resolveScope({ allBranches: false, branches: [], counter }, 'a')).toMatchObject({ mode: 'none', branchId: undefined })
    expect(resolveScope(undefined, 'a')).toMatchObject({ mode: 'loading', branchId: 'a' })
  })
})
