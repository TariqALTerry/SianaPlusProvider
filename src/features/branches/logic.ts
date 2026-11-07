import type { BranchOpeningHoursRequest, DayOfWeek, ProviderBranchResponse, SaveProviderBranchRequest } from '@/api/types'

// ── The branch form (SaveProviderBranchRequest, phase 1 §3) ───────────────────

export const BRANCH_LIMITS = { name: 150, field: 150, phone: 30, terms: 4000, footer: 500, abandonMin: 30, abandonMax: 365, feeMax: 20, freeMin: 3, freeMax: 90 } as const

/** 2–6 Latin letters or digits; the server stores it upper-case and keeps it unique in the organization. */
export const BRANCH_CODE_RE = /^[A-Za-z0-9]{2,6}$/

export interface BranchDraft {
  name: string
  code: string
  /** Free text (a landline or a mobile), ≤ 30. */
  phone: string
  whatsAppNumber: string
  city: string
  district: string
  addressLine: string
  latitude: number | null
  longitude: number | null
  receivesPlatformDevices: boolean
  counterEnabled: boolean
  autoSendWhatsApp: boolean
  allowScanToClaim: boolean
  termsText: string
  receiptFooter: string
  abandonAfterDays: string
  storageFeePerDay: string
  freeStorageDays: string
}

export const EMPTY_BRANCH: BranchDraft = {
  name: '',
  code: '',
  phone: '',
  whatsAppNumber: '',
  city: '',
  district: '',
  addressLine: '',
  latitude: null,
  longitude: null,
  receivesPlatformDevices: true,
  counterEnabled: false,
  autoSendWhatsApp: false,
  allowScanToClaim: false,
  termsText: '',
  receiptFooter: '',
  abandonAfterDays: '',
  storageFeePerDay: '',
  freeStorageDays: '',
}

const num = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v))

export function branchDraft(b: ProviderBranchResponse): BranchDraft {
  return {
    name: b.name,
    code: b.code,
    phone: b.phone ?? '',
    whatsAppNumber: b.whatsAppNumber ?? '',
    city: b.city ?? '',
    district: b.district ?? '',
    addressLine: b.addressLine ?? '',
    latitude: b.latitude,
    longitude: b.longitude,
    receivesPlatformDevices: b.receivesPlatformDevices,
    counterEnabled: b.counterEnabled,
    autoSendWhatsApp: b.autoSendWhatsApp,
    allowScanToClaim: b.allowScanToClaim,
    termsText: b.termsText ?? '',
    receiptFooter: b.receiptFooter ?? '',
    abandonAfterDays: num(b.abandonAfterDays),
    storageFeePerDay: num(b.storageFeePerDay),
    freeStorageDays: num(b.freeStorageDays),
  }
}

const text = (v: string) => (v.trim() ? v.trim() : null)
const optionalNumber = (v: string): number | null => (v.trim() === '' ? null : Number(v))

/**
 * The full-replace body. Coordinates go together or not at all (`CoordinatesIncomplete`);
 * Blank abandon days, fee and free days are null: the server applies 90 days, no fee and 7 free days (phase 5 §4).
 */
export function branchRequest(d: BranchDraft): SaveProviderBranchRequest {
  const hasPoint = d.latitude !== null && d.longitude !== null
  return {
    name: d.name.trim(),
    code: d.code.trim().toUpperCase(),
    phone: text(d.phone),
    whatsAppNumber: text(d.whatsAppNumber),
    city: text(d.city),
    district: text(d.district),
    addressLine: text(d.addressLine),
    latitude: hasPoint ? Math.round(d.latitude! * 1e6) / 1e6 : null,
    longitude: hasPoint ? Math.round(d.longitude! * 1e6) / 1e6 : null,
    receivesPlatformDevices: d.receivesPlatformDevices,
    counterEnabled: d.counterEnabled,
    autoSendWhatsApp: d.autoSendWhatsApp,
    allowScanToClaim: d.allowScanToClaim,
    termsText: text(d.termsText),
    receiptFooter: text(d.receiptFooter),
    abandonAfterDays: optionalNumber(d.abandonAfterDays),
    storageFeePerDay: optionalNumber(d.storageFeePerDay),
    freeStorageDays: optionalNumber(d.freeStorageDays),
  }
}

export type BranchFieldError = 'required' | 'tooLong' | 'codeInvalid' | 'abandonRange' | 'feeRange' | 'freeRange'
export type BranchErrors = Partial<Record<keyof BranchDraft, BranchFieldError>>

