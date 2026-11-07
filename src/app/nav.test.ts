import { describe, expect, it } from 'vitest'
import type { ProviderOrganizationResponse } from '@/api/types'
import { routeDenial, visibleNav } from './nav'
import { FRONT_DESK_CONTEXT, providerContextFor } from './provider'

const ctx = (over: Partial<ProviderOrganizationResponse>, owner = true) =>
  providerContextFor({ verificationStatus: 'Approved', trialEndsAt: null, businessModel: 'ExecutionPartner', storeModuleEnabled: false, ...over } as ProviderOrganizationResponse, owner)

const labels = (c: ReturnType<typeof ctx>) => visibleNav(c).map((i) => i.label)

describe('navigation (§8)', () => {
  it('onboarding shows only home, organization, support and notifications', () => {
    expect(labels(ctx({ verificationStatus: 'Draft' }))).toEqual(['home', 'organization', 'support', 'notifications'])
    expect(labels(ctx({ verificationStatus: 'UnderReview' }))).toEqual(['home', 'organization', 'support', 'notifications'])
  })

  it('tenders only for MarketplacePartner / Both, store only when enabled', () => {
    expect(labels(ctx({}))).not.toContain('marketplace')
    expect(labels(ctx({ businessModel: 'Both' }))).toContain('marketplace')
    expect(labels(ctx({}))).not.toContain('store')
    expect(labels(ctx({ storeModuleEnabled: true }))).toContain('store')
  })

  it('a front-desk account sees the counter pages, the shelf, stock and notifications (PROVIDER-BRANCHES phases 2, 5, 6)', () => {
    expect(visibleNav(FRONT_DESK_CONTEXT).map((i) => i.label)).toEqual(['counter', 'counterBoard', 'transfers', 'counterWarranty', 'cashClose', 'workshop', 'inventory', 'notifications'])
    expect(routeDenial({ full: true, frontDesk: true }, FRONT_DESK_CONTEXT)).toBeNull()
    expect(routeDenial({ full: true }, FRONT_DESK_CONTEXT)).toBe('notAvailable')
    expect(routeDenial(undefined, FRONT_DESK_CONTEXT)).toBe('notAvailable')
  })

  it('a "counter only" shop has no incoming or board, and sees the plans before approval (phase 3 §7)', () => {
    const counterOnly = ctx({ businessModel: 'CounterOnly' })
    expect(labels(counterOnly)).not.toContain('incoming')
    expect(labels(counterOnly)).not.toContain('board')
    expect(labels(counterOnly)).toContain('counter')
    expect(labels(counterOnly)).toContain('subscription')
    expect(routeDenial({ full: true, platform: true }, counterOnly)).toBe('notAvailable')
    expect(routeDenial({ full: true, platform: true }, ctx({}))).toBeNull()
    const draft = ctx({ businessModel: 'CounterOnly', verificationStatus: 'Draft' })
    expect(labels(draft)).toContain('subscription')
    expect(routeDenial({ full: true, early: (c) => c.counterOnly }, draft)).toBeNull()
    expect(routeDenial({ full: true, early: (c) => c.counterOnly }, ctx({ verificationStatus: 'Draft' }))).toBe('notApproved')
    expect(labels(ctx({}))).toContain('incoming')
  })

  it('guards routes', () => {
    expect(routeDenial({ full: true }, ctx({ verificationStatus: 'Submitted' }))).toBe('notApproved')
    expect(routeDenial({ full: true }, ctx({ verificationStatus: 'Trial' }))).toBeNull()
    expect(routeDenial({ full: true, marketplace: true }, ctx({}))).toBe('notAvailable')
    expect(routeDenial({ ownerOnly: true }, ctx({}, false))).toBe('notAvailable')
  })
})
