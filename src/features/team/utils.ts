import type {
  CreateExecutorRequest,
  CreateSupervisorRequest,
  ExecutorAvailability,
  ExecutorResponse,
  LookupResponse,
  TeamMemberResponse,
  UpdateExecutorRequest,
} from '@/api/types'
import { isSaudiMobile, localMobileDigits, looksLikePhone, toSaudiE164 } from '@/lib/phone'

// ── URL state ────────────────────────────────────────────────────────────────

export const TEAM_TABS = ['technicians', 'members', 'supervisors'] as const
export type TeamTab = (typeof TEAM_TABS)[number]

/** One schema for the page and the technicians list: they share the query string. */
export const TEAM_URL_SCHEMA = {
  tab: 'technicians',
  search: '',
  availability: '',
  active: '',
  page: 1,
  pageSize: 25,
}

/** An unknown tab, or the supervisors tab for a supervisor (§7), falls back to technicians. */
export function resolveTab(raw: string, isOwner: boolean): TeamTab {
  const tab = (TEAM_TABS as readonly string[]).includes(raw) ? (raw as TeamTab) : 'technicians'
  return tab === 'supervisors' && !isOwner ? 'technicians' : tab
}

/**
 * Phones are stored as `+9665XXXXXXXX` and the server matches with `Contains`, so a typed
 * `050 123…` is searched by its local digits (`50123…`). Anything else goes as typed.
 */
export function executorSearchTerm(raw: string): string | undefined {
  const term = raw.trim()
  if (!term) return undefined
  if (looksLikePhone(term)) {
    const digits = localMobileDigits(term)
    if (digits) return digits
  }
  return term
}

// ── Availability ─────────────────────────────────────────────────────────────

/** `Busy` is derived from load (`ExecutorAvailabilityNotSettable`): never offered. */
export const SETTABLE_AVAILABILITY = ['Available', 'Offline', 'OnLeave'] as const satisfies readonly ExecutorAvailability[]
export type SettableAvailability = (typeof SETTABLE_AVAILABILITY)[number]

export function isSettableAvailability(value: string | null | undefined): value is SettableAvailability {
  return (SETTABLE_AVAILABILITY as readonly string[]).includes(value ?? '')
}

// ── Limits (ProvidersValidators) ─────────────────────────────────────────────

export const LIMITS = { name: 200, specialization: 200, email: 256, minJobs: 1, maxJobs: 50 } as const

// ── Drafts ───────────────────────────────────────────────────────────────────

export interface PersonDraft {
  fullName: string
  /** The 9 local digits held by `PhoneField`. */
  phone: string
  email: string
}

export interface ExecutorDraft extends PersonDraft {
  specialization: string
  maxJobs: string
  capabilityIds: string[]
}

export const EMPTY_PERSON: PersonDraft = { fullName: '', phone: '', email: '' }
export const EMPTY_EXECUTOR: ExecutorDraft = { ...EMPTY_PERSON, specialization: '', maxJobs: '1', capabilityIds: [] }

export type DraftError = 'required' | 'phone' | 'email' | 'range'
export type PersonErrors = Partial<Record<keyof PersonDraft, DraftError>>
export type ExecutorErrors = Partial<Record<keyof ExecutorDraft, DraftError>>

