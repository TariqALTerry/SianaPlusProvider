/**
 * Customer phone numbers are personal data (§15): full on detail pages, masked in lists and
 * exports unless the viewer asks. `0501231571` → `05X XXX 1571`; `+966501231571` → `+9665X XXX 1571`.
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '—'
  const d = phone.replace(/[\s-]/g, '')
  if (d.length < 7) return d.replace(/\d(?=\d{2})/g, 'X')
  const last4 = d.slice(-4)
  if (d.startsWith('+966')) return `+966 ${d.charAt(4)}X XXX ${last4}`
  if (d.startsWith('966')) return `966 ${d.charAt(3)}X XXX ${last4}`
  return `${d.slice(0, 2)}X XXX ${last4}`
}

/** Accounts deleted by the customer are anonymized: username `deleted-…` and no phone. */
export function isDeletedAccount(username: string | null | undefined, phone: string | null | undefined): boolean {
  return Boolean(username?.startsWith('deleted-')) && !phone
}

export function looksLikePhone(input: string): boolean {
  return /^\+?\d[\d\s-]{6,}$/.test(input.trim())
}

// ── Saudi mobile input (§4: fixed +966 prefix and 9 digits, LTR-isolated) ──────────────────

export const SAUDI_PREFIX = '+966'

/** Any spelling (`05…`, `5…`, `9665…`, `+9665…`, spaces, Arabic-Indic digits) → the 9 local digits. */
export function localMobileDigits(input: string): string {
  let d = input
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, '')
  // Strip the country code only once the mobile prefix 5 follows, so typing "+966 5…" key by key
  // doesn't swallow digits midway.
  if (d.startsWith('009665')) d = d.slice(5)
  else if (d.startsWith('9665')) d = d.slice(3)
  // A partly typed country code stays as typed until the 5 arrives.
  else if (d && ('00966'.startsWith(d) || '966'.startsWith(d))) return d
  if (d.startsWith('0')) d = d.slice(1)
  return d.slice(0, 9)
}

export function isSaudiMobile(localDigits: string): boolean {
  return /^5\d{8}$/.test(localDigits)
}

/** The 9 local digits → `+9665XXXXXXXX`, the form the backend stores. */
export function toSaudiE164(localDigits: string): string {
  return `${SAUDI_PREFIX}${localDigits}`
}

/** `+966501234567` → `+966 50 123 4567` for display. */
export function formatSaudiMobile(phone: string | null | undefined): string {
  if (!phone) return '—'
  const d = localMobileDigits(phone)
  if (d.length !== 9) return phone
  return `${SAUDI_PREFIX} ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`
}
