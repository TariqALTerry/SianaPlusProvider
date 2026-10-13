import { useQuery } from '@tanstack/react-query'
import { http } from '@/api/http'
import { qk } from '@/api/keys'
import type { ProviderBusinessModel, ProviderOrganizationResponse, ProviderVerificationStatus } from '@/api/types'
import { parseUtc } from '@/lib/format'
import { useAuthStore } from '@/features/auth/authStore'

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

/** Where the business model can still change (§8.9): Draft / Rejected only. */
export function canChangeBusinessModel(status: ProviderVerificationStatus): boolean {
  return status === 'Draft' || status === 'Rejected'
}

export interface ProviderContext {
  org: ProviderOrganizationResponse
  mode: ShellMode
  isOwner: boolean
  /** Work, tender and store writes are accepted (§4). */
  operational: boolean
  trialEnded: boolean
  marketplaceEnabled: boolean
  storeEnabled: boolean
}

export function providerContextFor(org: ProviderOrganizationResponse, isOwner: boolean, now = Date.now()): ProviderContext {
  const operational = isOperational(org, now)
  return {
    org,
    mode: shellModeFor(org.verificationStatus),
    isOwner,
    operational,
    trialEnded: org.verificationStatus === 'Trial' && !operational,
    marketplaceEnabled: hasMarketplace(org.businessModel),
    storeEnabled: org.storeModuleEnabled,
  }
}

/**
 * The loaded provider context. Only call it under `ProviderGate` (every shell page), which
 * renders nothing until the organization has loaded.
 */
export function useProvider(): ProviderContext {
  const { data } = useOrganizationQuery()
  const isOwner = useAuthStore((s) => s.user?.role === 'ProviderOwner')
  if (!data) throw new Error('useProvider() outside ProviderGate')
  return providerContextFor(data, isOwner)
}
