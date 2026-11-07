import { useQuery } from '@tanstack/react-query'
import { http } from '@/api/http'
import { qk } from '@/api/keys'
import type { ProviderBusinessModel, ProviderOrganizationResponse, ProviderVerificationStatus } from '@/api/types'
import { parseUtc } from '@/lib/format'
import { roleKindFor, useAuthStore, type ProviderRoleKind } from '@/features/auth/authStore'

/**
 * The provider context (§6): `GET /api/provider/organization`, fetched on start, refetched on
 * focus and after every organization write (`invalidate: [qk.organization]`). Its
 * `verificationStatus` decides what the shell shows.
 */
export const organizationQueryKey = qk.organization

export function fetchOrganization(signal?: AbortSignal) {
  return http.get<ProviderOrganizationResponse>('/api/provider/organization', undefined, signal)
}

export function useOrganizationQuery(enabled = true) {
  return useQuery({
    queryKey: organizationQueryKey,
    queryFn: ({ signal }) => fetchOrganization(signal),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
}

/**
 * - `onboarding`: Draft / Rejected — only الرئيسية (as the checklist), ملف المنشأة, الإشعارات.
 * - `review`: Submitted / UnderReview — same menu, work hidden, profile editing still allowed.
 * - `full`: Approved / Trial.
 * Suspended never reaches the shell (sign-in fails with `TenantSuspended`).
 */
export type ShellMode = 'onboarding' | 'review' | 'full'

export function shellModeFor(status: ProviderVerificationStatus): ShellMode {
  switch (status) {
    case 'Approved':
    case 'Trial':
      return 'full'
    case 'Submitted':
    case 'UnderReview':
      return 'review'
    default:
      return 'onboarding'
  }
}

/** The server's operational gate (§4): Approved, or Trial with no end date or one in the future. */
export function isOperational(org: Pick<ProviderOrganizationResponse, 'verificationStatus' | 'trialEndsAt'>, now = Date.now()): boolean {
  if (org.verificationStatus === 'Approved') return true
  if (org.verificationStatus !== 'Trial') return false
  const end = parseUtc(org.trialEndsAt)
  return !end || end.valueOf() > now
}

export function hasMarketplace(model: ProviderBusinessModel): boolean {
  return model === 'MarketplacePartner' || model === 'Both'
}

/** Where the business model can still change freely (§8.9): Draft / Rejected only. */
export function canChangeBusinessModel(status: ProviderVerificationStatus): boolean {
  return status === 'Draft' || status === 'Rejected'
}

/**
 * The models the owner may pick now (PROVIDER-BRANCHES phase 3 §7):
 * - Draft / Rejected: any;
 * - Approved / Trial: a platform model may move to `CounterOnly` (at once); `CounterOnly` may ask for any other (a
 *   request the platform reviews). Picking the current model again withdraws a pending request;
 * - otherwise none (`BusinessModelLocked`).
 */
export function selectableBusinessModels(status: ProviderVerificationStatus, current: ProviderBusinessModel): ProviderBusinessModel[] {
  const all: ProviderBusinessModel[] = ['ExecutionPartner', 'MarketplacePartner', 'Both', 'CounterOnly']
  if (canChangeBusinessModel(status)) return all
  if (status !== 'Approved' && status !== 'Trial') return []
  return current === 'CounterOnly' ? all : [current, 'CounterOnly']
}

/** After approval, leaving `CounterOnly` is a request the platform reviews; everything else applies at once. */
export function isBusinessModelRequest(status: ProviderVerificationStatus, current: ProviderBusinessModel, next: ProviderBusinessModel): boolean {
  return (status === 'Approved' || status === 'Trial') && current === 'CounterOnly' && next !== 'CounterOnly'
}

export interface ProviderContext {
  kind: 'management'
  org: ProviderOrganizationResponse
  mode: ShellMode
  isOwner: boolean
  /** Work, tender and store writes are accepted (§4). */
  operational: boolean
  trialEnded: boolean
  marketplaceEnabled: boolean
  storeEnabled: boolean
  /**
   * A "counter only" shop (PROVIDER-BRANCHES phase 3 §7): no incoming platform work, board, tenders, coverage or
   * capabilities. The counter, shelf, team, branches, reports, subscription and wallet stay.
   */
  counterOnly: boolean
}

/**
 * A front-desk (reception) account (phase 2 §2). It cannot read the organization (`api/provider/organization` is for
 * the owner and supervisors), so its shell has no organization: only the counter, the shelf and notifications.
 */
export interface FrontDeskContext {
  kind: 'frontDesk'
  mode: 'full'
}

export type ShellContext = ProviderContext | FrontDeskContext

export function providerContextFor(org: ProviderOrganizationResponse, isOwner: boolean, now = Date.now()): ProviderContext {
  const operational = isOperational(org, now)
  return {
    kind: 'management',
    org,
    mode: shellModeFor(org.verificationStatus),
    isOwner,
    operational,
    trialEnded: org.verificationStatus === 'Trial' && !operational,
    marketplaceEnabled: hasMarketplace(org.businessModel),
    storeEnabled: org.storeModuleEnabled,
    counterOnly: org.businessModel === 'CounterOnly',
  }
}

export const FRONT_DESK_CONTEXT: FrontDeskContext = { kind: 'frontDesk', mode: 'full' }

/**
 * The loaded provider context. Only call it under `ProviderGate` (every shell page), which
 * renders nothing until the organization has loaded.
 */
export function useProvider(): ProviderContext {
  const isFrontDesk = useAuthStore((s) => s.user?.role === 'ProviderFrontDesk')
  const { data } = useOrganizationQuery(!isFrontDesk)
  const isOwner = useAuthStore((s) => s.user?.role === 'ProviderOwner')
  if (!data) throw new Error('useProvider() outside ProviderGate, or for a front-desk account')
  return providerContextFor(data, isOwner)
}

/**
 * The shell's context for any signed-in role: the organization for the owner and supervisors, a bare front-desk
 * context otherwise. Shell parts (sidebar, guard, banner) read this; management pages keep `useProvider()`.
 */
export function useShellContext(): ShellContext {
  const role = useAuthStore((s) => s.user?.role)
  const frontDesk = roleKindFor(role) === 'frontDesk'
  const { data } = useOrganizationQuery(!frontDesk)
  if (frontDesk) return FRONT_DESK_CONTEXT
  if (!data) throw new Error('useShellContext() outside ProviderGate')
  return providerContextFor(data, role === 'ProviderOwner')
}

export type { ProviderRoleKind }
