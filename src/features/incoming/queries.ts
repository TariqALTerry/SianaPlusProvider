import { useQuery } from '@tanstack/react-query'
import { http } from '@/api/http'
import { qk } from '@/api/keys'
import type { IncomingWorkItemResponse } from '@/api/types'
import { usePollingInterval } from '@/hooks/usePageVisible'
import { workApi, workKeys } from '@/features/work/api'
import { useBranchParam } from '@/features/branches/scope'

export const incomingApi = {
  list: (branchId: string | undefined, signal?: AbortSignal) => http.get<IncomingWorkItemResponse[]>('/api/provider/work/incoming', { branchId }, signal),
}

/**
 * Items waiting for the organization to pick a technician (§8.3), oldest first, not paginated.
 * One shared query: the Incoming page, the sidebar badge and the desktop alerts all read it.
 * Every 30 s while the tab is visible.
 */
export function useIncoming(enabled = true) {
  const interval = usePollingInterval(30_000)
  // Scoped by the branch switcher (PROVIDER-BRANCHES phase 1 §5); every key stays under `qk.incoming`.
  const branchId = useBranchParam()
  return useQuery({
    queryKey: [...qk.incoming, branchId ?? 'all'],
    queryFn: ({ signal }) => incomingApi.list(branchId, signal),
    enabled,
    refetchInterval: enabled ? interval : false,
    staleTime: 15_000,
  })
}

/** Quotations above a technician's limit (they wait for the company), polled with the Incoming page. */
export function useQuotationReviews() {
  const interval = usePollingInterval(30_000)
  return useQuery({
    queryKey: workKeys.quotationReviews(),
    queryFn: ({ signal }) => workApi.quotationReviews(signal),
    refetchInterval: interval,
    staleTime: 15_000,
  })
}
