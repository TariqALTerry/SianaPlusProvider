import type { ProviderWhatsAppResponse, SaveProviderWhatsAppRequest } from '@/api/types'

/** The template names the shop must approve in its own Meta account to send from its number (phase 4 §5). */
export const REQUIRED_TEMPLATES = [
  'counter_intake_received',
  'counter_quote_ready',
  'counter_quote_reminder',
  'counter_ready_for_pickup',
  'counter_not_repairable',
  'counter_pickup_reminder',
  'counter_completed',
  'counter_otp',
] as const

export interface LinkDraft {
  phoneNumberId: string
  wabaId: string
  /** Blank = keep the saved token. */
  accessToken: string
  /** Blank = keep the saved secret. */
  appSecret: string
  clearAppSecret: boolean
  language: string
  enabled: boolean
}

export function linkDraft(s: ProviderWhatsAppResponse | undefined): LinkDraft {
  return {
    phoneNumberId: s?.phoneNumberId ?? '',
    wabaId: s?.wabaId ?? '',
    accessToken: '',
    appSecret: '',
    clearAppSecret: false,
    language: s?.language || 'ar',
    enabled: s?.enabled ?? false,
  }
}

const ID_RE = /^\d{1,64}$/
const LANGUAGE_RE = /^[a-zA-Z]{2,3}(_[a-zA-Z]{2})?$/

export type LinkProblem = 'phoneNumberId' | 'wabaId' | 'accessToken' | 'language'

/**
 * The server's checks before saving: digits-only ids (`WhatsAppIdInvalid`), a language code (`WhatsAppLanguageInvalid`),
 * and the first save — or turning sending on — needs both ids and the token (`WhatsAppLinkIncomplete`).
 */
export function linkProblems(d: LinkDraft, linked: boolean): LinkProblem[] {
  const out: LinkProblem[] = []
  const needAll = !linked || d.enabled
  const id = d.phoneNumberId.trim()
  const waba = d.wabaId.trim()
  if (id ? !ID_RE.test(id) : needAll) out.push('phoneNumberId')
  if (waba ? !ID_RE.test(waba) : needAll) out.push('wabaId')
  if (!linked && !d.accessToken.trim()) out.push('accessToken')
  if (d.language.trim() && !LANGUAGE_RE.test(d.language.trim())) out.push('language')
  return out
}

/** Blank secrets are sent as null so the saved ones stay. */
export function linkRequest(d: LinkDraft): SaveProviderWhatsAppRequest {
  return {
    phoneNumberId: d.phoneNumberId.trim() || null,
    wabaId: d.wabaId.trim() || null,
    accessToken: d.accessToken.trim() || null,
    appSecret: d.clearAppSecret ? null : d.appSecret.trim() || null,
    clearAppSecret: d.clearAppSecret,
    language: d.language.trim() || null,
    enabled: d.enabled,
  }
}

/** Changing an id or the token clears the verification: the page then says it needs a test. */
export function changesVerification(d: LinkDraft, s: Pick<ProviderWhatsAppResponse, 'phoneNumberId' | 'wabaId'> | undefined): boolean {
  if (!s) return false
  return d.phoneNumberId.trim() !== (s.phoneNumberId ?? '') || d.wabaId.trim() !== (s.wabaId ?? '') || d.accessToken.trim() !== ''
}

/** Which number messages go out from now. */
export function senderLabel(s: Pick<ProviderWhatsAppResponse, 'activeSender'>): 'provider' | 'platform' | 'none' {
  return s.activeSender === 'Provider' ? 'provider' : s.activeSender === 'Platform' ? 'platform' : 'none'
}
