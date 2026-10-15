import { useQuery } from '@tanstack/react-query'
import { http } from '@/api/http'
import { qk } from '@/api/keys'
import { listQueryOptions } from '@/api/queryClient'
import type {
  CreateExecutorRequest,
  CreateTimeOffRequest,
  ExecutorScheduleResponse,
  WorkingHoursEntry,
  CreateSupervisorRequest,
  ExecutorAvailability,
  ExecutorListRequest,
  ExecutorResponse,
  ListParams,
  PaginatedResponse,
  ProviderCapabilitiesResponse,
  TeamMemberResponse,
  UpdateExecutorRequest,
} from '@/api/types'

const base = '/api/provider/team'

export type ExecutorListParams = ListParams<ExecutorListRequest>

/** §8.7 — ProviderTeamController. Owner-only: the two supervisor writes (§7). */
export const teamApi = {
  members: (signal?: AbortSignal) => http.get<TeamMemberResponse[]>(`${base}/members`, undefined, signal),
  executors: (params: ExecutorListParams, signal?: AbortSignal) =>
    http.get<PaginatedResponse<ExecutorResponse>>(`${base}/executors`, params, signal),

  executor: (id: string, signal?: AbortSignal) => http.get<ExecutorResponse>(`${base}/executors/${id}`, undefined, signal),
  // Working hours and time off (PHASE2 §5).
  schedule: (id: string, signal?: AbortSignal) => http.get<ExecutorScheduleResponse>(`${base}/executors/${id}/schedule`, undefined, signal),
  saveWorkingHours: (id: string, days: WorkingHoursEntry[]) => http.put<ExecutorScheduleResponse>(`${base}/executors/${id}/schedule/working-hours`, { days }),
  addTimeOff: (id: string, body: CreateTimeOffRequest) => http.post<ExecutorScheduleResponse>(`${base}/executors/${id}/schedule/time-off`, body),
  removeTimeOff: (id: string, timeOffId: string) => http.delete<ExecutorScheduleResponse>(`${base}/executors/${id}/schedule/time-off/${timeOffId}`),
  createExecutor: (body: CreateExecutorRequest) => http.post<ExecutorResponse>(`${base}/executors`, body),
  updateExecutor: (id: string, body: UpdateExecutorRequest) => http.put<ExecutorResponse>(`${base}/executors/${id}`, body),
  updateExecutorCapabilities: (id: string, capabilityIds: string[]) =>
    http.put<ExecutorResponse>(`${base}/executors/${id}/capabilities`, { capabilityIds }),
  setExecutorActive: (id: string, isActive: boolean) => http.patch<ExecutorResponse>(`${base}/executors/${id}/active`, { isActive }),
  setExecutorAvailability: (id: string, availability: ExecutorAvailability) =>
    http.patch<ExecutorResponse>(`${base}/executors/${id}/availability`, { availability }),

  createSupervisor: (body: CreateSupervisorRequest) => http.post<TeamMemberResponse>(`${base}/supervisors`, body),
  setSupervisorActive: (memberId: string, isActive: boolean) =>
    http.patch<TeamMemberResponse>(`${base}/supervisors/${memberId}/active`, { isActive }),

  /** Skills may only come from these (§8.7). */
  organizationCapabilities: (signal?: AbortSignal) =>
    http.get<ProviderCapabilitiesResponse>('/api/provider/organization/capabilities', undefined, signal),
}

export const teamKeys = {
  members: () => [...qk.team, 'members'] as const,
  executors: (params: ExecutorListParams) => [...qk.team, 'executors', params] as const,
  executor: (id: string) => [...qk.team, 'executor', id] as const,
  schedule: (id: string) => [...qk.team, 'schedule', id] as const,
  /**
   * Under `qk.organization` so every organization write (capabilities saved on ملف المنشأة)
   * refreshes the skill picker too. The extra segment keeps it apart from the organization
   * feature's own capability keys.
   */
  organizationCapabilities: () => [...qk.organization, 'capabilities', 'team-picker'] as const,
}

/**
 * What a team write changes:
 * - every write: the team lists;
 * - people added or (de)activated, availability and capacity: the organization's counts
 *   (`membersCount`, `executorsCount`), the board's technician lanes and the dashboard.
 */
export const teamInvalidation = {
  skills: [qk.team],
  supervisor: [qk.team, qk.organization],
  executor: [qk.team, qk.organization, qk.board, qk.dashboard],
} as const

export function useMembers() {
  return useQuery({
    queryKey: teamKeys.members(),
    queryFn: ({ signal }) => teamApi.members(signal),
  })
}

export function useExecutors(params: ExecutorListParams) {
  return useQuery({
    queryKey: teamKeys.executors(params),
    queryFn: ({ signal }) => teamApi.executors(params, signal),
    ...listQueryOptions,
  })
}

/** Read when a skill picker opens; fresh enough for a minute, refreshed by organization writes. */
export function useOrganizationCapabilities(enabled = true) {
  return useQuery({
    queryKey: teamKeys.organizationCapabilities(),
    queryFn: ({ signal }) => teamApi.organizationCapabilities(signal),
    staleTime: 60_000,
    enabled,
  })
}
