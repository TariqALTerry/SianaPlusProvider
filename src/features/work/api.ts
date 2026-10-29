import type { QueryClient } from '@tanstack/react-query'
import { http } from '@/api/http'
import { qk } from '@/api/keys'
import type {
  AssignExecutorRequest,
  ExecutorCandidateResponse,
  HomeInspectionResponse,
  ListParams,
  PaginatedResponse,
  ProviderRejectRequest,
  ProviderWorkBoardResponse,
  ProviderWorkListRequest,
  ScheduleItemRequest,
  ServiceItemProviderDetailResponse,
  ServiceItemProviderView,
  UnassignRequest,
} from '@/api/types'

const base = '/api/provider/work'

export type WorkListParams = ListParams<ProviderWorkListRequest>

/** `WorkController` (§8.3–§8.6). Every write is gated server-side by `ProviderNotOperational`. */
export const workApi = {
  list: (params: WorkListParams, signal?: AbortSignal) => http.get<PaginatedResponse<ServiceItemProviderView>>(`${base}/items`, params, signal),
  detail: (id: string, signal?: AbortSignal) => http.get<ServiceItemProviderDetailResponse>(`${base}/items/${id}`, undefined, signal),
  candidates: (id: string, signal?: AbortSignal) => http.get<ExecutorCandidateResponse[]>(`${base}/items/${id}/candidates`, undefined, signal),
  board: (signal?: AbortSignal) => http.get<ProviderWorkBoardResponse>(`${base}/board`, undefined, signal),
  executorItems: (executorId: string, params: WorkListParams, signal?: AbortSignal) =>
    http.get<PaginatedResponse<ServiceItemProviderView>>(`${base}/executors/${executorId}/items`, params, signal),

  assign: (id: string, body: AssignExecutorRequest) => http.post<ServiceItemProviderView>(`${base}/items/${id}/assign-executor`, body),
  reassign: (id: string, body: AssignExecutorRequest) => http.post<ServiceItemProviderView>(`${base}/items/${id}/reassign-executor`, body),
  unassign: (id: string, body: UnassignRequest) => http.post<ServiceItemProviderView>(`${base}/items/${id}/unassign-executor`, body),
  delegate: (id: string) => http.post<ServiceItemProviderView>(`${base}/items/${id}/delegate`),
  reject: (id: string, body: ProviderRejectRequest) => http.post<string>(`${base}/items/${id}/reject`, body),
  schedule: (id: string, body: ScheduleItemRequest) => http.post<ServiceItemProviderView>(`${base}/items/${id}/schedule`, body),
  /** «صحة بيتك» of a covered visit (HOME-SUBSCRIPTIONS PHASE2 §1); `HomeInspectionNotRequired` when it is not a health check. */
  homeInspection: (id: string, signal?: AbortSignal) => http.get<HomeInspectionResponse>(`${base}/items/${id}/home-inspection`, undefined, signal),
}

export const workKeys = {
  lists: () => [...qk.work, 'list'] as const,
  list: (params: WorkListParams) => [...qk.work, 'list', params] as const,
  detail: (id: string) => [...qk.work, 'detail', id] as const,
  candidates: (id: string) => [...qk.work, 'candidates', id] as const,
  homeInspection: (id: string) => [...qk.work, 'home-inspection', id] as const,
  executorItems: (executorId: string, params: WorkListParams) => [...qk.work, 'list', 'executor', executorId, params] as const,
  board: () => [...qk.board, 'summary'] as const,
}

/**
 * What a work mutation touches: the item (every `qk.work` key), Incoming (and so the sidebar
 * badge), the board and the dashboard counts.
 */
export const WORK_INVALIDATION = [qk.work, qk.incoming, qk.board, qk.dashboard] as const

/** After a reject the item leaves the organization: its detail must not be refetched (404). */
export const REJECT_INVALIDATION = [workKeys.lists(), qk.incoming, qk.board, qk.dashboard] as const

export function prefetchWorkItem(queryClient: QueryClient, id: string) {
  return queryClient.prefetchQuery({
    queryKey: workKeys.detail(id),
    queryFn: ({ signal }) => workApi.detail(id, signal),
    staleTime: 30_000,
  })
}

export const boardQueryOptions = {
  queryKey: workKeys.board(),
  queryFn: ({ signal }: { signal: AbortSignal }) => workApi.board(signal),
}
