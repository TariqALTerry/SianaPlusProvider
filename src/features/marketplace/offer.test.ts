import { describe, expect, it } from 'vitest'
import type { MarketplaceOfferResponse, MarketplaceOfferStatus } from '@/api/types'
import { closingState, OFFER_NOTE_MAX, offerAvailability, offerFieldErrors, offerFormDefaults, toOfferRequest, type OfferFormValues } from './offer'

const valid: OfferFormValues = { amount: '250', estimatedDurationMinutes: '', proposedStart: '', note: '' }

const NOW = Date.parse('2026-10-05T09:00:00Z')

function offer(status: MarketplaceOfferStatus, patch: Partial<MarketplaceOfferResponse> = {}): MarketplaceOfferResponse {
  return {
    id: 'o1',
    providerOrganizationId: 'p1',
    providerName: 'X',
    providerRating: 0,
    providerCompletedItemsCount: 0,
    amount: 300,
    estimatedDurationMinutes: 90,
    proposedStart: '2026-10-06T07:00:00Z',
    note: 'note',
    status,
    submittedAt: '2026-10-04T09:00:00Z',
    respondedAt: null,
    ...patch,
  }
}

describe('offer form validation', () => {
  it('accepts a minimal valid offer', () => {
    expect(offerFieldErrors(valid)).toEqual({})
  })

  it('requires an amount greater than zero (OfferAmountInvalid)', () => {
    expect(offerFieldErrors({ ...valid, amount: '' }).amount).toBe('required')
    expect(offerFieldErrors({ ...valid, amount: '0' }).amount).toBe('OfferAmountInvalid')
    expect(offerFieldErrors({ ...valid, amount: '-5' }).amount).toBe('OfferAmountInvalid')
    expect(offerFieldErrors({ ...valid, amount: 'abc' }).amount).toBe('OfferAmountInvalid')
    expect(offerFieldErrors({ ...valid, amount: '0.01' }).amount).toBeUndefined()
  })

  it('takes an optional whole duration greater than zero (EstimatedDurationInvalid)', () => {
    expect(offerFieldErrors({ ...valid, estimatedDurationMinutes: '90' })).toEqual({})
    expect(offerFieldErrors({ ...valid, estimatedDurationMinutes: '0' }).estimatedDurationMinutes).toBe('EstimatedDurationInvalid')
    expect(offerFieldErrors({ ...valid, estimatedDurationMinutes: '1.5' }).estimatedDurationMinutes).toBe('EstimatedDurationInvalid')
  })

  it('limits the note to 2000 characters (OfferNoteTooLong)', () => {
    expect(offerFieldErrors({ ...valid, note: 'a'.repeat(OFFER_NOTE_MAX) })).toEqual({})
    expect(offerFieldErrors({ ...valid, note: 'a'.repeat(OFFER_NOTE_MAX + 1) }).note).toBe('OfferNoteTooLong')
  })

  it('rejects an unparsable proposed start', () => {
    expect(offerFieldErrors({ ...valid, proposedStart: 'not-a-date' }).proposedStart).toBe('ProposedStartInvalid')
  })
})

describe('offer request mapping', () => {
  it('sends nulls for empty optionals and converts the Riyadh start to UTC', () => {
    expect(toOfferRequest({ amount: ' 250.5 ', estimatedDurationMinutes: '', proposedStart: '', note: '  ' })).toEqual({
      amount: 250.5,
      estimatedDurationMinutes: null,
      proposedStart: null,
      note: null,
    })
    expect(toOfferRequest({ amount: '100', estimatedDurationMinutes: '45', proposedStart: '2026-10-06T10:00', note: ' hi ' })).toEqual({
      amount: 100,
      estimatedDurationMinutes: 45,
      proposedStart: '2026-10-06T07:00:00.000Z',
      note: 'hi',
    })
  })

  it('prefills from the current offer and round-trips the start time', () => {
    const values = offerFormDefaults(offer('Submitted'))
    expect(values).toEqual({ amount: '300', estimatedDurationMinutes: '90', proposedStart: '2026-10-06T10:00', note: 'note' })
    expect(toOfferRequest(values).proposedStart).toBe('2026-10-06T07:00:00.000Z')
    expect(offerFormDefaults(null)).toEqual({ amount: '', estimatedDurationMinutes: '', proposedStart: '', note: '' })
  })
})

describe('offer availability', () => {
  const open = { status: 'Open' as const, closesAt: '2026-10-06T09:00:00Z' }

  it('lets a first offer be submitted on an open tender', () => {
    expect(offerAvailability({ ...open, myOffer: null }, NOW)).toEqual({
      accepting: true,
      canSubmit: true,
      isResubmit: false,
      canEdit: false,
      canWithdraw: false,
    })
  })

  it('edits and withdraws a submitted offer, but never submits a second one', () => {
    const a = offerAvailability({ ...open, myOffer: offer('Submitted') }, NOW)
    expect(a.canSubmit).toBe(false)
    expect(a.canEdit).toBe(true)
    expect(a.canWithdraw).toBe(true)
  })

  it('lets a withdrawn offer be resubmitted', () => {
    const a = offerAvailability({ ...open, myOffer: offer('Withdrawn') }, NOW)
    expect(a.canSubmit).toBe(true)
    expect(a.isResubmit).toBe(true)
    expect(a.canEdit).toBe(false)
    expect(a.canWithdraw).toBe(false)
  })

  it('freezes accepted and rejected offers', () => {
    for (const status of ['Accepted', 'Rejected'] as const) {
      const a = offerAvailability({ ...open, myOffer: offer(status) }, NOW)
      expect([a.canSubmit, a.canEdit, a.canWithdraw]).toEqual([false, false, false])
    }
  })

  it('stops submit and edit once the tender is past closesAt or not Open', () => {
    const past = offerAvailability({ status: 'Open', closesAt: '2026-10-05T08:59:00Z', myOffer: offer('Submitted') }, NOW)
    expect(past.accepting).toBe(false)
    expect(past.canEdit).toBe(false)
    // The server still allows withdrawing a live offer.
    expect(past.canWithdraw).toBe(true)
    expect(offerAvailability({ status: 'Awarded', closesAt: null, myOffer: null }, NOW).canSubmit).toBe(false)
    expect(offerAvailability({ status: 'Open', closesAt: null, myOffer: null }, NOW).canSubmit).toBe(true)
  })
})

describe('closing countdown', () => {
  it('classifies the time left', () => {
    expect(closingState(null, NOW)).toEqual({ kind: 'none' })
    expect(closingState('2026-10-05T08:00:00Z', NOW)).toEqual({ kind: 'closed' })
    expect(closingState('2026-10-05T09:30:00Z', NOW)).toEqual({ kind: 'open', minutes: 30, tone: 'urgent' })
    expect(closingState('2026-10-05T15:00:00Z', NOW)).toEqual({ kind: 'open', minutes: 360, tone: 'soon' })
    expect(closingState('2026-10-08T09:00:00Z', NOW)).toEqual({ kind: 'open', minutes: 4320, tone: 'normal' })
  })
})
