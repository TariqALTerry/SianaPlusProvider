import { z } from 'zod'
import type { MarketplaceOfferResponse, ProviderMarketplaceRequestResponse, SubmitMarketplaceOfferRequest } from '@/api/types'
import { isoToRiyadhInput, parseUtc, riyadhInputToIso } from '@/lib/format'

/** Server limit on the offer note (`OfferNoteTooLong`). */
export const OFFER_NOTE_MAX = 2000

/**
 * The offer form, as typed (inputs are strings). Errors carry the server's error codes so the
 * client and server speak the same language: `OfferAmountInvalid`, `EstimatedDurationInvalid`,
 * `OfferNoteTooLong`. `required` and `ProposedStartInvalid` are client-only.
 */
export const offerFormSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, 'required')
    .refine((v) => {
      const n = Number(v)
      return Number.isFinite(n) && n > 0
    }, 'OfferAmountInvalid'),
  estimatedDurationMinutes: z
    .string()
    .trim()
    .refine((v) => {
      if (v === '') return true
      const n = Number(v)
      return Number.isInteger(n) && n > 0
    }, 'EstimatedDurationInvalid'),
  proposedStart: z.string().refine((v) => v === '' || riyadhInputToIso(v) !== null, 'ProposedStartInvalid'),
  note: z.string().max(OFFER_NOTE_MAX, 'OfferNoteTooLong'),
})

export type OfferFormValues = z.infer<typeof offerFormSchema>
export type OfferFieldError = 'required' | 'OfferAmountInvalid' | 'EstimatedDurationInvalid' | 'ProposedStartInvalid' | 'OfferNoteTooLong'

/** Field → first error code, for tests and for callers that don't use react-hook-form. */
export function offerFieldErrors(values: OfferFormValues): Partial<Record<keyof OfferFormValues, OfferFieldError>> {
  const result = offerFormSchema.safeParse(values)
  if (result.success) return {}
  const out: Partial<Record<keyof OfferFormValues, OfferFieldError>> = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof OfferFormValues
    if (!out[key]) out[key] = issue.message as OfferFieldError
  }
  return out
}

/** Prefills from the current offer (edit, or resubmitting a withdrawn one). */
export function offerFormDefaults(offer: MarketplaceOfferResponse | null | undefined): OfferFormValues {
  return {
    amount: offer ? String(offer.amount) : '',
    estimatedDurationMinutes: offer?.estimatedDurationMinutes ? String(offer.estimatedDurationMinutes) : '',
    proposedStart: isoToRiyadhInput(offer?.proposedStart),
    note: offer?.note ?? '',
  }
}

/** Valid form values → request body (empty optionals become null; the start goes Riyadh → UTC). */
export function toOfferRequest(values: OfferFormValues): SubmitMarketplaceOfferRequest {
  const duration = values.estimatedDurationMinutes.trim()
  return {
    amount: Number(values.amount.trim()),
    estimatedDurationMinutes: duration === '' ? null : Number(duration),
    proposedStart: riyadhInputToIso(values.proposedStart),
    note: values.note.trim() || null,
  }
}

export interface OfferAvailability {
  /** Open and not past `closesAt` (`MarketplaceRequestClosed` otherwise). */
  accepting: boolean
  /** POST: no offer yet, or a withdrawn one to revive. */
  canSubmit: boolean
  isResubmit: boolean
  /** PUT: only a live (Submitted) offer, only while accepting. */
  canEdit: boolean
  /** DELETE: only a live (Submitted) offer. */
  canWithdraw: boolean
}

/**
 * What the organization may do with its offer on this tender, mirroring
 * `MarketplaceProviderService`: one offer per tender, a withdrawn offer can be resubmitted,
 * edits only while Submitted and the tender still takes offers.
 */
export function offerAvailability(
  request: Pick<ProviderMarketplaceRequestResponse, 'status' | 'closesAt' | 'myOffer'>,
  now: number = Date.now(),
): OfferAvailability {
  const closes = parseUtc(request.closesAt)
  const accepting = request.status === 'Open' && (!closes || closes.valueOf() > now)
  const status = request.myOffer?.status
  const canSubmit = accepting && (!status || status === 'Withdrawn')
  return {
    accepting,
    canSubmit,
    isResubmit: canSubmit && status === 'Withdrawn',
    canEdit: accepting && status === 'Submitted',
    canWithdraw: status === 'Submitted',
  }
}

export type ClosingState = { kind: 'none' } | { kind: 'closed' } | { kind: 'open'; minutes: number; tone: 'normal' | 'soon' | 'urgent' }

/** Countdown to `closesAt`: urgent under an hour, soon under a day. */
export function closingState(closesAt: string | null | undefined, now: number = Date.now()): ClosingState {
  const closes = parseUtc(closesAt)
  if (!closes) return { kind: 'none' }
  const ms = closes.valueOf() - now
  if (ms <= 0) return { kind: 'closed' }
  const minutes = Math.floor(ms / 60_000)
  return { kind: 'open', minutes, tone: minutes < 60 ? 'urgent' : minutes < 24 * 60 ? 'soon' : 'normal' }
}
