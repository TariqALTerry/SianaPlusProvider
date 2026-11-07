import { describe, expect, it } from 'vitest'
import { branchLimit, canCancel, cancelsAtOnce, canPayFromWallet, canResume, daysUntil, isChangeable, isEnded, keyDate, periodPrice, walletShortfall, yearlySaving } from './logic'

const plan = { monthlyPrice: 99, yearlyPrice: 990, extraBranchMonthlyPrice: 49 }
const sub = (over: object = {}) => ({
  status: 'Active' as const,
  cancelAtPeriodEnd: false,
  trialEndsAt: null,
  currentPeriodEndsAt: '2026-12-01T00:00:00Z',
  graceEndsAt: null,
  cancelledAt: null,
  ...over,
})

describe('counter subscription display (phase 3 §3)', () => {
  it('prices a period: the cycle price plus extra branches (×12 a year)', () => {
    expect(periodPrice(plan, 'Monthly', 0)).toBe(99)
    expect(periodPrice(plan, 'Monthly', 2)).toBe(197)
    expect(periodPrice(plan, 'Yearly', 1)).toBe(990 + 49 * 12)
    expect(periodPrice(plan, 'Monthly', -3)).toBe(99)
  })

  it('shows the yearly saving only when there is one', () => {
    expect(yearlySaving(plan)).toBe(198)
    expect(yearlySaving({ monthlyPrice: 10, yearlyPrice: 150 })).toBe(0)
  })

  it('knows what each status allows', () => {
    expect(isChangeable('Trial')).toBe(true)
    expect(isChangeable('PendingPayment')).toBe(true)
    expect(isChangeable('Expired')).toBe(false)
    expect(canCancel({ status: 'Active', cancelAtPeriodEnd: false })).toBe(true)
    expect(canCancel({ status: 'Active', cancelAtPeriodEnd: true })).toBe(false)
    expect(canCancel({ status: 'PastDue', cancelAtPeriodEnd: false })).toBe(true)
    expect(canCancel({ status: 'Cancelled', cancelAtPeriodEnd: false })).toBe(false)
    expect(cancelsAtOnce('PendingPayment')).toBe(true)
    expect(cancelsAtOnce('Trial')).toBe(false)
    expect(canResume({ status: 'Trial', cancelAtPeriodEnd: true })).toBe(true)
    expect(canResume({ status: 'PastDue', cancelAtPeriodEnd: true })).toBe(false)
    expect(isEnded('Expired')).toBe(true)
    expect(isEnded('Active')).toBe(false)
  })

  it('picks the date that matters per status (none while waiting for the first payment)', () => {
    expect(keyDate(sub({ status: 'Trial', trialEndsAt: '2026-11-20T00:00:00Z' }))).toEqual({ kind: 'trialEnds', at: '2026-11-20T00:00:00Z' })
    expect(keyDate(sub())).toEqual({ kind: 'periodEnds', at: '2026-12-01T00:00:00Z' })
    expect(keyDate(sub({ status: 'PastDue', graceEndsAt: '2026-11-10T00:00:00Z' }))).toEqual({ kind: 'graceEnds', at: '2026-11-10T00:00:00Z' })
    expect(keyDate(sub({ status: 'PendingPayment' }))).toBeNull()
  })

  it('counts days to a date', () => {
    const now = Date.parse('2026-11-07T12:00:00Z')
    expect(daysUntil('2026-11-10T12:00:00Z', now)).toBe(3)
    expect(daysUntil('2026-11-06T12:00:00Z', now)).toBe(-1)
  })

  it('offers the wallet when its balance covers a pending invoice', () => {
    expect(canPayFromWallet({ walletAvailableAmount: 120 }, { amount: 99, status: 'Pending' })).toBe(true)
    expect(canPayFromWallet({ walletAvailableAmount: 50 }, { amount: 99, status: 'Pending' })).toBe(false)
    expect(canPayFromWallet({ walletAvailableAmount: null }, { amount: 99, status: 'Pending' })).toBe(false)
    expect(canPayFromWallet({ walletAvailableAmount: 500 }, { amount: 99, status: 'Paid' })).toBe(false)
  })

  it('reads the error data of WalletBalanceInsufficient and CounterBranchLimitReached', () => {
    expect(walletShortfall({ available: 40, amount: 99 })).toBe(59)
    expect(walletShortfall(undefined)).toBeNull()
    expect(branchLimit({ allowed: 2, used: 2 })).toEqual({ allowed: 2, used: 2 })
    expect(branchLimit({ allowed: 'x' })).toBeNull()
  })
})
