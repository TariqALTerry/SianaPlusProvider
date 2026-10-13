import type { QueryClient } from '@tanstack/react-query'
import { http } from '@/api/http'
import { qk } from '@/api/keys'
import type {
  CreateStoreProductRequest,
  ListParams,
  PaginatedResponse,
  ServiceCardResponse,
  ServiceDetailResponse,
  StoreProductListRequest,
  StoreProductResponse,
  UpdateStoreProductRequest,
} from '@/api/types'

/**
 * The organization's own store products (§8.13). Every call can answer `StoreModuleDisabled`,
 * and the server refuses them all with `ProviderNotOperational` once the organization can't operate.
 */
const base = '/api/provider/store/products'

/** `status`: omitted = active only, `All`, or `Inactive`. The provider endpoint ignores `providerOrganizationId`. */
export type StoreProductListParams = Omit<ListParams<StoreProductListRequest>, 'providerOrganizationId'>

export const storeApi = {
  list: (params: StoreProductListParams, signal?: AbortSignal) => http.get<PaginatedResponse<StoreProductResponse>>(base, params, signal),
  detail: (id: string, signal?: AbortSignal) => http.get<StoreProductResponse>(`${base}/${id}`, undefined, signal),
  create: (body: CreateStoreProductRequest) => http.post<StoreProductResponse>(base, body),
  update: (id: string, body: UpdateStoreProductRequest) => http.put<StoreProductResponse>(`${base}/${id}`, body),
  setActive: (id: string, isActive: boolean) => http.patch<StoreProductResponse>(`${base}/${id}/active`, { isActive }),
  uploadImage: (id: string, file: File) => http.upload<StoreProductResponse>(`${base}/${id}/image`, file),
  adjustStock: (id: string, delta: number) => http.patch<StoreProductResponse>(`${base}/${id}/stock`, { delta }),
}

/**
 * The public catalog (shared group, anonymous): free-text service search (`?q=`, required, at most
 * 20 results, no paging) and one service — used to name a product's linked services.
 */
export const catalogApi = {
  searchServices: (q: string, signal?: AbortSignal) => http.get<ServiceCardResponse[]>('/api/catalog/services/search', { q }, signal),
  service: (id: string, signal?: AbortSignal) => http.get<ServiceDetailResponse>(`/api/catalog/services/${id}`, undefined, signal),
}

export const storeKeys = {
  list: (params: StoreProductListParams) => [...qk.store, 'products', 'list', params] as const,
  detail: (id: string) => [...qk.store, 'products', 'detail', id] as const,
}

export const catalogKeys = {
  search: (q: string) => [...qk.catalog, 'services-search', q] as const,
  service: (id: string) => [...qk.catalog, 'service', id] as const,
}

export function prefetchProduct(queryClient: QueryClient, id: string) {
  return queryClient.prefetchQuery({
    queryKey: storeKeys.detail(id),
    queryFn: ({ signal }) => storeApi.detail(id, signal),
    staleTime: 30_000,
  })
}

/** Product writes touch only the product keys (detail + lists). */
export const productActionInvalidation = [qk.store] as const
