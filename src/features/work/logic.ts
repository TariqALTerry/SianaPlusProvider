import { toApiError, ApiError } from '@/api/http'
import type { ExecutorCandidateResponse, HomeInspectionCheckResponse, HomeInspectionStatus, ServiceItemProviderView, ServiceItemStatus } from '@/api/types'
import { isoToRiyadhInput, nowRiyadh, parseUtc } from '@/lib/format'

/** Quick tabs above the work list (§8.4), in the brief's order. */
export const WORK_TABS = ['all', 'needsTechnician', 'awaitingTechnician', 'scheduled', 'inProgress', 'onHold', 'finished'] as const
export type WorkTab = (typeof WORK_TABS)[number]

export const TAB_STATUSES: Record<WorkTab, ServiceItemStatus[]> = {
  all: [],
  needsTechnician: ['AssignedToProvider', 'Rejected'],
  awaitingTechnician: ['AssignedToExecutor'],
  scheduled: ['Accepted', 'Scheduled'],
  inProgress: ['EnRoute', 'Arrived', 'Assessment', 'WaitingCustomerApproval', 'InProgress', 'WaitingCustomerConfirmation'],
  onHold: ['Paused', 'Disputed'],
  finished: ['Completed', 'Cancelled', 'Refunded', 'PartiallyRefunded'],
}

export function isWorkTab(value: string): value is WorkTab {
  return (WORK_TABS as readonly string[]).includes(value)
}

/** Explicit `?status=` (from the home distribution bar) wins over the tab. */
export function statusesFor(tab: string, explicit: readonly string[]): ServiceItemStatus[] {
  if (explicit.length) return explicit as ServiceItemStatus[]
  return isWorkTab(tab) ? TAB_STATUSES[tab] : []
}

/**
 * The backend's "active for the organization" set (`ServiceItemStateMachine.IsActiveForProvider`):
 * the dashboard's `activeItems` is the sum of exactly these.
 */
export const PROVIDER_ACTIVE_STATUSES: readonly ServiceItemStatus[] = [
  'AssignedToProvider', 'AssignedToExecutor', 'Accepted', 'Scheduled', 'EnRoute', 'Arrived', 'Assessment',
  'WaitingCustomerApproval', 'InProgress', 'WaitingCustomerConfirmation', 'Paused',
]

export const TERMINAL_STATUSES: readonly ServiceItemStatus[] = ['Completed', 'Cancelled', 'Refunded', 'PartiallyRefunded']

/** An open item polls every 30 s while it can still change (§10). */
export function isLiveStatus(status: ServiceItemStatus): boolean {
  return !TERMINAL_STATUSES.includes(status)
}

/** Before an executor accepts, the server withholds the customer's phone and door (§8.4). */
export const CONTACT_HIDDEN_STATUSES: readonly ServiceItemStatus[] = ['Created', 'PendingAssignment', 'AssignedToProvider', 'AssignedToExecutor', 'Rejected']

export function isContactHidden(status: ServiceItemStatus): boolean {
  return CONTACT_HIDDEN_STATUSES.includes(status)
}

export type WorkActionKey = 'assign' | 'reassign' | 'unassign' | 'delegate' | 'schedule' | 'reject'

const ASSIGNABLE: readonly ServiceItemStatus[] = ['AssignedToProvider', 'Rejected']
const REASSIGNABLE: readonly ServiceItemStatus[] = ['AssignedToExecutor', 'Accepted', 'Scheduled', 'Paused']
const DELEGATABLE: readonly ServiceItemStatus[] = ['AssignedToProvider', 'AssignedToExecutor', 'Rejected', 'Accepted', 'Scheduled', 'Paused']
const SCHEDULABLE: readonly ServiceItemStatus[] = ['AssignedToProvider', 'AssignedToExecutor', 'Accepted', 'Scheduled']
const REJECTABLE: readonly ServiceItemStatus[] = ['AssignedToProvider', 'AssignedToExecutor']

/**
 * Which actions to offer for the item's state (the brief's action table, §8.4). A UI hint
 * only: the server decides, and its message is shown when it refuses.
 */
export function availableWorkActions(item: Pick<ServiceItemProviderView, 'status' | 'executor'>): Set<WorkActionKey> {
  const s = item.status
  const a = new Set<WorkActionKey>()
  if (ASSIGNABLE.includes(s) && !item.executor) a.add('assign')
  if (REASSIGNABLE.includes(s) && item.executor) {
    a.add('reassign')
    a.add('unassign')
  }
  if (DELEGATABLE.includes(s)) a.add('delegate')
  if (SCHEDULABLE.includes(s)) a.add('schedule')
  if (REJECTABLE.includes(s)) a.add('reject')
  return a
}

