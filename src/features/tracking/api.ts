import { publicHttp } from '@/api/http'
import type { PublicTrackingDecisionRequest, PublicTrackingOtpResponse, PublicTrackingResponse } from '@/api/types'

const base = '/api/public/track'

/**
 * `PublicTrackingController` (phase 4 §6): no session, no `Authorization`. Reads are limited to 60 a minute per IP, the
 * code and the decision to 10 (`TooManyRequests`).
 */
export const trackingApi = {
  get: (token: string, signal?: AbortSignal) => publicHttp.get<PublicTrackingResponse>(`${base}/${encodeURIComponent(token)}`, signal),
  /** Sends the code by WhatsApp, or by SMS when WhatsApp is not possible now. */
  sendOtp: (token: string, quotationId: string) => publicHttp.post<PublicTrackingOtpResponse>(`${base}/${encodeURIComponent(token)}/quotation/${quotationId}/otp`),
  /** The whole page again, updated. */
  decide: (token: string, quotationId: string, body: PublicTrackingDecisionRequest) =>
    publicHttp.post<PublicTrackingResponse>(`${base}/${encodeURIComponent(token)}/quotation/${quotationId}/decision`, body),
}

export const trackingKeys = {
  page: (token: string) => ['publicTracking', token] as const,
}
