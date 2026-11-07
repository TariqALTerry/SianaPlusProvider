import { useQuery } from '@tanstack/react-query'
import { http } from '@/api/http'
import { qk } from '@/api/keys'
import { LOOKUP_STALE_TIME } from '@/api/queryClient'
import type {
  AddBranchClosureRequest,
  BranchOpeningHoursRequest,
  MyBranchesResponse,
  ProviderBranchResponse,
  SaveProviderBranchRequest,
} from '@/api/types'

const base = '/api/provider/branches'

/**
 * `ProviderBranchesController` (PROVIDER-BRANCHES-PROVIDER-PLATFORM-PROMPT phase 1 §3–§8). Reads are for the owner and
 * supervisors; every branch write is the owner's (`OwnerOnly`). `me/branches` is for every role, front desk included.
 */
export const branchesApi = {
  list: (signal?: AbortSignal) => http.get<ProviderBranchResponse[]>(base, undefined, signal),
  get: (id: string, signal?: AbortSignal) => http.get<ProviderBranchResponse>(`${base}/${id}`, undefined, signal),
  create: (body: SaveProviderBranchRequest) => http.post<ProviderBranchResponse>(base, body),
  /** A full replace: send every field. */
  update: (id: string, body: SaveProviderBranchRequest) => http.put<ProviderBranchResponse>(`${base}/${id}`, body),
  /** `MainBranchCannotBeDeactivated`, `BranchHasDevices` (the message has the count), `CounterBranchLimitReached`. */
  setActive: (id: string, isActive: boolean) => http.patch<ProviderBranchResponse>(`${base}/${id}/active`, { isActive }),
  /** `BranchInactive` for a stopped branch; the old main branch becomes an ordinary one. */
  setMain: (id: string) => http.post<ProviderBranchResponse>(`${base}/${id}/set-main`),
  /** One row per day at most; a day left out is not published. `BranchOpeningHoursInvalid`. */
  setOpeningHours: (id: string, days: BranchOpeningHoursRequest[]) => http.put<ProviderBranchResponse>(`${base}/${id}/opening-hours`, { days }),
  addClosure: (id: string, body: AddBranchClosureRequest) => http.post<ProviderBranchResponse>(`${base}/${id}/closures`, body),
  removeClosure: (id: string, closureId: string) => http.delete<ProviderBranchResponse>(`${base}/${id}/closures/${closureId}`),
  /** Replaces this branch's supervisors and front-desk staff only (`BranchMemberInvalid` for anyone else). */
  setMembers: (id: string, memberIds: string[]) => http.put<ProviderBranchResponse>(`${base}/${id}/members`, { memberIds }),
  uploadReceiptLogo: (id: string, file: File) => http.upload<ProviderBranchResponse>(`${base}/${id}/receipt-logo`, file),

  /** The branch switcher: the caller's branches, main first; `allBranches` for the owner and an unlinked supervisor. */
  mine: (signal?: AbortSignal) => http.get<MyBranchesResponse>('/api/provider/me/branches', undefined, signal),

  /** A technician's home branch; `null` clears it. */
  setExecutorHomeBranch: (executorId: string, branchId: string | null) =>
    http.patch<string>(`/api/provider/team/executors/${executorId}/home-branch`, { branchId }),
  /** The branch responsible for a service, while `canChangeBranch`. */
  changeItemBranch: (serviceItemId: string, branchId: string) => http.put<string>(`/api/provider/work/items/${serviceItemId}/branch`, { branchId }),
}

export const branchKeys = {
  list: () => [...qk.branches, 'list'] as const,
  detail: (id: string) => [...qk.branches, 'detail', id] as const,
  mine: () => [...qk.branches, 'mine'] as const,
}

/**
 * A branch write changes the branch list, the switcher's options, the organization's `branchesCount`, the team (links
 * and home branches) and the subscription's counter-branch count.
 */
export const BRANCH_INVALIDATION = [qk.branches, qk.organization, qk.team, qk.subscription] as const

export function useBranches(enabled = true) {
  return useQuery({ queryKey: branchKeys.list(), queryFn: ({ signal }) => branchesApi.list(signal), enabled })
}

/** `GET me/branches`, shared by the switcher and every branch picker. */
export function useMyBranches(enabled = true) {
  return useQuery({ queryKey: branchKeys.mine(), queryFn: ({ signal }) => branchesApi.mine(signal), enabled, staleTime: LOOKUP_STALE_TIME, refetchOnWindowFocus: true })
}
