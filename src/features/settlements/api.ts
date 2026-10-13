import type { QueryClient } from '@tanstack/react-query'
import { http } from '@/api/http'
import { qk } from '@/api/keys'
import type {
  ListParams,
  PaginatedResponse,
  ProviderSettlementListRequest,
  ProviderSettlementSummaryResponse,
  SettlementDetailResponse,
  SettlementResponse,
} from '@/api/types'

/** Read-only (§8.10): the platform creates and pays settlements. */
const base = '/api/provider/settlements'

export type SettlementListParams = ListParams<ProviderSettlementListRequest>

export const settlementsApi = {
  list: (params: SettlementListParams, signal?: AbortSignal) => http.get<PaginatedResponse<SettlementResponse>>(base, params, signal),
  summary: (signal?: AbortSignal) => http.get<ProviderSettlementSummaryResponse>(`${base}/summary`, undefined, signal),
  detail: (id: string, signal?: AbortSignal) => http.get<SettlementDetailResponse>(`${base}/${id}`, undefined, signal),
}

export const settlementKeys = {
  list: (params: SettlementListParams) => [...qk.settlements, 'list', params] as const,
  summary: () => [...qk.settlements, 'summary'] as const,
  detail: (id: string) => [...qk.settlements, 'detail', id] as const,
}

export function prefetchSettlement(queryClient: QueryClient, id: string) {
  return queryClient.prefetchQuery({
    queryKey: settlementKeys.detail(id),
    queryFn: ({ signal }) => settlementsApi.detail(id, signal),
    staleTime: 30_000,
  })
}
