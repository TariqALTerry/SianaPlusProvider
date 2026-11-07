import { useQuery } from '@tanstack/react-query'
import { http } from '@/api/http'
import { qk } from '@/api/keys'
import { listQueryOptions, LOOKUP_STALE_TIME } from '@/api/queryClient'
import type {
  ChangeCounterSubscriptionRequest,
  CounterInvoiceListRequest,
  CounterInvoiceResponse,
  CounterPlanResponse,
  ListParams,
  PaginatedResponse,
  ProviderSubscriptionOverviewResponse,
  StartCounterSubscriptionRequest,
} from '@/api/types'

const base = '/api/provider/subscription'

/**
 * `ProviderSubscriptionController` (PROVIDER-BRANCHES-PROVIDER-PLATFORM-PROMPT phase 3 §3–§4). The owner and supervisors
 * read; every write is the owner's (`OwnerOnly`). A front-desk account reaches none of it.
 */
export const subscriptionApi = {
  overview: (signal?: AbortSignal) => http.get<ProviderSubscriptionOverviewResponse>(base, undefined, signal),
  /** The plans on offer now, in order. Works before approval too (for a "counter only" shop to look at). */
  plans: (signal?: AbortSignal) => http.get<CounterPlanResponse[]>(`${base}/plans`, undefined, signal),
  subscribe: (body: StartCounterSubscriptionRequest) => http.post<ProviderSubscriptionOverviewResponse>(base, body),
  /** From the next period (immediate while `PendingPayment`); the same terms again withdraw a waiting change. */
  change: (body: ChangeCounterSubscriptionRequest) => http.post<ProviderSubscriptionOverviewResponse>(`${base}/change`, body),
  cancel: () => http.post<ProviderSubscriptionOverviewResponse>(`${base}/cancel`),
  resume: () => http.post<ProviderSubscriptionOverviewResponse>(`${base}/resume`),
  setAutoPay: (enabled: boolean) => http.put<ProviderSubscriptionOverviewResponse>(`${base}/auto-pay`, { enabled }),
  invoices: (params: ListParams<CounterInvoiceListRequest>, signal?: AbortSignal) =>
    http.get<PaginatedResponse<CounterInvoiceResponse>>(`${base}/invoices`, params, signal),
  invoice: (id: string, signal?: AbortSignal) => http.get<CounterInvoiceResponse>(`${base}/invoices/${id}`, undefined, signal),
  /** Wallet only for now: `WalletBalanceInsufficient` carries `{ available, amount }`. */
  payFromWallet: (id: string) => http.post<CounterInvoiceResponse>(`${base}/invoices/${id}/pay`, { method: 'WalletDeduction' }),
  /** The transfer receipt (image or PDF) and the operation number; the invoice stays Pending until the platform confirms. */
  submitTransferProof: (id: string, file: File, reference: string | null) =>
    http.form<CounterInvoiceResponse>(`${base}/invoices/${id}/transfer-proof`, { reference }, file),
}

export const subscriptionKeys = {
  overview: () => [...qk.subscription, 'overview'] as const,
  plans: () => [...qk.subscription, 'plans'] as const,
  invoices: (params: object) => [...qk.subscription, 'invoices', params] as const,
  invoice: (id: string) => [...qk.subscription, 'invoice', id] as const,
}

/** A subscription write changes the overview, the invoices, the wallet (a deduction) and the organization's status. */
export const SUBSCRIPTION_INVALIDATION = [qk.subscription, qk.wallet, qk.organization] as const

/** The live gate and the plan: `counterAvailable` / `counterBlockedReason` decide whether a new intake is possible. */
export function useSubscriptionOverview(enabled = true) {
  return useQuery({ queryKey: subscriptionKeys.overview(), queryFn: ({ signal }) => subscriptionApi.overview(signal), enabled, refetchOnWindowFocus: true })
}

export function usePlans(enabled = true) {
  return useQuery({ queryKey: subscriptionKeys.plans(), queryFn: ({ signal }) => subscriptionApi.plans(signal), enabled, staleTime: LOOKUP_STALE_TIME })
}

export function useInvoices(params: ListParams<CounterInvoiceListRequest>, enabled = true) {
  return useQuery({ queryKey: subscriptionKeys.invoices(params), queryFn: ({ signal }) => subscriptionApi.invoices(params, signal), enabled, ...listQueryOptions })
}
