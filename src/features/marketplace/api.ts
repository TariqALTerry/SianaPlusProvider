import type { QueryClient } from '@tanstack/react-query'
import { http } from '@/api/http'
import { qk } from '@/api/keys'
import type {
  ListParams,
  PaginatedResponse,
  ProviderMarketplaceListRequest,
  ProviderMarketplaceRequestResponse,
  ProviderOfferListRequest,
  ProviderOfferResponse,
  SubmitMarketplaceOfferRequest,
} from '@/api/types'

/**
 * Tenders (§8.8). Every call can answer `MarketplaceNotEnabled` (403); the server also refuses
 * reads and writes with `ProviderNotOperational` once the organization can no longer operate.
 * The offer writes all return the refreshed request (with `myOffer`).
 */
const base = '/api/provider/marketplace'

export type TenderListParams = ListParams<ProviderMarketplaceListRequest>
export type OfferListParams = ListParams<ProviderOfferListRequest>

export const marketplaceApi = {
  requests: (params: TenderListParams, signal?: AbortSignal) =>
    http.get<PaginatedResponse<ProviderMarketplaceRequestResponse>>(`${base}/requests`, params, signal),
  request: (id: string, signal?: AbortSignal) => http.get<ProviderMarketplaceRequestResponse>(`${base}/requests/${id}`, undefined, signal),
  submitOffer: (id: string, body: SubmitMarketplaceOfferRequest) => http.post<ProviderMarketplaceRequestResponse>(`${base}/requests/${id}/offer`, body),
  updateOffer: (id: string, body: SubmitMarketplaceOfferRequest) => http.put<ProviderMarketplaceRequestResponse>(`${base}/requests/${id}/offer`, body),
  withdrawOffer: (id: string) => http.delete<ProviderMarketplaceRequestResponse>(`${base}/requests/${id}/offer`),
  offers: (params: OfferListParams, signal?: AbortSignal) => http.get<PaginatedResponse<ProviderOfferResponse>>(`${base}/offers`, params, signal),
}

export const marketplaceKeys = {
  requests: (params: TenderListParams) => [...qk.marketplace, 'requests', params] as const,
  request: (id: string) => [...qk.marketplace, 'request', id] as const,
  offers: (params: OfferListParams) => [...qk.marketplace, 'offers', params] as const,
}

export function prefetchTender(queryClient: QueryClient, id: string) {
  return queryClient.prefetchQuery({
    queryKey: marketplaceKeys.request(id),
    queryFn: ({ signal }) => marketplaceApi.request(id, signal),
    staleTime: 30_000,
  })
}

/** An offer write changes the tender, the open list (my-offer badge, count) and my offers. */
export const offerActionInvalidation = [qk.marketplace] as const
