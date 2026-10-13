export * from './types.gen'

import type { PaginatedRequest } from './types.gen'

/**
 * Query params for a list endpoint: the generated request class minus the server-computed
 * fields, everything optional.
 */
export type ListParams<T extends PaginatedRequest> = Partial<Omit<T, 'normalizedPage' | 'normalizedPageSize'>>

/** Shape of a non-2xx or `success:false` response once normalized by the http client. */
export interface ApiErrorShape {
  status: number
  errorCode: string | null
  message: string
  details?: unknown
}
