import { useCallback, useEffect } from 'react'
import { create } from 'zustand'
import { setBranchRejectedHandler } from '@/api/http'
import { queryClient } from '@/api/queryClient'
import type { BranchOptionResponse, MyBranchesResponse } from '@/api/types'
import { useAuthStore } from '@/features/auth/authStore'
import { readItem, removeItem, writeItem } from '@/lib/storage'
import { useMyBranches } from './api'

/**
 * The branch switcher (PROVIDER-BRANCHES-PROVIDER-PLATFORM-PROMPT phase 1 §4). The choice is kept on this device, per
 * account, and sent as `branchId` to the work list, incoming, board, shelf and reports.
 *
 * - `all`: the owner, or a supervisor linked to no branch: "كل الفروع" first, then each branch.
 * - `fixed`: linked to one branch: its name, no menu, and no `branchId` sent (the server scopes by the link and still
 *   shows services without a branch yet).
 * - `pick`: linked to several branches: one of them, never "all".
 * - `none`: a front-desk account linked to no branch sees nothing.
 */
export type ScopeMode = 'loading' | 'all' | 'fixed' | 'pick' | 'none'

export interface BranchScope {
  mode: ScopeMode
  branches: BranchOptionResponse[]
  /** The branch picked (or the only one); null = every branch. */
  selected: BranchOptionResponse | null
  /** What list reads send as `branchId`. */
  branchId: string | undefined
}

export function resolveScope(data: MyBranchesResponse | undefined, stored: string | null): BranchScope {
  if (!data) return { mode: 'loading', branches: [], selected: null, branchId: stored ?? undefined }
  const branches = data.branches
  if (branches.length === 0) return { mode: 'none', branches, selected: null, branchId: undefined }
  const picked = branches.find((b) => b.id === stored) ?? null
  if (data.allBranches) return { mode: 'all', branches, selected: picked, branchId: picked?.id }
  if (branches.length === 1) return { mode: 'fixed', branches, selected: branches[0]!, branchId: undefined }
  const selected = picked ?? branches[0]!
  return { mode: 'pick', branches, selected, branchId: selected.id }
}

const storageName = (userId: string) => `branch.${userId}`

interface BranchState {
  /** Per account: `{ [userId]: branchId | null }`, mirrored in localStorage. */
  byUser: Record<string, string | null>
  set: (userId: string, branchId: string | null) => void
}

export const useBranchStore = create<BranchState>()((set) => ({
  byUser: {},
  set: (userId, branchId) => {
    if (branchId) writeItem(storageName(userId), branchId)
    else removeItem(storageName(userId))
    set((s) => ({ byUser: { ...s.byUser, [userId]: branchId } }))
  },
}))

function storedFor(userId: string | undefined, byUser: Record<string, string | null>): string | null {
  if (!userId) return null
  if (userId in byUser) return byUser[userId] ?? null
  return readItem<string | null>(storageName(userId), null)
}

// A read refused with `BranchNotFound` for its `branchId`: forget the choice and read again without it.
setBranchRejectedHandler(() => {
  const userId = useAuthStore.getState().user?.id
  if (!userId) return
  useBranchStore.getState().set(userId, null)
  void queryClient.invalidateQueries({ queryKey: ['branches', 'mine'] })
})

/** The current scope, and a setter for the switcher. */
export function useBranchScope(): BranchScope & { select: (branchId: string | null) => void; isLoading: boolean } {
  const userId = useAuthStore((s) => s.user?.id)
  const byUser = useBranchStore((s) => s.byUser)
  const setStored = useBranchStore((s) => s.set)
  const query = useMyBranches(!!userId)
  const stored = storedFor(userId, byUser)
  const scope = resolveScope(query.data, stored)

  // A saved branch that is no longer the user's is dropped once the list confirms it.
  useEffect(() => {
    if (userId && query.data && stored && !query.data.branches.some((b) => b.id === stored)) setStored(userId, null)
  }, [userId, query.data, stored, setStored])

  const select = useCallback(
    (branchId: string | null) => {
      if (userId) setStored(userId, branchId)
    },
    [userId, setStored],
  )
  return { ...scope, select, isLoading: query.isPending }
}

/** Just the `branchId` to send with a list read (undefined = every branch the user may see). */
export function useBranchParam(): string | undefined {
  return useBranchScope().branchId
}