export function isEmailLike(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

/** Any spelling (`05…`, `5…`, `+9665…`) → `+9665XXXXXXXX`, or null when it is not a Saudi mobile. */
export function normalizePhone(input: string | null | undefined): string | null {
  const digits = localMobileDigits(input ?? '')
  return isSaudiMobile(digits) ? toSaudiE164(digits) : null
}

export function parseMaxJobs(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null
  const n = Number(raw)
  return n >= LIMITS.minJobs && n <= LIMITS.maxJobs ? n : null
}

export function validatePerson(d: PersonDraft): PersonErrors {
  const errors: PersonErrors = {}
  if (!d.fullName.trim()) errors.fullName = 'required'
  if (!d.phone) errors.phone = 'required'
  else if (!normalizePhone(d.phone)) errors.phone = 'phone'
  if (d.email.trim() && !isEmailLike(d.email)) errors.email = 'email'
  return errors
}

export function validateExecutor(d: ExecutorDraft): ExecutorErrors {
  const errors: ExecutorErrors = validatePerson(d)
  if (parseMaxJobs(d.maxJobs) === null) errors.maxJobs = 'range'
  return errors
}

export function hasErrors(errors: object): boolean {
  return Object.values(errors).some(Boolean)
}

const optional = (v: string) => v.trim() || null

export function supervisorBody(d: PersonDraft): CreateSupervisorRequest {
  return { fullName: d.fullName.trim(), phone: normalizePhone(d.phone) ?? '', email: optional(d.email) }
}

export function executorProfileBody(d: ExecutorDraft): UpdateExecutorRequest {
  return {
    fullName: d.fullName.trim(),
    phone: normalizePhone(d.phone) ?? '',
    email: optional(d.email),
    specialization: optional(d.specialization),
    maxConcurrentJobs: parseMaxJobs(d.maxJobs) ?? 0,
  }
}

export function createExecutorBody(d: ExecutorDraft): CreateExecutorRequest {
  return { ...executorProfileBody(d), capabilityIds: [...new Set(d.capabilityIds)] }
}

export function draftFromExecutor(e: ExecutorResponse): ExecutorDraft {
  return {
    fullName: e.fullName,
    phone: localMobileDigits(e.phone ?? ''),
    email: e.email ?? '',
    specialization: e.specialization ?? '',
    maxJobs: String(e.maxConcurrentJobs),
    capabilityIds: e.capabilities.map((c) => c.id),
  }
}

/** The phone is the technician's login: changing it is worth a warning. Compared in stored form. */
export function phoneChanged(original: Pick<ExecutorResponse, 'phone'>, draftPhone: string): boolean {
  const next = normalizePhone(draftPhone)
  if (!next) return false
  return next !== (normalizePhone(original.phone) ?? original.phone ?? '')
}

export function profileChanged(original: ExecutorResponse, body: UpdateExecutorRequest): boolean {
  const originalPhone = normalizePhone(original.phone) ?? original.phone ?? ''
  return (
    body.fullName !== original.fullName ||
    body.phone !== originalPhone ||
    (body.email ?? '') !== (original.email ?? '') ||
    (body.specialization ?? '') !== (original.specialization ?? '') ||
    body.maxConcurrentJobs !== original.maxConcurrentJobs
  )
}

export function sameSet(a: readonly string[], b: readonly string[]): boolean {
  const sa = new Set(a)
  const sb = new Set(b)
  return sa.size === sb.size && [...sa].every((x) => sb.has(x))
}

// ── Skills ───────────────────────────────────────────────────────────────────

export interface SkillOption extends LookupResponse {
  /** Held by the technician but no longer one of the organization's capabilities: removable only. */
  outside?: boolean
}

/** The organization's capabilities, then any held skill outside them (shown so it can be removed). */
export function skillOptions(orgCapabilities: readonly LookupResponse[], held: readonly LookupResponse[] = []): SkillOption[] {
  const orgIds = new Set(orgCapabilities.map((c) => c.id))
  return [...orgCapabilities, ...held.filter((c) => !orgIds.has(c.id)).map((c) => ({ ...c, outside: true }))]
}

export function selectedOutside(options: readonly SkillOption[], selected: readonly string[]): boolean {
  return options.some((o) => o.outside && selected.includes(o.id))
}

// ── Server errors → fields ───────────────────────────────────────────────────

const FIELD_BY_CODE: Record<string, keyof ExecutorDraft> = {
  FullNameRequired: 'fullName',
  FullNameTooLong: 'fullName',
  PhoneNumberRequired: 'phone',
  PhoneNumberInvalid: 'phone',
  PhoneAlreadyRegistered: 'phone',
  EmailInvalid: 'email',
  EmailTooLong: 'email',
  SpecializationTooLong: 'specialization',
  MaxConcurrentJobsOutOfRange: 'maxJobs',
  ExecutorCapabilityNotInOrganization: 'capabilityIds',
  CapabilityIdsRequired: 'capabilityIds',
  CapabilityIdRequired: 'capabilityIds',
}

/** Which form field shows a server error's message; null keeps it at the dialog bottom. */
export function fieldForError(code: string | null | undefined): keyof ExecutorDraft | null {
  return (code && FIELD_BY_CODE[code]) || null
}

// ── Members ──────────────────────────────────────────────────────────────────

/** An independent technician's owner is also its executor (shown with an owner badge). */
export function ownerUserIds(members: readonly TeamMemberResponse[] | undefined): Set<string> {
  return new Set((members ?? []).filter((m) => m.role === 'Owner').map((m) => m.userId))
}

export function supervisorsOf(members: readonly TeamMemberResponse[] | undefined): TeamMemberResponse[] {
  return (members ?? []).filter((m) => m.role === 'Supervisor')
}

/** Wraps a phone in LTR isolates so it reads correctly inside an Arabic sentence. */
export function ltrIsolate(value: string): string {
  return `⁦${value}⁩`
}
