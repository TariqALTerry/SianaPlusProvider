import { http } from '@/api/http'
import { qk } from '@/api/keys'
import type {
  BankAccountDetailResponse,
  ListParams,
  PaginatedResponse,
  UpdateBankAccountRequest,
  WalletItemResponse,
  WalletItemsRequest,
  WalletResponse,
  WithdrawalListRequest,
  WithdrawalResponse,
} from '@/api/types'

/** `api/provider/wallet` (PROVIDER-PLATFORM-PHASE2-PROMPT §1): bank account and withdrawals are owner-only. */
const base = '/api/provider/wallet'

export const walletApi = {
  summary: (signal?: AbortSignal) => http.get<WalletResponse>(base, undefined, signal),
  items: (params: ListParams<WalletItemsRequest>, signal?: AbortSignal) => http.get<PaginatedResponse<WalletItemResponse>>(`${base}/items`, params, signal),
  /** The full IBAN, to prefill the edit form (owner). */
  bankAccount: (signal?: AbortSignal) => http.get<BankAccountDetailResponse>(`${base}/bank-account`, undefined, signal),
  saveBankAccount: (body: UpdateBankAccountRequest) => http.put<WalletResponse>(`${base}/bank-account`, body),
  /** Withdraws everything available at once (owner). */
  withdraw: (note: string | null) => http.post<WithdrawalResponse>(`${base}/withdrawals`, { note }),
  withdrawals: (params: ListParams<WithdrawalListRequest>, signal?: AbortSignal) =>
    http.get<PaginatedResponse<WithdrawalResponse>>(`${base}/withdrawals`, params, signal),
  /** Only while `Requested`; the amount returns to available. */
  cancel: (id: string) => http.post<WithdrawalResponse>(`${base}/withdrawals/${id}/cancel`),
}

export const walletKeys = {
  summary: [...qk.wallet, 'summary'] as const,
  items: (params: object) => [...qk.wallet, 'items', params] as const,
  bankAccount: [...qk.wallet, 'bank-account'] as const,
  withdrawals: (params: object) => [...qk.wallet, 'withdrawals', params] as const,
}

/** Every wallet write changes the tiles, the lists and the withdrawals. */
export const walletInvalidation = [qk.wallet] as const
