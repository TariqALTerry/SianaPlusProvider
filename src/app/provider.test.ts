import { describe, expect, it } from 'vitest'
import type { ProviderOrganizationResponse } from '@/api/types'
import { canChangeBusinessModel, hasMarketplace, isOperational, providerContextFor, shellModeFor } from './provider'

const org = (over: Partial<ProviderOrganizationResponse>) => ({ verificationStatus: 'Approved', trialEndsAt: null, businessModel: 'ExecutionPartner', storeModuleEnabled: false, ...over }) as ProviderOrganizationResponse

describe('verification status drives the shell (§6)', () => {
  it.each([
    ['Draft', 'onboarding'],
    ['Rejected', 'onboarding'],
    ['Submitted', 'review'],
    ['UnderReview', 'review'],
    ['Approved', 'full'],
    ['Trial', 'full'],
  ] as const)('%s → %s', (status, mode) => {
    expect(shellModeFor(status)).toBe(mode)
  })

  it('applies the operational gate like the server', () => {
    const now = Date.parse('2026-10-05T12:00:00Z')
    expect(isOperational(org({ verificationStatus: 'Approved' }), now)).toBe(true)
    expect(isOperational(org({ verificationStatus: 'Trial', trialEndsAt: null }), now)).toBe(true)
    expect(isOperational(org({ verificationStatus: 'Trial', trialEndsAt: '2026-10-06T00:00:00Z' }), now)).toBe(true)
    expect(isOperational(org({ verificationStatus: 'Trial', trialEndsAt: '2026-10-01T00:00:00Z' }), now)).toBe(false)
    expect(isOperational(org({ verificationStatus: 'UnderReview' }), now)).toBe(false)
    expect(providerContextFor(org({ verificationStatus: 'Trial', trialEndsAt: '2026-10-01T00:00:00Z' }), true, now).trialEnded).toBe(true)
  })

  it('gates tenders and the business model', () => {
    expect(hasMarketplace('ExecutionPartner')).toBe(false)
    expect(hasMarketplace('MarketplacePartner')).toBe(true)
    expect(hasMarketplace('Both')).toBe(true)
    expect(canChangeBusinessModel('Draft')).toBe(true)
    expect(canChangeBusinessModel('Approved')).toBe(false)
  })
})
