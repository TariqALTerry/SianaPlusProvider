import { http } from '@/api/http'
import { qk } from '@/api/keys'
import type {
  DeviceCustodyStage,
  PlanLegRequest,
  ProgressUpdateKind,
  ProgressUpdateResponse,
  ServiceTrackingResponse,
  WorkshopBoardResponse,
} from '@/api/types'
import { workKeys } from '@/features/work/api'

const base = '/api/provider'

export interface ProgressUpdateForm {
  kind: ProgressUpdateKind
  note: string | null
  expectedReadyAt: string | null
  file: File | null
}

export interface MoveDeviceForm {
  stage: DeviceCustodyStage
  code: string | null
  note: string | null
  file: File | null
  /** Only with `AtWorkshop`: the branch the device reached (default: the responsible branch). */
  branchId?: string | null
}

/**
 * `ProviderTrackingController` (SERVICE-TRACKING-PROVIDER-PLATFORM-PROMPT §1): progress updates, device custody,
 * pickup/return trips and the workshop board (member roles live in the team feature).
 */
export const trackingApi = {
  tracking: (id: string, signal?: AbortSignal) => http.get<ServiceTrackingResponse>(`${base}/work/items/${id}/tracking`, undefined, signal),
  postUpdate: (id: string, f: ProgressUpdateForm) =>
    http.form<ProgressUpdateResponse>(`${base}/work/items/${id}/updates`, { kind: f.kind, note: f.note, expectedReadyAt: f.expectedReadyAt }, f.file),
  moveDevice: (id: string, deviceId: string, f: MoveDeviceForm) =>
    http.form<ServiceTrackingResponse>(
      `${base}/work/items/${id}/devices/${deviceId}/custody`,
      { stage: f.stage, code: f.code, note: f.note, branchId: f.stage === 'AtWorkshop' ? f.branchId : null },
      f.file,
    ),
  planTrip: (id: string, body: PlanLegRequest) => http.post<ServiceTrackingResponse>(`${base}/work/items/${id}/trips`, body),
  cancelTrip: (id: string, tripId: string) => http.delete<ServiceTrackingResponse>(`${base}/work/items/${id}/trips/${tripId}`),
  board: (stage: DeviceCustodyStage | undefined, branchId: string | undefined, signal?: AbortSignal) =>
    http.get<WorkshopBoardResponse>(`${base}/workshop`, { stage, branchId }, signal),
}

export const trackingKeys = {
  /** Under the work item's own keys, so every work write refreshes it too. */
  tracking: (id: string) => [...workKeys.detail(id), 'tracking'] as const,
  board: (stage: DeviceCustodyStage | undefined, branchId?: string) => [...qk.workshop, 'board', stage ?? 'all', branchId ?? 'all'] as const,
}

/**
 * What a tracking write changes: the item (detail, timeline, status — reaching the workshop moves it to
 * Arrived), the workshop board, and the counts on the board and dashboard.
 */
export const TRACKING_INVALIDATION = [qk.work, qk.workshop, qk.board, qk.dashboard, qk.branches] as const
