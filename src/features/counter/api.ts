import { http } from '@/api/http'
import { qk } from '@/api/keys'
import type {
  CounterCallLogRequest,
  CounterCustomerLookupResponse,
  CounterDecisionRequest,
  CounterDiscountRequest,
  BranchBoardResponse,
  CounterIntakeResponse,
  CounterItemWhatsAppResponse,
  ItemHoldResponse,
  ProviderPauseItemRequest,
  ResendWhatsAppRequest,
  CounterItemDetailResponse,
  CounterItemListRequest,
  CounterItemSummaryResponse,
  CounterPaymentRequest,
  CounterTabCountsResponse,
  CreateCounterIntakeRequest,
  IntakeAccessory,
  IntakeCondition,
  ListParams,
  PaginatedResponse,
} from '@/api/types'
import type { CounterTabKey } from './logic'

const base = '/api/provider/counter'

export type CounterListParams = Omit<ListParams<CounterItemListRequest>, 'tab'> & { tab?: CounterTabKey }

export interface HandoverInput {
  code: string | null
  allowDebt: boolean
  note: string | null
  signature: File | null
}

export interface PlatformIntakeInput {
  accessories: IntakeAccessory[]
  accessoriesNote: string | null
  conditions: IntakeCondition[]
  conditionNotes: string | null
  files: File[]
}

/** Repeated keys bind to a list in ASP.NET (`accessories=Charger&accessories=Box`). */
function appendAll(form: FormData, key: string, values: readonly string[]) {
  for (const v of values) form.append(key, v)
}

/**
 * `CounterController` (PROVIDER-BRANCHES-PROVIDER-PLATFORM-PROMPT phase 2): the owner, supervisors and front desk.
 * PDFs come back as Blobs (`http.blob`, the session's bearer token) for `lib/pdf`.
 */
