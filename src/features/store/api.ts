import type { QueryClient } from '@tanstack/react-query'
import { i18next } from '@/i18n'
import { ApiError, http, toApiError } from '@/api/http'
import { qk } from '@/api/keys'
import type {
  CreateStoreProductRequest,
  ListParams,
  PaginatedResponse,
  ServiceCardResponse,
  ServiceDetailResponse,
  StoreCategoryResponse,
  StoreProductAiDraftRequest,
  StoreProductDraftResponse,
  StoreProductImageResponse,
  StoreProductListRequest,
  StoreProductResponse,
  UpdateStoreProductRequest,
} from '@/api/types'

/**
 * The organization's own smart-store products (SMART-STORE-PROVIDER-PLATFORM-PROMPT). Every call can
 * answer `StoreModuleDisabled` or `ProviderNotOperational` (403); `http.ts` refetches the
 * organization for both, and the pages show "المتجر غير متاح".
 */
const productsBase = '/api/provider/store/products'
const imagesBase = '/api/provider/store/images'
const categoriesBase = '/api/provider/store/categories'

/** `status`: omitted = active only, `Inactive`, or `All`. The provider endpoint has no provider filter. */
export type StoreProductListParams = Omit<ListParams<StoreProductListRequest>, 'providerOrganizationId'>

/** Low-stock threshold (§3.1): at or below this the list shows "منخفض". */
export const LOW_STOCK_THRESHOLD = 5

/** The AI draft is one model call with the pictures; it can take well over the 30 s default. */
const AI_DRAFT_TIMEOUT_MS = 120_000

/** Codes after which the store can't be used at all (§2): the page shows "المتجر غير متاح". */
export const STORE_GATE_CODES = ['StoreModuleDisabled', 'ProviderNotOperational'] as const

/**
 * Error codes of the store endpoints (§4.5), worded here (`store:errors.<code>`) so every section
 * shows the same text in the user's language.
 */
export const STORE_ERROR_CODES = [
  'StoreModuleDisabled',
  'ProviderNotOperational',
  'StoreProductNotFound',
  'ProductNotReadyForSale',
  'StoreCategoryNotLeaf',
  'StoreCategoryNotFound',
  'StoreImageIdsInvalid',
  'StoreImageNotFound',
  'ProductImageTypeNotAllowed',
  'FileTooLarge',
  'StoreOptionsInvalid',
  'StoreVariantsRequired',
  'StoreVariantsInvalid',
  'StoreVariantNotFound',
  'CompareAtPriceInvalid',
  'ProductPriceInvalid',
  'StoreProductContentInvalid',
  'KeywordsTooLong',
  'StoreUseVariantStock',
  'InsufficientStock',
  'StockDeltaRequired',
  'ProductSkuExists',
  'InstallationServiceRequired',
  'CanonicalServiceNotFound',
  'StoreAiUnavailable',
  'StoreAiDraftFailed',
  'StoreAiDraftImagesInvalid',
  'StoreAiHintTooLong',
] as const

export type StoreErrorCode = (typeof STORE_ERROR_CODES)[number]

/** `ProductNotReadyForSale`'s `data.missing[]`, kept beside the worded error (dialogs show the message only). */
const missingByError = new WeakMap<ApiError, string[]>()

async function worded<T>(request: Promise<T>): Promise<T> {
  try {
    return await request
  } catch (error) {
    const e = toApiError(error)
    if (!e.errorCode || !(STORE_ERROR_CODES as readonly string[]).includes(e.errorCode)) throw error
    const details = (e.details ?? {}) as { available?: number; missing?: unknown }
    const worded = new ApiError({
      status: e.status,
      errorCode: e.errorCode,
      message: i18next.t(`store:errors.${e.errorCode}`, { available: details.available ?? 0 }),
      // The stock dialog shows the live `available`; other data is already in the wording.
      details: e.errorCode === 'InsufficientStock' ? e.details : undefined,
    })
    if (Array.isArray(details.missing)) missingByError.set(worded, details.missing.filter((m): m is string => typeof m === 'string'))
    throw worded
  }
}

/** The error code of a failed call, or null. */
export function errorCodeOf(error: unknown): string | null {
  return error ? toApiError(error).errorCode : null
}