/** The checks the server makes, so most mistakes show next to the field before saving. */
export function validateBranch(d: BranchDraft): BranchErrors {
  const errors: BranchErrors = {}
  if (!d.name.trim()) errors.name = 'required'
  else if (d.name.trim().length > BRANCH_LIMITS.name) errors.name = 'tooLong'
  if (!BRANCH_CODE_RE.test(d.code.trim())) errors.code = 'codeInvalid'
  if (d.phone.trim().length > BRANCH_LIMITS.phone) errors.phone = 'tooLong'
  if (d.whatsAppNumber.trim().length > BRANCH_LIMITS.phone) errors.whatsAppNumber = 'tooLong'
  for (const k of ['city', 'district', 'addressLine'] as const) if (d[k].trim().length > BRANCH_LIMITS.field) errors[k] = 'tooLong'
  if (d.termsText.length > BRANCH_LIMITS.terms) errors.termsText = 'tooLong'
  if (d.receiptFooter.length > BRANCH_LIMITS.footer) errors.receiptFooter = 'tooLong'
  const abandon = optionalNumber(d.abandonAfterDays)
  if (abandon !== null && (!Number.isInteger(abandon) || abandon < BRANCH_LIMITS.abandonMin || abandon > BRANCH_LIMITS.abandonMax)) errors.abandonAfterDays = 'abandonRange'
  const fee = optionalNumber(d.storageFeePerDay)
  if (fee !== null && (!Number.isFinite(fee) || fee < 0 || fee > BRANCH_LIMITS.feeMax)) errors.storageFeePerDay = 'feeRange'
  const free = optionalNumber(d.freeStorageDays)
  if (free !== null && (!Number.isInteger(free) || free < BRANCH_LIMITS.freeMin || free > BRANCH_LIMITS.freeMax)) errors.freeStorageDays = 'freeRange'
  return errors
}

/** Server error codes that belong to one field of the form. */
export function branchFieldForError(code: string | null | undefined): keyof BranchDraft | null {
  switch (code) {
    case 'BranchCodeTaken':
    case 'BranchCodeInvalid':
      return 'code'
    case 'BranchNameRequired':
    case 'BranchNameTooLong':
      return 'name'
    case 'BranchAbandonDaysInvalid':
      return 'abandonAfterDays'
    case 'BranchStorageFeeInvalid':
      return 'storageFeePerDay'
    case 'BranchFreeStorageDaysInvalid':
      return 'freeStorageDays'
    default:
      return null
  }
}

// ── Opening hours (phase 1 §3) ───────────────────────────────────────────────

export const WEEK: readonly DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** `open` with times, `closed` all day, or `unset` (not sent, so not published). */
export interface HoursRow {
  day: DayOfWeek
  mode: 'open' | 'closed' | 'unset'
  opens: string
  closes: string
}

export function hoursRows(days: ProviderBranchResponse['openingHours']): HoursRow[] {
  return WEEK.map((day) => {
    const d = days.find((x) => x.dayOfWeek === day)
    if (!d) return { day, mode: 'unset', opens: '09:00', closes: '21:00' }
    if (d.isClosed) return { day, mode: 'closed', opens: '09:00', closes: '21:00' }
    return { day, mode: 'open', opens: d.opens ?? '09:00', closes: d.closes ?? '21:00' }
  })
}

export function hoursRequest(rows: readonly HoursRow[]): BranchOpeningHoursRequest[] {
  return rows
    .filter((r) => r.mode !== 'unset')
    .map((r) => (r.mode === 'closed' ? { dayOfWeek: r.day, isClosed: true, opens: null, closes: null } : { dayOfWeek: r.day, isClosed: false, opens: r.opens, closes: r.closes }))
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

/** Open days whose times are malformed or do not close after they open (`BranchOpeningHoursInvalid`). */
export function invalidHours(rows: readonly HoursRow[]): DayOfWeek[] {
  return rows.filter((r) => r.mode === 'open' && (!HHMM.test(r.opens) || !HHMM.test(r.closes) || r.closes <= r.opens)).map((r) => r.day)
}

// ── Closures (phase 1 §3) ────────────────────────────────────────────────────

/** `yyyy-MM-dd` dates: the end on or after the start, and within a year of today (`BranchClosureInvalid`). */
export function closureProblem(startsOn: string, endsOn: string, today: string): 'missing' | 'order' | 'past' | 'tooFar' | null {
  if (!startsOn || !endsOn) return 'missing'
  if (endsOn < startsOn) return 'order'
  if (endsOn < today) return 'past'
  const limit = new Date(`${today}T00:00:00Z`)
  limit.setUTCFullYear(limit.getUTCFullYear() + 1)
  if (endsOn > limit.toISOString().slice(0, 10)) return 'tooFar'
  return null
}