/** Incoming cards: a technician-declined (`Rejected`) item can't be declined by the organization. */
export function canRejectIncoming(status: ServiceItemStatus): boolean {
  return REJECTABLE.includes(status)
}

/**
 * `POST …/delegate` records the delegation and tries to auto-assign; when no technician
 * qualifies the server appends `AutoAssignSkipped` and returns the item unchanged — still
 * waiting for a technician, with none set.
 */
export function delegateSkipped(view: Pick<ServiceItemProviderView, 'status' | 'executor'>): boolean {
  return !view.executor && ASSIGNABLE.includes(view.status)
}

export type IneligibleReason = 'cannotRepair' | 'offDutyTimeOff' | 'offDutyHours' | 'capabilities' | 'unavailable' | 'maxJobs'

/**
 * Why a candidate can't take the item (§8.5): قدرات ناقصة · غير متاح · وصل الحد الأقصى.
 * The server's `isEligible` also requires an active account; an inactive technician counts as
 * "غير متاح".
 */
export function ineligibleReasons(c: ExecutorCandidateResponse): IneligibleReason[] {
  if (c.isEligible) return []
  // Without the repair role (delivery only) a member is never offered a repair; nothing else matters here.
  if (!c.canRepair) return ['cannotRepair']
  const r: IneligibleReason[] = []
  // Off duty at the visit time (PHASE2 §5): on time off, or outside the weekly working hours.
  if (c.isOffDuty) r.push(c.offDutyReason === 'TimeOff' ? 'offDutyTimeOff' : 'offDutyHours')
  if (!c.hasAllCapabilities) r.push('capabilities')
  if (c.availability !== 'Available') r.push('unavailable')
  if (!c.hasCapacity) r.push('maxJobs')
  if (r.length === 0) r.push('unavailable')
  return r
}

/** "الأنسب" goes on the first eligible row; the server already sorted the list. */
export function bestCandidateId(list: readonly ExecutorCandidateResponse[]): string | null {
  return list.find((c) => c.isEligible)?.executorId ?? null
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '؟'
  // Arabic family names usually carry the article: العتيبي → ع.
  const lead = (word: string) => (word.length > 2 && word.startsWith('ال') ? word.charAt(2) : word.charAt(0))
  const first = lead(parts[0]!)
  const last = parts.length > 1 ? lead(parts[parts.length - 1]!) : ''
  return (first + last).toUpperCase()
}

/** 0..1 ratio for load bars; a zero cap reads as full. */
export function loadRatio(used: number, total: number): number {
  if (total <= 0) return 1
  return Math.max(0, Math.min(1, used / total))
}

/** Commission taken by the platform (`finalAmount - netAmount`), never negative. */
export function commissionAmount(finalAmount: number, netAmount: number): number {
  return Math.max(0, Math.round((finalAmount - netAmount) * 100) / 100)
}

export type WorkErrorDetail =
  | { kind: 'capacity'; maxConcurrentJobs: number; activeJobs: number }
  | { kind: 'capabilities'; count: number }
  | { kind: 'transition'; from: string | null; to: string | null }
  /** The item moved on under the dialog: these carry no data, and the item is refetched. */
  | { kind: 'notReassignable' }
  | { kind: 'notAssigned' }
  | { kind: 'concurrent' }
  /** `ExecutorCannotRepair`: the picked member has no repair role. */
  | { kind: 'cannotRepair' }

/** Codes meaning the item changed elsewhere (another supervisor, the technician, the platform). */
export const STALE_ITEM_CODES: Record<string, 'notReassignable' | 'notAssigned' | 'concurrent'> = {
  ServiceItemNotReassignable: 'notReassignable',
  ExecutorNotAssigned: 'notAssigned',
  ConcurrentModification: 'concurrent',
}

export function isStaleItemDetail(detail: WorkErrorDetail | null): boolean {
  return detail?.kind === 'notReassignable' || detail?.kind === 'notAssigned' || detail?.kind === 'concurrent'
}

/**
 * Structured `data` on assignment errors (§8.4) → a typed detail the dialog can phrase, and
 * the error without its raw details (so the generic inline error shows just the message).
 */
