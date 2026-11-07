import type {
  CounterInvoiceResponse,
  CounterPlanResponse,
  ProviderSubscriptionOverviewResponse,
  ProviderSubscriptionResponse,
  ProviderSubscriptionStatus,
  SubscriptionBillingCycle,
} from '@/api/types'

/**
 * The price of one period, for display only (phase 3 §3): the cycle's price plus the extra branches at their monthly
 * price (×12 for a year). The invoice is the reference.
 */
export function periodPrice(plan: Pick<CounterPlanResponse, 'monthlyPrice' | 'yearlyPrice' | 'extraBranchMonthlyPrice'>, cycle: SubscriptionBillingCycle, extraBranches: number): number {
  const base = cycle === 'Yearly' ? plan.yearlyPrice : plan.monthlyPrice
  const extra = Math.max(0, Math.floor(extraBranches)) * plan.extraBranchMonthlyPrice * (cycle === 'Yearly' ? 12 : 1)
  return Math.round((base + extra) * 100) / 100
}

/** What a year costs against twelve months, when the yearly price is lower (shown as a saving). */
export function yearlySaving(plan: Pick<CounterPlanResponse, 'monthlyPrice' | 'yearlyPrice'>): number {
  return Math.max(0, Math.round((plan.monthlyPrice * 12 - plan.yearlyPrice) * 100) / 100)
}

export const EXTRA_BRANCHES_MAX = 500

/** A plan, cycle or extra-branch change is accepted while the subscription runs or waits for its first payment. */
export function isChangeable(status: ProviderSubscriptionStatus): boolean {
  return status === 'Trial' || status === 'Active' || status === 'PastDue' || status === 'PendingPayment'
}

/** Cancel: at the period end in Trial / Active (unless already set), at once in PendingPayment / PastDue. */
export function canCancel(sub: Pick<ProviderSubscriptionResponse, 'status' | 'cancelAtPeriodEnd'>): boolean {
  if (sub.status === 'Trial' || sub.status === 'Active') return !sub.cancelAtPeriodEnd
  return sub.status === 'PendingPayment' || sub.status === 'PastDue'
}

export function cancelsAtOnce(status: ProviderSubscriptionStatus): boolean {
  return status === 'PendingPayment' || status === 'PastDue'
}

/** Resume undoes a cancel-at-period-end, in Trial / Active only. */
export function canResume(sub: Pick<ProviderSubscriptionResponse, 'status' | 'cancelAtPeriodEnd'>): boolean {
  return sub.cancelAtPeriodEnd && (sub.status === 'Trial' || sub.status === 'Active')
}

/** Expired or cancelled: subscribe again (a new subscription). */
export function isEnded(status: ProviderSubscriptionStatus): boolean {
  return status === 'Expired' || status === 'Cancelled'
}

/**
 * The date that matters for the status line (phase 3 §5): the trial end, the period end, the grace end while past due;
 * none while waiting for the first payment (there is no period yet).
 */
export function keyDate(sub: Pick<ProviderSubscriptionResponse, 'status' | 'trialEndsAt' | 'currentPeriodEndsAt' | 'graceEndsAt' | 'cancelledAt'>): { kind: 'trialEnds' | 'periodEnds' | 'graceEnds' | 'cancelledAt'; at: string } | null {
  switch (sub.status) {
    case 'Trial':
      return sub.trialEndsAt ? { kind: 'trialEnds', at: sub.trialEndsAt } : null
    case 'Active':
      return { kind: 'periodEnds', at: sub.currentPeriodEndsAt }
    case 'PastDue':
      return sub.graceEndsAt ? { kind: 'graceEnds', at: sub.graceEndsAt } : null
    case 'Cancelled':
      return sub.cancelledAt ? { kind: 'cancelledAt', at: sub.cancelledAt } : null
    default:
      return null
  }
}

/** Whole days from now until a date (negative when past), for the trial countdown. */
export function daysUntil(iso: string, now = Date.now()): number {
  return Math.ceil((Date.parse(iso) - now) / 86_400_000)
}

/** Show "pay from wallet" when the available balance covers the invoice; the server still decides. */
export function canPayFromWallet(overview: Pick<ProviderSubscriptionOverviewResponse, 'walletAvailableAmount'>, invoice: Pick<CounterInvoiceResponse, 'amount' | 'status'>): boolean {
  return invoice.status === 'Pending' && overview.walletAvailableAmount !== null && overview.walletAvailableAmount >= invoice.amount
}

/** `WalletBalanceInsufficient` carries `{ available, amount }`: the shortfall to show. */
export function walletShortfall(details: unknown): number | null {
  if (!details || typeof details !== 'object') return null
  const d = details as { available?: unknown; amount?: unknown }
  const available = Number(d.available)
  const amount = Number(d.amount)
  if (!Number.isFinite(available) || !Number.isFinite(amount)) return null
  return Math.max(0, Math.round((amount - available) * 100) / 100)
}

/** `CounterBranchLimitReached` carries `{ allowed, used }`. */
export function branchLimit(details: unknown): { allowed: number; used: number } | null {
  if (!details || typeof details !== 'object') return null
  const d = details as { allowed?: unknown; used?: unknown }
  const allowed = Number(d.allowed)
  const used = Number(d.used)
  return Number.isFinite(allowed) && Number.isFinite(used) ? { allowed, used } : null
}