export const counterApi = {
  /** `phone` any spelling; the reply's `phone` is normalized: send it back as is. `CounterPhoneInvalid`. */
  lookupCustomer: (phone: string, signal?: AbortSignal) => http.get<CounterCustomerLookupResponse>(`${base}/customers`, { phone }, signal),
  createIntake: (body: CreateCounterIntakeRequest) => http.post<CounterItemDetailResponse>(`${base}/intakes`, body),
  /** Up to 10 images per request (JPG/PNG/WEBP, 5 MB); the receipt is complete with two. */
  uploadPhotos: (id: string, files: File[], deviceId?: string | null) => {
    const form = new FormData()
    for (const f of files) form.append('files', f)
    if (deviceId) form.append('deviceId', deviceId)
    return http.post<CounterItemDetailResponse>(`${base}/items/${id}/photos`, form)
  },
  /** A PNG from the signature pad. */
  sign: (id: string, file: File) => http.upload<CounterItemDetailResponse>(`${base}/items/${id}/signature`, file),

  list: (params: CounterListParams, signal?: AbortSignal) => http.get<PaginatedResponse<CounterItemSummaryResponse>>(`${base}/items`, params, signal),
  counts: (branchId: string | undefined, signal?: AbortSignal) => http.get<CounterTabCountsResponse>(`${base}/items/counts`, { branchId }, signal),
  /** Photo and signature URLs are signed for 15 minutes: never cache them, read the detail again. */
  detail: (id: string, signal?: AbortSignal) => http.get<CounterItemDetailResponse>(`${base}/items/${id}`, undefined, signal),

  callLog: (id: string, quotationId: string, body: CounterCallLogRequest) => http.post<CounterItemDetailResponse>(`${base}/items/${id}/quotations/${quotationId}/call-log`, body),
  decision: (id: string, quotationId: string, body: CounterDecisionRequest) => http.post<CounterItemDetailResponse>(`${base}/items/${id}/quotations/${quotationId}/decision`, body),

  addPayment: (id: string, body: CounterPaymentRequest) => http.post<CounterItemDetailResponse>(`${base}/items/${id}/payments`, body),
  /** Replaces the previous discount; 0 removes it. */
  discount: (id: string, body: CounterDiscountRequest) => http.post<CounterItemDetailResponse>(`${base}/items/${id}/discount`, body),
  /** multipart: `code` or a `signature` image, `allowDebt`, `note`. */
  handover: (id: string, input: HandoverInput) => {
    const form = new FormData()
    if (input.code) form.append('code', input.code)
    form.append('allowDebt', String(input.allowDebt))
    if (input.note) form.append('note', input.note)
    if (input.signature) form.append('signature', input.signature)
    return http.post<CounterItemDetailResponse>(`${base}/items/${id}/handover`, form)
  },
  /** After opening WhatsApp or printing by hand. */
  shareLog: (id: string, document: 'Receipt' | 'Ready' | 'Invoice' | 'Warranty', channel: 'WhatsApp' | 'Print') =>
    http.post<unknown>(`${base}/items/${id}/share-log`, { document, channel }),

  receipt: (id: string, format: 'a5' | 'thermal') => http.blob(`${base}/items/${id}/receipt`, { format }, { timeout: 60_000 }),
  label: (id: string, deviceId?: string | null) => http.blob(`${base}/items/${id}/label`, { deviceId }, { timeout: 60_000 }),
  invoice: (id: string) => http.blob(`${base}/items/${id}/invoice`, undefined, { timeout: 60_000 }),
  warranty: (id: string) => http.blob(`${base}/items/${id}/warranty`, undefined, { timeout: 60_000 }),

  /** A platform (pickup and delivery) device that reached the branch: the light receipt and its photos (phase 2 §12). */
  platformIntake: (serviceItemId: string, deviceId: string, input: PlatformIntakeInput) => {
    const form = new FormData()
    appendAll(form, 'accessories', input.accessories)
    appendAll(form, 'conditions', input.conditions)
    if (input.accessoriesNote) form.append('accessoriesNote', input.accessoriesNote)
    if (input.conditionNotes) form.append('conditionNotes', input.conditionNotes)
    for (const f of input.files) form.append('files', f)
    return http.post<CounterIntakeResponse>(`/api/provider/work/items/${serviceItemId}/devices/${deviceId}/intake`, form)
  },
  deviceLabel: (serviceItemId: string, deviceId: string) => http.blob(`/api/provider/work/items/${serviceItemId}/devices/${deviceId}/label`, undefined, { timeout: 60_000 }),

  // ── Phase 4: the item's WhatsApp log (`CounterWhatsAppController`) ──
  messages: (id: string, signal?: AbortSignal) => http.get<CounterItemWhatsAppResponse>(`${base}/items/${id}/messages`, undefined, signal),
  /** One of `{ messageId }` (a failed or skipped one), `{ kind }` (a new one that applies now) or `{}` (the last failed one). */
  resend: (id: string, body: ResendWhatsAppRequest) => http.post<CounterItemWhatsAppResponse>(`${base}/items/${id}/messages/resend`, body),

  // ── Phase 5: branch operations (`BranchOperationsController`) ──
  /** `branchId` is required: one of the caller's branches (`BranchNotFound`). The front desk sees counter devices only. */
  board: (branchId: string, signal?: AbortSignal) => http.get<BranchBoardResponse>(`${base}/board`, { branchId }, signal),
  /** Owner and supervisors, a device at a branch (`PauseNotAtBranch`); the reason is required for a counter device. */
  pause: (serviceItemId: string, body: ProviderPauseItemRequest) => http.post<ItemHoldResponse>(`/api/provider/work/items/${serviceItemId}/pause`, body),
  resume: (serviceItemId: string) => http.post<ItemHoldResponse>(`/api/provider/work/items/${serviceItemId}/resume`),
  waiveStorage: (id: string, reason: string) => http.post<CounterItemDetailResponse>(`${base}/items/${id}/storage-fee/waive`, { reason }),
  /** Final: the device is `Abandoned`, the service `Completed`, no warranty. */
  abandon: (id: string, reason: string | null) => http.post<CounterItemDetailResponse>(`${base}/items/${id}/abandon`, { reason }),
}

export const counterKeys = {
  lists: () => [...qk.counter, 'list'] as const,
  list: (params: CounterListParams) => [...qk.counter, 'list', params] as const,
  counts: (branchId?: string) => [...qk.counter, 'counts', branchId ?? 'all'] as const,
  detail: (id: string) => [...qk.counter, 'detail', id] as const,
  customer: (phone: string) => [...qk.counter, 'customer', phone] as const,
  messages: (id: string) => [...qk.counter, 'messages', id] as const,
  board: (branchId: string) => [...qk.counter, 'board', branchId] as const,
}

/**
 * A counter write changes the item, the lists and counts, the shelf (a device moved), the work list (a counter item is
 * a service like any other) and the branch counts.
 */
export const COUNTER_INVALIDATION = [qk.counter, qk.workshop, qk.work, qk.branches, qk.transfers, qk.cashClose] as const
