import { useQuery } from '@tanstack/react-query'
import { http } from '@/api/http'
import { qk } from '@/api/keys'
import type { IncomingWorkItemResponse } from '@/api/types'
import { usePollingInterval } from '@/hooks/usePageVisible'

export const incomingApi = {
  list: (signal?: AbortSignal) => http.get<IncomingWorkItemResponse[]>('/api/provider/work/incoming', undefined, signal),
}

/**
 * Items waiting for the organization to pick a technician (§8.3), oldest first, not paginated.
 * One shared query: the Incoming page, the sidebar badge and the desktop alerts all read it.
 * Every 30 s while the tab is visible.
 */
export function useIncoming(enabled = true) {
  const interval = usePollingInterval(30_000)
  return useQuery({
    queryKey: qk.incoming,
    queryFn: ({ signal }) => incomingApi.list(signal),
    enabled,
    refetchInterval: enabled ? interval : false,
    staleTime: 15_000,
  })
}
