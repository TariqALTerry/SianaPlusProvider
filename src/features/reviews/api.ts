import { http } from '@/api/http'
import { qk } from '@/api/keys'
import type { ListParams, PaginatedResponse, ProviderReviewListRequest, ReviewResponse, ReviewSummaryResponse } from '@/api/types'

/** Read-only (§8.11): published reviews on the organization's work. */
const base = '/api/provider/reviews'

export type ReviewListParams = ListParams<ProviderReviewListRequest>

export const reviewsApi = {
  list: (params: ReviewListParams, signal?: AbortSignal) => http.get<PaginatedResponse<ReviewResponse>>(base, params, signal),
  summary: (signal?: AbortSignal) => http.get<ReviewSummaryResponse>(`${base}/summary`, undefined, signal),
}

export const reviewKeys = {
  list: (params: ReviewListParams) => [...qk.reviews, 'list', params] as const,
  summary: () => [...qk.reviews, 'summary'] as const,
}
