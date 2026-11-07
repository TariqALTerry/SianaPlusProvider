import { useQuery } from '@tanstack/react-query'
import { http } from '@/api/http'
import { qk } from '@/api/keys'
import { LOOKUP_STALE_TIME } from '@/api/queryClient'
import type {
  AdjustBranchStockRequest,
  CreateSupplierReturnRequest,
  InventorySettingsResponse,
  ListParams,
  PaginatedResponse,
  PartListRequest,
  PartResponse,
  ReceiveStockRequest,
  SavePartRequest,
  SavePartSupplierRequest,
  StockChangeResponse,
  StockListRequest,
  StockMovementListRequest,
  StockMovementResponse,
  StockRowResponse,
  SupplierListRequest,
  SupplierResponse,
  SupplierReturnListRequest,
  SupplierReturnResponse,
  SupplierReturnStatusRequest,
  TransferStockRequest,
  UpdateInventorySettingsRequest,
  UpdateSupplierReturnRequest,
} from '@/api/types'

const base = '/api/provider/inventory'

export type PartListParams = ListParams<PartListRequest>
export type SupplierListParams = ListParams<SupplierListRequest>
export type StockListParams = ListParams<StockListRequest>
export type MovementListParams = ListParams<StockMovementListRequest>
export type ReturnListParams = ListParams<SupplierReturnListRequest>

/**
 * `ProviderInventoryController` (PROVIDER-BRANCHES-PROVIDER-PLATFORM-PROMPT phase 6): workshop parts per branch, not the
 * store's stock. Reads for the owner, supervisors and the front desk (their branches; costs `null` for the front desk);
 * writes for the owner and supervisors; the settings' PUT is the owner's.
 */
export const inventoryApi = {
  parts: (params: PartListParams, signal?: AbortSignal) => http.get<PaginatedResponse<PartResponse>>(`${base}/parts`, params, signal),
  part: (id: string, signal?: AbortSignal) => http.get<PartResponse>(`${base}/parts/${id}`, undefined, signal),
  /** `PartSkuTaken`, `PartSkuRequired`, `PartNameRequired`, `PartPriceInvalid`, `PartWarrantyDaysInvalid`, …. */
  createPart: (body: SavePartRequest) => http.post<PartResponse>(`${base}/parts`, body),
  /** A full replace; no delete (stop it with `isActive: false`). */
  updatePart: (id: string, body: SavePartRequest) => http.put<PartResponse>(`${base}/parts/${id}`, body),

  suppliers: (params: SupplierListParams, signal?: AbortSignal) => http.get<PaginatedResponse<SupplierResponse>>(`${base}/suppliers`, params, signal),
  createSupplier: (body: SavePartSupplierRequest) => http.post<SupplierResponse>(`${base}/suppliers`, body),
  updateSupplier: (id: string, body: SavePartSupplierRequest) => http.put<SupplierResponse>(`${base}/suppliers/${id}`, body),

  /** A part has a row in a branch after its first movement there; no row = zero. */
  stock: (params: StockListParams, signal?: AbortSignal) => http.get<PaginatedResponse<StockRowResponse>>(`${base}/stock`, params, signal),
  /** Active parts with `available ≤ reorderLevel`, the shortest first (up to 200). */
  lowStock: (branchId: string | undefined, signal?: AbortSignal) => http.get<StockRowResponse[]>(`${base}/low-stock`, { branchId }, signal),
  /** Moves the average cost. `SupplierNotFound`, `SupplierInactive`, `PartInactive`. */
  receive: (body: ReceiveStockRequest) => http.post<StockChangeResponse>(`${base}/stock/receive`, body),
  /** `StockAdjustQuantityRequired`, `StockAdjustNoChange`, `StockInsufficient`, `StockNegativeOverrideNotAllowed`. */
  adjust: (body: AdjustBranchStockRequest) => http.post<StockChangeResponse>(`${base}/stock/adjust`, body),
  /** Immediate, no courier: TransferOut + TransferIn at the source's cost. `StockTransferSameBranch`, `StockInsufficient`. */
  transfer: (body: TransferStockRequest) => http.post<StockChangeResponse>(`${base}/stock/transfer`, body),

  movements: (params: MovementListParams, signal?: AbortSignal) => http.get<PaginatedResponse<StockMovementResponse>>(`${base}/movements`, params, signal),

  supplierReturns: (params: ReturnListParams, signal?: AbortSignal) => http.get<PaginatedResponse<SupplierReturnResponse>>(`${base}/supplier-returns`, params, signal),
  createSupplierReturn: (body: CreateSupplierReturnRequest) => http.post<SupplierReturnResponse>(`${base}/supplier-returns`, body),
  /** Drafts only (`SupplierReturnNotEditable`). */
  updateSupplierReturn: (id: string, body: UpdateSupplierReturnRequest) => http.put<SupplierReturnResponse>(`${base}/supplier-returns/${id}`, body),
  /** `SupplierReturnTransitionInvalid`, `SupplierReturnSupplierRequired`, `StockInsufficient`. */
  setSupplierReturnStatus: (id: string, body: SupplierReturnStatusRequest) => http.post<SupplierReturnResponse>(`${base}/supplier-returns/${id}/status`, body),

  settings: (signal?: AbortSignal) => http.get<InventorySettingsResponse>(`${base}/settings`, undefined, signal),
  updateSettings: (body: UpdateInventorySettingsRequest) => http.put<InventorySettingsResponse>(`${base}/settings`, body),
}

export const inventoryKeys = {
  parts: (params: PartListParams) => [...qk.inventory, 'parts', params] as const,
  part: (id: string) => [...qk.inventory, 'part', id] as const,
  partOptions: (search: string) => [...qk.inventory, 'parts', 'options', search] as const,
  suppliers: (params: SupplierListParams) => [...qk.inventory, 'suppliers', params] as const,
  supplierOptions: () => [...qk.inventory, 'suppliers', 'options'] as const,
  stock: (params: StockListParams) => [...qk.inventory, 'stock', params] as const,
  lowStock: (branchId?: string) => [...qk.inventory, 'low-stock', branchId ?? 'all'] as const,
  movements: (params: MovementListParams) => [...qk.inventory, 'movements', params] as const,
  returns: (params: ReturnListParams) => [...qk.inventory, 'returns', params] as const,
  settings: () => [...qk.inventory, 'settings'] as const,
}

/** Every inventory write changes stock, movements, low stock and the counts on parts: refresh the whole section. */
export const INVENTORY_INVALIDATION = [qk.inventory] as const

/** Active parts for a picker, searched on the server (SKU, names, brand, models; barcode exact). */
export function usePartOptions(search: string, enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.partOptions(search),
    queryFn: ({ signal }) => inventoryApi.parts({ search: search || undefined, isActive: true, page: 1, pageSize: 50 }, signal),
    enabled,
    staleTime: 60_000,
  })
}

/** Active suppliers for a picker (a shop has a handful). */
export function useSupplierOptions(enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.supplierOptions(),
    queryFn: ({ signal }) => inventoryApi.suppliers({ isActive: true, page: 1, pageSize: 100 }, signal),
    enabled,
    staleTime: LOOKUP_STALE_TIME,
  })
}
