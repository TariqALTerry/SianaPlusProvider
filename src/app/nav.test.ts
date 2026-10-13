import { describe, expect, it } from 'vitest'
import type { ProviderOrganizationResponse } from '@/api/types'
import { routeDenial, visibleNav } from './nav'
import { providerContextFor } from './provider'

const ctx = (over: Partial<ProviderOrganizationResponse>, owner = true) =>
  providerContextFor({ verificationStatus: 'Approved', trialEndsAt: null, businessModel: 'ExecutionPartner', storeModuleEnabled: false, ...over } as ProviderOrganizationResponse, owner)

const labels = (c: ReturnType<typeof ctx>) => visibleNav(c).map((i) => i.label)

describe('navigation (§8)', () => {
  it('onboarding shows only home, organization and notifications', () => {
    expect(labels(ctx({ verificationStatus: 'Draft' }))).toEqual(['home', 'organization', 'notifications'])
    expect(labels(ctx({ verificationStatus: 'UnderReview' }))).toEqual(['home', 'organization', 'notifications'])
  })

  it('tenders only for MarketplacePartner / Both, store only when enabled', () => {
    expect(labels(ctx({}))).not.toContain('marketplace')
    expect(labels(ctx({ businessModel: 'Both' }))).toContain('marketplace')
    expect(labels(ctx({}))).not.toContain('store')
    expect(labels(ctx({ storeModuleEnabled: true }))).toContain('store')
  })

  it('guards routes', () => {
    expect(routeDenial({ full: true }, ctx({ verificationStatus: 'Submitted' }))).toBe('notApproved')
    expect(routeDenial({ full: true }, ctx({ verificationStatus: 'Trial' }))).toBeNull()
    expect(routeDenial({ full: true, marketplace: true }, ctx({}))).toBe('notAvailable')
    expect(routeDenial({ ownerOnly: true }, ctx({}, false))).toBe('notAvailable')
  })
})
