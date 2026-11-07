import { http } from '@/api/http'
import { qk } from '@/api/keys'
import type {
  BranchTransferListRequest,
  BranchTransferResponse,
  BranchTransferScanRequest,
  CashCloseHistoryRequest,
  CashClosePreviewResponse,
  CashCloseResponse,
  CloseCashRequest,
  CounterItemDetailResponse,
  CounterWarrantyClaimRequest,
  CounterWarrantyLookupRequest,
  CounterWarrantyLookupResponse,
  CreateBranchTransferRequest,
  ListParams,
  PaginatedResponse,
} from '@/api/types'

const base = '/api/provider/counter'

export type TransferListParams = ListParams<BranchTransferListRequest>
export type CashHistoryParams = ListParams<CashCloseHistoryRequest>

/**
 * `BranchOperationsController` (PROVIDER-BRANCHES-PROVIDER-PLATFORM-PROMPT phase 5 §5–§7): transfers between branches,
 * counter warranty claims and the daily cash close. Owner, supervisors and the front desk, within their branches; the
 * service refuses what is an owner's or supervisor's only (create / cancel a transfer, goodwill, reopening a day).
 */
export const branchOpsApi = {
  transfers: (params: TransferListParams, signal?: AbortSignal) => http.get<PaginatedResponse<BranchTransferResponse>>(`${base}/transfers`, params, signal),
  transfer: (id: string, signal?: AbortSignal) => http.get<BranchTransferResponse>(`${base}/transfers/${id}`, undefined, signal),
  /** Owner or supervisor. Every device of the service moves; one open transfer per service. */
  createTransfer: (body: CreateBranchTransferRequest) => http.post<BranchTransferResponse>(`${base}/transfers`, body),
  /** From a source branch: the devices go InTransit. A scanned `code` must match the label. */
  sendTransfer: (id: string, body: BranchTransferScanRequest) => http.post<BranchTransferResponse>(`${base}/transfers/${id}/send`, body),
  /** At the destination: the devices are there now. */
  receiveTransfer: (id: string, body: BranchTransferScanRequest) => http.post<BranchTransferResponse>(`${base}/transfers/${id}/receive`, body),
  /** Owner or supervisor, with a reason. In transit, the devices go back to the source. */
  cancelTransfer: (id: string, reason: string) => http.post<BranchTransferResponse>(`${base}/transfers/${id}/cancel`, { reason }),

  /** Every branch of the organization: the customer may come back to any of them. */
  lookupWarranty: (params: CounterWarrantyLookupRequest, signal?: AbortSignal) => http.get<CounterWarrantyLookupResponse>(`${base}/warranties/lookup`, params, signal),
  /** Returns the NEW counter item (a new receipt): upload two photos and print next. */
  claimWarranty: (warrantyId: string, body: CounterWarrantyClaimRequest) => http.post<CounterItemDetailResponse>(`${base}/warranties/${warrantyId}/claim`, body),

  cashPreview: (branchId: string, date: string | null, signal?: AbortSignal) => http.get<CashClosePreviewResponse>(`${base}/cash-close`, { branchId, date }, signal),
  closeCash: (body: CloseCashRequest) => http.post<CashCloseResponse>(`${base}/cash-close`, body),
  /** The owner only (`CashCloseReopenNotAllowed`). */
  reopenCash: (id: string, reason: string) => http.post<CashCloseResponse>(`${base}/cash-close/${id}/reopen`, { reason }),
  cashHistory: (params: CashHistoryParams, signal?: AbortSignal) => http.get<PaginatedResponse<CashCloseResponse>>(`${base}/cash-close/history`, params, signal),
}

export const branchOpsKeys = {
  transfers: (params: TransferListParams) => [...qk.transfers, 'list', params] as const,
  transfer: (id: string) => [...qk.transfers, 'detail', id] as const,
  warranty: (params: CounterWarrantyLookupRequest) => [...qk.counter, 'warranty', params] as const,
  cashPreview: (branchId: string, date: string | null) => [...qk.cashClose, 'preview', branchId, date ?? 'today'] as const,
  cashHistory: (params: CashHistoryParams) => [...qk.cashClose, 'history', params] as const,
}

/** A transfer moves devices: the counter lists and board, the shelf and the work list change with it. */
export const TRANSFER_INVALIDATION = [qk.transfers, qk.counter, qk.workshop, qk.work] as const