export function workErrorDetail(error: unknown): { error: ApiError | null; detail: WorkErrorDetail | null } {
  if (!error) return { error: null, detail: null }
  const e = toApiError(error)
  const d = (e.details && typeof e.details === 'object' ? e.details : {}) as Record<string, unknown>
  let detail: WorkErrorDetail | null = null
  if (e.errorCode === 'ExecutorAtCapacity' && typeof d.maxConcurrentJobs === 'number' && typeof d.activeJobs === 'number') {
    detail = { kind: 'capacity', maxConcurrentJobs: d.maxConcurrentJobs, activeJobs: d.activeJobs }
  } else if (e.errorCode === 'ExecutorLacksCapability' && Array.isArray(d.missingCapabilityIds)) {
    detail = { kind: 'capabilities', count: d.missingCapabilityIds.length }
  } else if (e.errorCode === 'InvalidStatusTransition') {
    detail = { kind: 'transition', from: typeof d.from === 'string' ? d.from : null, to: typeof d.to === 'string' ? d.to : null }
  } else if (e.errorCode === 'ExecutorCannotRepair') {
    detail = { kind: 'cannotRepair' }
  } else if (e.errorCode && STALE_ITEM_CODES[e.errorCode]) {
    detail = { kind: STALE_ITEM_CODES[e.errorCode]! }
  }
  const stripped = new ApiError({ status: e.status, errorCode: e.errorCode, message: e.message, details: undefined })
  return { error: stripped, detail }
}

export const SCHEDULE_INPUT_FORMAT = 'YYYY-MM-DDTHH:mm'

/** Default window: the current one if it is still ahead, else the next full hour + 2 h. */
export function defaultScheduleWindow(start: string | null, end: string | null, now = nowRiyadh()): { start: string; end: string } {
  const s = parseUtc(start)
  if (s && s.valueOf() > now.valueOf()) {
    return { start: isoToRiyadhInput(start), end: end ? isoToRiyadhInput(end) : isoToRiyadhInput(s.add(2, 'hour').toISOString()) }
  }
  const base = now.add(1, 'hour').startOf('hour')
  return { start: base.format(SCHEDULE_INPUT_FORMAT), end: base.add(2, 'hour').format(SCHEDULE_INPUT_FORMAT) }
}

// ── «صحة بيتك» (HOME-SUBSCRIPTIONS-PROVIDER-PLATFORM-PHASE2-PROMPT §2) ──

/** `GET …/home-inspection` answers this for a covered visit that is not a health check: hide the report. */
export function isInspectionNotRequired(error: unknown): boolean {
  return !!error && toApiError(error).errorCode === 'HomeInspectionNotRequired'
}

/** A draft's progress bar: checks the technician has answered, out of the whole list. */
export function inspectionProgress(checks: readonly Pick<HomeInspectionCheckResponse, 'result'>[]): { done: number; total: number } {
  return { done: checks.filter((c) => c.result !== null).length, total: checks.length }
}

/** Score colour: green from 80, yellow from 50, red below. The score itself comes from the server. */
export function inspectionScoreTone(score: number): 'success' | 'waiting' | 'danger' {
  if (score >= 80) return 'success'
  if (score >= 50) return 'waiting'
  return 'danger'
}

/**
 * Where the technician can still finish the visit, so an unsent report will block it
 * (`HomeInspectionRequired`). From `WaitingCustomerConfirmation` on, they already have.
 */
export const INSPECTION_GATE_STATUSES: readonly ServiceItemStatus[] = [
  'AssignedToExecutor', 'Accepted', 'Scheduled', 'EnRoute', 'Arrived', 'Assessment', 'WaitingCustomerApproval', 'InProgress', 'Paused',
]

export function showsInspectionWarning(itemStatus: ServiceItemStatus, inspectionStatus: HomeInspectionStatus | null): boolean {
  return inspectionStatus !== 'Submitted' && INSPECTION_GATE_STATUSES.includes(itemStatus)
}

/** "مقترحات للعميل": what needs work, urgent first. Read only — the customer orders it from the report. */
export function inspectionSuggestions<C extends Pick<HomeInspectionCheckResponse, 'result'>>(checks: readonly C[]): C[] {
  const rank = (c: C) => (c.result === 'Urgent' ? 0 : 1)
  return checks.filter((c) => c.result === 'Urgent' || c.result === 'NeedsAttention').sort((a, b) => rank(a) - rank(b))
}
