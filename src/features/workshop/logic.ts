import { ApiError, toApiError } from '@/api/http'
import type {
  DeviceCustodyStage,
  ExecutorCandidateResponse,
  LegResponse,
  ProgressUpdateKind,
  ServiceItemLegType,
  ServiceItemStatus,
  TrackedDevice,
} from '@/api/types'

/**
 * The custody path, as the server enforces it (`ServiceTrackingService.Next`): one way, one step at a time.
 * From "ready" the device goes out with a technician or courier, or the customer collects it at the workshop.
 */
export const NEXT_STAGES: Record<DeviceCustodyStage, readonly DeviceCustodyStage[]> = {
  AtCustomer: ['PickedUp'],
  PickedUp: ['AtWorkshop'],
  AtWorkshop: ['ReadyForReturn'],
  ReadyForReturn: ['OutForReturn', 'Returned'],
  OutForReturn: ['Returned'],
  Returned: [],
}

/** Taking a device from the customer, or giving it back, needs their 4-digit code and a photo. */
export function isHandover(to: DeviceCustodyStage): boolean {
  return to === 'PickedUp' || to === 'Returned'
}

export interface CustodyStep {
  to: DeviceCustodyStage
  handover: boolean
}

export function nextSteps(stage: DeviceCustodyStage): CustodyStep[] {
  return (NEXT_STAGES[stage] ?? []).map((to) => ({ to, handover: isHandover(to) }))
}

/** Away from the customer: the workshop board's columns, in path order. */
export const WORKSHOP_STAGES = ['PickedUp', 'AtWorkshop', 'ReadyForReturn', 'OutForReturn'] as const satisfies readonly DeviceCustodyStage[]

/** The service no longer takes updates (`ServiceItemClosed`). */
export function isClosedStatus(status: ServiceItemStatus): boolean {
  return status === 'Completed' || status === 'Cancelled' || status === 'Refunded'
}

export function plannedTrip(legs: readonly LegResponse[], type: ServiceItemLegType): LegResponse | null {
  return legs.find((l) => l.type === type && l.status === 'Planned') ?? null
}

/**
 * Which trips make sense now: a pickup while a device is still with the customer, a return while one is away
 * (and not yet out). Planning again replaces the planned trip of that type.
 */
export function tripNeeds(devices: readonly Pick<TrackedDevice, 'stage'>[]): Record<ServiceItemLegType, boolean> {
  return {
    Pickup: devices.some((d) => d.stage === 'AtCustomer'),
    Return: devices.some((d) => d.stage === 'PickedUp' || d.stage === 'AtWorkshop' || d.stage === 'ReadyForReturn'),
  }
}

/**
 * Who can take a trip (`ExecutorCannotDeliver` otherwise): members with the delivery role, plus the technician
 * already on this service even without it. Delivery members first (that is their job), available ones before busy
 * ones; otherwise the server's order.
 */
export function tripCandidates(list: readonly ExecutorCandidateResponse[], assignedExecutorId: string | null | undefined): ExecutorCandidateResponse[] {
  const rank = (c: ExecutorCandidateResponse) => (c.canDeliver ? 0 : 2) + (c.availability === 'Available' ? 0 : 1)
  return list
    .filter((c) => c.canDeliver || c.executorId === assignedExecutorId)
    .map((c, i) => ({ c, i }))
    .sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i)
    .map((x) => x.c)
}

export const NOTE_MAX = 1000
/** The server accepts a ready date from (just before) now up to 120 days ahead. */
export const READY_MAX_DAYS = 120

export function noteRequired(kind: ProgressUpdateKind): boolean {
  return kind === 'Other' || kind === 'Delayed'
}

export type UpdateProblem = 'noteRequired' | 'noteTooLong' | 'readyInvalid'

export function updateProblems(input: { kind: ProgressUpdateKind; note: string; expectedReadyAt: string | null }, now = Date.now()): UpdateProblem[] {
  const out: UpdateProblem[] = []
  const note = input.note.trim()
  if (noteRequired(input.kind) && !note) out.push('noteRequired')
  if (note.length > NOTE_MAX) out.push('noteTooLong')
  if (input.expectedReadyAt) {
    const at = Date.parse(input.expectedReadyAt)
    if (Number.isNaN(at) || at < now - 3_600_000 || at > now + READY_MAX_DAYS * 86_400_000) out.push('readyInvalid')
  }
  return out
}

/** The customer's handover code: exactly four digits (Arabic-Indic digits typed on a phone count too). */
export function normalizeCode(raw: string): string {
  return raw.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/\D/g, '').slice(0, 4)
}

export function isValidCode(code: string): boolean {
  return /^\d{4}$/.test(code)
}

const tagKey = (s: string) => s.toUpperCase().replace(/[\s\-_]/g, '')

/** "ابحث بالملصق": `WS-1001`, `ws1001` or just `1001`; the item number matches too. */
export function matchesSearch(device: { tagCode: string | null; itemNumber: string | null }, query: string): boolean {
  const q = tagKey(query)
  if (!q) return true
  const tag = tagKey(device.tagCode ?? '')
  if (tag && (tag.includes(q) || tag.replace(/^WS/, '').includes(q))) return true
  return tagKey(device.itemNumber ?? '').includes(q)
}

/** Error codes of the tracking endpoints that get the platform's own wording (§2 of the brief). */
export const TRACKING_ERROR_CODES = [
  'CustodyStepInvalid',
  'HandoverCodeInvalid',
  'HandoverCodeLocked',
  'CustodyPhotoRequired',
  'TrackingPhotoInvalid',
  'ProgressNoteRequired',
  'ExpectedReadyAtInvalid',
  'ServiceItemClosed',
  'ExecutorCannotRepair',
  'ExecutorCannotDeliver',
  'ExecutorRolesRequired',
] as const

export type TrackingErrorCode = (typeof TRACKING_ERROR_CODES)[number]

export function trackingErrorCode(error: unknown): TrackingErrorCode | null {
  if (!error) return null
  const code = toApiError(error).errorCode
  return (TRACKING_ERROR_CODES as readonly string[]).includes(code ?? '') ? (code as TrackingErrorCode) : null
}

/**
 * The error a tracking dialog shows: known codes in our words (`translate(code, details)`), without the raw
 * `{ from, to }` details; anything else keeps the server's localized message.
 */
export function trackingError(error: unknown, translate: (code: TrackingErrorCode, details: Record<string, unknown>) => string): ApiError | null {
  if (!error) return null
  const e = toApiError(error)
  const code = trackingErrorCode(e)
  if (!code) return e
  const details = (e.details && typeof e.details === 'object' ? e.details : {}) as Record<string, unknown>
  return new ApiError({ status: e.status, errorCode: e.errorCode, message: translate(code, details), details: undefined })
}
