import { keepPreviousData, QueryClient } from '@tanstack/react-query'
import { toApiError } from './http'

/**
 * TanStack Query defaults (§14.1): 30 s stale for lists/details, one retry for GETs (never
 * for 4xx — the server already decided), no retries for mutations, no focus refetch except
 * where a query opts in (overview, live ops, the open detail).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const e = toApiError(error)
        if (e.status >= 400 && e.status < 500) return false
        return failureCount < 1
      },
    },
    mutations: { retry: 0 },
  },
})

/** Lookups (catalog trees, categories, capabilities) change rarely. */
export const LOOKUP_STALE_TIME = 10 * 60_000

/** For paginated lists: keep the previous page on screen while the next loads. */
export const listQueryOptions = { placeholderData: keepPreviousData } as const

/** Options for the one detail currently open: refetch when the tab regains focus. */
export const detailQueryOptions = { refetchOnWindowFocus: true } as const
