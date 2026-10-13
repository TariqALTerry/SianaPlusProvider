import type { QueryClient } from '@tanstack/react-query'
import { http } from '@/api/http'
import { qk } from '@/api/keys'
import type { DisputeResponse, ListParams, PaginatedResponse, ProviderDisputeListRequest } from '@/api/types'

/** Read-only (§8.12): complaints on the organization's items; the platform handles them. */
const base = '/api/provider/disputes'

export type DisputeListParams = ListParams<ProviderDisputeListRequest>

export const disputesApi = {
  list: (params: DisputeListParams, signal?: AbortSignal) => http.get<PaginatedResponse<DisputeResponse>>(base, params, signal),
  /** The provider endpoint returns the plain `DisputeResponse` (no timeline or parties). */
  detail: (id: string, signal?: AbortSignal) => http.get<DisputeResponse>(`${base}/${id}`, undefined, signal),
}

export const disputeKeys = {
  list: (params: DisputeListParams) => [...qk.disputes, 'list', params] as const,
  detail: (id: string) => [...qk.disputes, 'detail', id] as const,
}

export function prefetchDispute(queryClient: QueryClient, id: string) {
  return queryClient.prefetchQuery({
    queryKey: disputeKeys.detail(id),
    queryFn: ({ signal }) => disputesApi.detail(id, signal),
    staleTime: 30_000,
  })
}