/** `StoreModuleDisabled` / `ProviderNotOperational`: show "المتجر غير متاح". */
export function isStoreGateError(error: unknown): boolean {
  return (STORE_GATE_CODES as readonly (string | null)[]).includes(errorCodeOf(error))
}

/** `ProductNotReadyForSale` carries `data.missing[]`: the checklist items to highlight. */
export function missingOf(error: unknown): string[] {
  if (!error) return []
  const e = toApiError(error)
  return e.errorCode === 'ProductNotReadyForSale' ? missingByError.get(e) ?? [] : []
}

export const storeProductsApi = {
  list: (params: StoreProductListParams, signal?: AbortSignal) => worded(http.get<PaginatedResponse<StoreProductResponse>>(productsBase, params, signal)),
  detail: (id: string, signal?: AbortSignal) => worded(http.get<StoreProductResponse>(`${productsBase}/${id}`, undefined, signal)),
  /** Saved as a draft (inactive) unless nothing is missing for sale. */
  create: (body: CreateStoreProductRequest) => worded(http.post<StoreProductResponse>(productsBase, body)),
  update: (id: string, body: UpdateStoreProductRequest) => worded(http.put<StoreProductResponse>(`${productsBase}/${id}`, body)),
  setActive: (id: string, isActive: boolean) => worded(http.patch<StoreProductResponse>(`${productsBase}/${id}/active`, { isActive })),
  /** Simple products only (`StoreUseVariantStock` otherwise). */
  adjustStock: (id: string, delta: number) => worded(http.patch<StoreProductResponse>(`${productsBase}/${id}/stock`, { delta })),
  adjustVariantStock: (id: string, variantId: string, delta: number) =>
    worded(http.patch<StoreProductResponse>(`${productsBase}/${id}/variants/${variantId}/stock`, { delta })),
  /** A filled form to review; nothing is saved. */
  aiDraft: (body: StoreProductAiDraftRequest) =>
    worded(http.post<StoreProductDraftResponse>(`${productsBase}/ai-draft`, body, { timeout: AI_DRAFT_TIMEOUT_MS })),
}

export const storeImagesApi = {
  /** Staged until a product save lists it in `imageIds`; the job templates it within a minute or so. */
  upload: (file: File, cleanWithAi: boolean) => worded(http.form<StoreProductImageResponse>(imagesBase, { cleanWithAi: String(cleanWithAi) }, file)),
  detail: (id: string, signal?: AbortSignal) => worded(http.get<StoreProductImageResponse>(`${imagesBase}/${id}`, undefined, signal)),
  reprocess: (id: string, cleanWithAi: boolean) => worded(http.post<StoreProductImageResponse>(`${imagesBase}/${id}/reprocess`, { cleanWithAi })),
}

export const storeCategoriesApi = {
  /** Active sections with their active categories (`productsCount` is always 0 here: never shown). */
  tree: (signal?: AbortSignal) => worded(http.get<StoreCategoryResponse[]>(categoriesBase, undefined, signal)),
}

/**
 * The public catalog (shared group, anonymous): free-text service search (`?q=`, required, at most
 * 20 results, no paging) and one service — used to pick and name a product's linked services.
 */
export const catalogApi = {
  searchServices: (q: string, signal?: AbortSignal) => http.get<ServiceCardResponse[]>('/api/catalog/services/search', { q }, signal),
  service: (id: string, signal?: AbortSignal) => http.get<ServiceDetailResponse>(`/api/catalog/services/${id}`, undefined, signal),
}

export const storeProductKeys = {
  list: (params: StoreProductListParams) => [...qk.store, 'products', 'list', params] as const,
  detail: (id: string) => [...qk.store, 'products', 'detail', id] as const,
  image: (id: string) => [...qk.store, 'image', id] as const,
}

export const storeCategoryKeys = {
  tree: () => [...qk.store, 'categories'] as const,
}

export const catalogKeys = {
  search: (q: string) => [...qk.catalog, 'services-search', q] as const,
  service: (id: string) => [...qk.catalog, 'service', id] as const,
}

export function prefetchStoreProduct(queryClient: QueryClient, id: string) {
  return queryClient.prefetchQuery({
    queryKey: storeProductKeys.detail(id),
    queryFn: ({ signal }) => storeProductsApi.detail(id, signal),
    staleTime: 30_000,
  })
}

/** Product writes touch the product keys (detail + lists). */
export const productActionInvalidation = [[...qk.store, 'products']] as const
