import type {
  BranchBoardItem,
  BranchBoardStageCount,
  BranchOptionResponse,
  CounterIntakeResponse,
  CounterItemDetailResponse,
  CounterMoneyResponse,
  CounterStorageResponse,
  CounterTabCountsResponse,
  CreateCounterIntakeRequest,
  IntakeAccessory,
  IntakeCondition,
  IntakeEstimateType,
  MyCounterAccessResponse,
  PaymentMethod,
  PowersOnState,
  HoldReason,
  ProviderPauseItemRequest,
  ServiceItemStatus,
  WhatsAppAvailabilityResponse,
  WhatsAppTemplateKind,
  ProviderSubscriptionOverviewResponse,
} from '@/api/types'
import type { ProviderRoleKind } from '@/features/auth/authStore'
import { riyadhInputToIso } from '@/lib/format'
import { localMobileDigits, toSaudiE164 } from '@/lib/phone'

// ── Tabs (phase 2 §5) ────────────────────────────────────────────────────────

/** The `tab` query values, in screen order; `all` is the server's default. */
export const COUNTER_TABS = ['received', 'inProgress', 'awaitingCustomer', 'ready', 'delivered', 'all'] as const
export type CounterTabKey = (typeof COUNTER_TABS)[number]

export function parseCounterTab(raw: string | null | undefined): CounterTabKey {
  return (COUNTER_TABS as readonly string[]).includes(raw ?? '') ? (raw as CounterTabKey) : 'received'
}

/** The `CounterTab` enum value of a tab, for its label. */
export function tabEnum(tab: CounterTabKey): 'Received' | 'InProgress' | 'AwaitingCustomer' | 'Ready' | 'Delivered' | 'All' {
  return (tab.charAt(0).toUpperCase() + tab.slice(1)) as ReturnType<typeof tabEnum>
}

/** The count on a tab; `all` has none (it is not a work queue). */
export function tabCount(tab: CounterTabKey, counts: CounterTabCountsResponse | undefined): number | null {
  if (!counts || tab === 'all') return null
  return counts[tab]
}

// ── Find by phone, intake number, IMEI or a scanned label (phase 2 §5) ───────

/**
 * A scanned code is the intake number (the label and the receipt QR hold `barcodeValue`). A code that is a link keeps
 * its last path segment; anything else is searched as typed.
 */
export function scanToSearch(raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) {
    try {
      const parts = new URL(value).pathname.split('/').filter(Boolean)
      return decodeURIComponent(parts[parts.length - 1] ?? value)
    } catch {
      return value
    }
  }
  return value
}

// ── The gate (phase 2 §3, phase 3 §2) ────────────────────────────────────────

export type GateReason =
  | 'CounterModuleDisabled'
  | 'CounterSubscriptionPendingPayment'
  | 'CounterSubscriptionExpired'
  | 'BranchCounterDisabled'
  | 'BranchInactive'
  | 'NoCounterBranch'
  | 'NoBranch'

export type CounterGate = { open: true } | { open: false; reason: GateReason }

const SUBSCRIPTION_REASONS = new Set<GateReason>(['CounterModuleDisabled', 'CounterSubscriptionPendingPayment', 'CounterSubscriptionExpired'])

/** A reason that the subscription page answers (vs. a branch setting). */
export function isSubscriptionReason(reason: GateReason): boolean {
  return SUBSCRIPTION_REASONS.has(reason)
}

/**
 * Whether "استلام جديد" is offered. The subscription half comes from the server, never computed here: the owner and
 * supervisors read `counterAvailable` / `counterBlockedReason` from the subscription; a front-desk account reads the same
 * gate from `GET me/branches` (`counter.available` / `counter.reason`, see `accessAsOverview`).
 *
 * - `branch`: the branch the intake would go to (the switcher's), or null for "all branches".
 * - `branches`: the caller's branches, to know whether any runs the counter.
 */
export function counterGate(input: {
  overview: Pick<ProviderSubscriptionOverviewResponse, 'counterAvailable' | 'counterBlockedReason'> | null | undefined
  branch: Pick<BranchOptionResponse, 'isActive' | 'counterEnabled'> | null
  branches: ReadonlyArray<Pick<BranchOptionResponse, 'isActive' | 'counterEnabled'>>
}): CounterGate {
  const { overview, branch, branches } = input
  if (overview && !overview.counterAvailable) {
    const reason = overview.counterBlockedReason
    return { open: false, reason: reason === 'CounterSubscriptionPendingPayment' || reason === 'CounterSubscriptionExpired' ? reason : 'CounterModuleDisabled' }
  }
  if (branches.length === 0) return { open: false, reason: 'NoBranch' }
  if (branch) {
    if (!branch.isActive) return { open: false, reason: 'BranchInactive' }
    if (!branch.counterEnabled) return { open: false, reason: 'BranchCounterDisabled' }
    return { open: true }
  }
  return branches.some((b) => b.isActive && b.counterEnabled) ? { open: true } : { open: false, reason: 'NoCounterBranch' }
}

/** `MyBranchesResponse.counter` in the subscription's shape, for the front desk's gate. */
export function accessAsOverview(access: MyCounterAccessResponse | null | undefined): Pick<ProviderSubscriptionOverviewResponse, 'counterAvailable' | 'counterBlockedReason'> | null {
  return access ? { counterAvailable: access.available, counterBlockedReason: access.reason } : null
}

/** Error codes from saving an intake that mean the gate closed under the page. */
export const GATE_ERROR_CODES = new Set(['CounterModuleDisabled', 'CounterSubscriptionPendingPayment', 'CounterSubscriptionExpired', 'BranchCounterDisabled', 'BranchInactive'])

// ── The new intake (phase 2 §4) ──────────────────────────────────────────────

/** Accessories and condition flags the form offers (`None` is the empty set, never sent). */
export const ACCESSORIES: readonly IntakeAccessory[] = ['Charger', 'Case', 'SimCard', 'MemoryCard', 'Box', 'Cable', 'Other']
export const CONDITIONS: readonly IntakeCondition[] = ['Scratches', 'CrackedScreen', 'LiquidDamage', 'NotPoweringOn', 'Dents', 'MissingParts']
export const POWERS_ON: readonly PowersOnState[] = ['Yes', 'No', 'NotTested']
export const ESTIMATE_TYPES: readonly IntakeEstimateType[] = ['Fixed', 'Range', 'AfterInspection']
/** What the shop can take at the counter: cash, its card terminal, a transfer (a record only, phase 2 §9). */
export const COUNTER_METHODS = ['Cash', 'Card', 'BankTransfer'] as const satisfies readonly PaymentMethod[]
export type CounterMethod = (typeof COUNTER_METHODS)[number]

export const INTAKE_LIMITS = { accessoriesNote: 500, conditionNotes: 1000, imei: 20, name: 200, text: 200, notes: 1000, reference: 100 } as const
export const IMEI_RE = /^[A-Za-z0-9-]{1,20}$/
export const MIN_PHOTOS = 2
export const MAX_PHOTOS_PER_UPLOAD = 10

/** Splits a pick into requests of at most 10 files (`CounterTooManyPhotos`). */
export function batches<T>(items: readonly T[], size = MAX_PHOTOS_PER_UPLOAD): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export interface IntakeDraft {
  branchId: string
  /** The 9 local digits held by `PhoneField`. */
  phone: string
  customerName: string
  serviceId: string | null
  issueId: string | null
  deviceName: string
  brand: string
  model: string
  serialNumber: string
  imei: string
  issueDescription: string
  accessories: IntakeAccessory[]
  accessoriesNote: string
  conditions: IntakeCondition[]
  conditionNotes: string
  powersOn: PowersOnState | null
  lockCode: string
  estimateType: IntakeEstimateType | null
  estimateMin: string
  estimateMax: string
  inspectionFee: string
  inspectionFeePaidNow: boolean
  deposit: string
  paymentMethod: CounterMethod | null
  paymentReference: string
  /** Riyadh `YYYY-MM-DDTHH:mm`, or blank. */
  promisedReadyAt: string
  customerNotes: string
}

/**
 * What the wizard may be opened with (`navigate('/counter/new', { state: { prefill } })`): an out-of-warranty claim
 * becomes a paid intake filled from the earlier device (phase 5 §6).
 */
export interface IntakePrefillState {
  phone?: string | null
  canonicalServiceId?: string | null
  device?: { name?: string | null; brand?: string | null; model?: string | null; imei?: string | null; serialNumber?: string | null } | null
}

/** Applies a prefill to an empty draft; the phone is kept as the 9 local digits `PhoneField` holds. */
export function draftFromPrefill(prefill: IntakePrefillState | null | undefined, base: IntakeDraft = EMPTY_INTAKE): IntakeDraft {
  if (!prefill || typeof prefill !== 'object') return base
  const d = prefill.device ?? {}
  return {
    ...base,
    phone: prefill.phone ? localMobileDigits(prefill.phone) : base.phone,
    serviceId: prefill.canonicalServiceId || base.serviceId,
    deviceName: d.name ?? base.deviceName,
    brand: d.brand ?? base.brand,
    model: d.model ?? base.model,
    imei: d.imei ?? base.imei,
    serialNumber: d.serialNumber ?? base.serialNumber,
  }
}

export const EMPTY_INTAKE: IntakeDraft = {
  branchId: '',
  phone: '',
  customerName: '',
  serviceId: null,
  issueId: null,
  deviceName: '',
  brand: '',
  model: '',
  serialNumber: '',
  imei: '',
  issueDescription: '',
  accessories: [],
  accessoriesNote: '',
  conditions: [],
  conditionNotes: '',
  powersOn: null,
  lockCode: '',
  estimateType: null,
  estimateMin: '',
  estimateMax: '',
  inspectionFee: '',
  inspectionFeePaidNow: false,
  deposit: '',
  paymentMethod: null,
  paymentReference: '',
  promisedReadyAt: '',
  customerNotes: '',
}

const amount = (v: string): number => {
  const n = Number(v.trim() === '' ? 0 : v)
  return Number.isFinite(n) ? n : NaN
}
const optional = (v: string): number | null => (v.trim() === '' ? null : Number(v))
const text = (v: string): string | null => (v.trim() ? v.trim() : null)

/** What is collected at the counter now: the inspection fee when paid now, plus the deposit. */
export function paidNow(d: Pick<IntakeDraft, 'inspectionFee' | 'inspectionFeePaidNow' | 'deposit'>): number {
  const fee = d.inspectionFeePaidNow ? amount(d.inspectionFee) : 0
  return (Number.isFinite(fee) ? fee : 0) + (Number.isFinite(amount(d.deposit)) ? amount(d.deposit) : 0)
}

export type IntakeProblem =
  | 'phone'
  | 'name'
  | 'service'
  | 'imei'
  | 'estimateMin'
  | 'estimateMax'
  | 'amount'
  | 'paymentMethod'
  | 'branch'
  | 'tooLong'

/** The wizard's steps and what each one checks before "التالي". */
export const INTAKE_STEPS = ['customer', 'device', 'condition', 'money', 'terms'] as const
export type IntakeStep = (typeof INTAKE_STEPS)[number]

/**
 * The client-side checks per step (the server repeats them). `needsName`: the lookup found no customer, or one
 * without a name (`CounterCustomerNameRequired`).
 */
export function stepProblems(step: IntakeStep, d: IntakeDraft, needsName: boolean): IntakeProblem[] {
  const out: IntakeProblem[] = []
  if (step === 'customer') {
    if (!d.branchId) out.push('branch')
    if (!/^5\d{8}$/.test(d.phone)) out.push('phone')
    if (needsName && !d.customerName.trim()) out.push('name')
  }
  if (step === 'device') {
    if (!d.serviceId) out.push('service')
    if (d.imei.trim() && !IMEI_RE.test(d.imei.trim())) out.push('imei')
  }
  if (step === 'condition') {
    if (d.accessoriesNote.length > INTAKE_LIMITS.accessoriesNote || d.conditionNotes.length > INTAKE_LIMITS.conditionNotes) out.push('tooLong')
  }
  if (step === 'money') {
    const min = optional(d.estimateMin)
    const max = optional(d.estimateMax)
    if ((d.estimateType === 'Fixed' || d.estimateType === 'Range') && (min === null || !Number.isFinite(min) || min < 0)) out.push('estimateMin')
    if (d.estimateType === 'Range' && (max === null || !Number.isFinite(max) || (min !== null && max < min))) out.push('estimateMax')
    const fee = amount(d.inspectionFee)
    const deposit = amount(d.deposit)
    if (!Number.isFinite(fee) || fee < 0 || !Number.isFinite(deposit) || deposit < 0) out.push('amount')
    if (paidNow(d) > 0 && !d.paymentMethod) out.push('paymentMethod')
  }
  return out
}

/** `POST counter/intakes`. Estimates go only with a type that uses them; the payment only when something is paid now. */
export function intakeRequest(d: IntakeDraft): CreateCounterIntakeRequest {
  const paying = paidNow(d) > 0
  const usesMin = d.estimateType === 'Fixed' || d.estimateType === 'Range'
  return {
    branchId: d.branchId,
    customerPhone: toSaudiE164(d.phone),
    customerName: text(d.customerName),
    canonicalServiceId: d.serviceId!,
    serviceIssueId: d.issueId,
    device: {
      name: text(d.deviceName),
      brand: text(d.brand),
      model: text(d.model),
      serialNumber: text(d.serialNumber),
      imei: text(d.imei),
      issueDescription: text(d.issueDescription),
    },
    accessories: d.accessories,
    accessoriesNote: text(d.accessoriesNote),
    conditions: d.conditions,
    conditionNotes: text(d.conditionNotes),
    powersOn: d.powersOn,
    lockCode: text(d.lockCode),
    estimateType: d.estimateType,
    estimateMin: usesMin ? optional(d.estimateMin) : null,
    estimateMax: d.estimateType === 'Range' ? optional(d.estimateMax) : null,
    inspectionFee: amount(d.inspectionFee) || 0,
    inspectionFeePaidNow: d.inspectionFeePaidNow && amount(d.inspectionFee) > 0,
    deposit: amount(d.deposit) || 0,
    paymentMethod: paying ? d.paymentMethod : null,
    paymentReference: paying ? text(d.paymentReference) : null,
    promisedReadyAt: riyadhInputToIso(d.promisedReadyAt),
    customerNotes: text(d.customerNotes),
  }
}

/** Toggles one value in a flag list, keeping the form's order. */
export function toggleFlag<V extends string>(list: readonly V[], value: V, order: readonly V[]): V[] {
  const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
  return order.filter((v) => next.includes(v))
}

// ── The item (phase 2 §6–§10) ────────────────────────────────────────────────

/** How many intake photos are still missing before the receipt is complete. */
export function photosMissing(intake: Pick<CounterIntakeResponse, 'photosCount' | 'isComplete'> | null | undefined): number {
  if (!intake || intake.isComplete) return 0
  return Math.max(0, MIN_PHOTOS - intake.photosCount)
}

/** `availableActions` (phase 2 §6; `WaiveStorageFee`, `Abandon` and `Transfer` for the owner and supervisors, phase 5 §4–§5). */
export type CounterAction = 'UploadPhotos' | 'Sign' | 'RecordCall' | 'RecordDecision' | 'AddPayment' | 'Discount' | 'Handover' | 'WaiveStorageFee' | 'Abandon' | 'Transfer'

export function can(detail: Pick<CounterItemDetailResponse, 'availableActions'>, action: CounterAction): boolean {
  return detail.availableActions.includes(action)
}

/** Owing (positive), settled, or the shop owes the customer (negative balance). */
export function balanceState(balance: number): 'due' | 'settled' | 'credit' {
  if (balance > 0.004) return 'due'
  if (balance < -0.004) return 'credit'
  return 'settled'
}

/** A debt at handover is for the owner and supervisors only (`CounterDebtNotAllowed`). */
export function canAllowDebt(role: ProviderRoleKind): boolean {
  return role === 'owner' || role === 'supervisor'
}

/**
 * The discount the caller may give, as an amount: `maxDiscountPercent` of the bill (`money.amount`). A front-desk
 * account with no limit set gets 0.
 */
export function maxDiscountAmount(money: Pick<CounterMoneyResponse, 'amount' | 'maxDiscountPercent'>): number {
  return Math.round(money.amount * Math.max(0, money.maxDiscountPercent)) / 100
}

export type DiscountProblem = 'reason' | 'value' | 'overLimit' | 'overBill'

/** One of percent or amount, a reason, within the caller's limit and the bill. 0 removes the discount. */
export function discountProblem(input: { mode: 'percent' | 'amount'; value: string; reason: string }, money: Pick<CounterMoneyResponse, 'amount' | 'maxDiscountPercent'>): DiscountProblem | null {
  if (!input.reason.trim()) return 'reason'
  const v = Number(input.value)
  if (input.value.trim() === '' || !Number.isFinite(v) || v < 0) return 'value'
  if (input.mode === 'percent') {
    if (v > 100) return 'overBill'
    if (v > money.maxDiscountPercent) return 'overLimit'
    return null
  }
  if (v > money.amount) return 'overBill'
  if (v > maxDiscountAmount(money) + 0.004) return 'overLimit'
  return null
}

/** A 4-digit pickup code. */
export function isPickupCode(code: string): boolean {
  return /^\d{4}$/.test(code)
}

// ── Hold reasons (phase 5 §2) ────────────────────────────────────────────────

/** Statuses a device at a branch can be paused from (`InvalidStatusTransition` otherwise). */
export const PAUSABLE_STATUSES: readonly ServiceItemStatus[] = ['Accepted', 'Scheduled', 'EnRoute', 'Arrived', 'Assessment', 'InProgress']
export const HOLD_REASONS: readonly HoldReason[] = ['WaitingParts', 'WaitingCustomer', 'ExternalWorkshop', 'Other']
export const HOLD_LIMITS = { note: 1000, workshop: 200 } as const

/**
 * Pause and resume from the platform are the owner's and supervisors' (`ProviderManagement`), for a device that is at a
 * branch now (`PauseNotAtBranch`). The server has the last word; this only decides which button shows.
 */
export function holdActions(
  item: { status: ServiceItemStatus; currentBranchId: string | null },
  role: ProviderRoleKind,
): { canPause: boolean; canResume: boolean } {
  const management = role === 'owner' || role === 'supervisor'
  return {
    canPause: management && !!item.currentBranchId && PAUSABLE_STATUSES.includes(item.status),
    canResume: management && item.status === 'Paused',
  }
}

export interface PauseDraft {
  holdReason: HoldReason | null
  note: string
  externalWorkshopName: string
  externalCost: string
}

export const EMPTY_PAUSE: PauseDraft = { holdReason: null, note: '', externalWorkshopName: '', externalCost: '' }

export type PauseProblem = 'reason' | 'noteTooLong' | 'workshopTooLong' | 'cost'

/** The reason is required for a counter device (`HoldReasonRequired`); the workshop and cost go with `ExternalWorkshop` only. */
export function pauseProblems(d: PauseDraft, walkIn: boolean): PauseProblem[] {
  const out: PauseProblem[] = []
  if (walkIn && !d.holdReason) out.push('reason')
  if (d.note.trim().length > HOLD_LIMITS.note) out.push('noteTooLong')
  if (d.holdReason === 'ExternalWorkshop') {
    if (d.externalWorkshopName.trim().length > HOLD_LIMITS.workshop) out.push('workshopTooLong')
    const cost = d.externalCost.trim()
    if (cost !== '' && (!Number.isFinite(Number(cost)) || Number(cost) < 0)) out.push('cost')
  }
  return out
}

export function pauseRequest(d: PauseDraft): ProviderPauseItemRequest {
  const external = d.holdReason === 'ExternalWorkshop'
  return {
    holdReason: d.holdReason,
    note: d.note.trim() || null,
    externalWorkshopName: external ? d.externalWorkshopName.trim() || null : null,
    externalCost: external && d.externalCost.trim() !== '' ? Number(d.externalCost) : null,
  }
}

// ── Storage and abandon (phase 5 §4) ─────────────────────────────────────────

export const WAIVER_REASON_MAX = 300
export const ABANDON_REASON_MAX = 500

/** Whether to show the storage block: a fee per day is set, or the device is waiting / abandoned. */
export function showStorage(s: Pick<CounterStorageResponse, 'readySince' | 'feePerDay' | 'abandonedAt'>): boolean {
  return !!s.readySince || !!s.abandonedAt || (s.feePerDay ?? 0) > 0
}

/** Days left before the device may be declared abandoned (0 once it may). */
export function daysToAbandon(s: Pick<CounterStorageResponse, 'readySince' | 'daysWaiting' | 'abandonAfterDays'>): number | null {
  if (!s.readySince) return null
  return Math.max(0, s.abandonAfterDays - s.daysWaiting)
}

/** Abandoning needs 3 reminders or a written reason (`AbandonRemindersRequired`). */
export const ABANDON_REMINDERS = 3
export function abandonNeedsReason(s: Pick<CounterStorageResponse, 'remindersSent'>): boolean {
  return s.remindersSent < ABANDON_REMINDERS
}

// ── WhatsApp (phase 4 §3–§4) ─────────────────────────────────────────────────

/** Why automatic messages do or don't go out for this item, for the bar above the log. */
export type WhatsAppNotice = 'globalOff' | 'branchOff' | 'noSender' | 'quota' | 'provider' | 'platform'

export function whatsAppNotice(a: WhatsAppAvailabilityResponse): WhatsAppNotice {
  if (!a.globalEnabled) return 'globalOff'
  if (!a.branchAutoSend) return 'branchOff'
  if (!a.senderAvailable || !a.activeSender) return 'noSender'
  if (a.activeSender === 'Platform' && !a.quotaUnlimited && a.quotaUsed >= a.quotaAllowed) return 'quota'
  return a.activeSender === 'Provider' ? 'provider' : 'platform'
}

/**
 * The message kinds a new send may ask for now (`WhatsAppTemplateNotApplicable` otherwise): the receipt always, the quote
 * while one waits, ready / not repairable while ready and not handed over, completed after handover.
 */
export function resendKinds(item: Pick<CounterItemDetailResponse, 'pendingQuotation' | 'isReady' | 'repairOutcome'> & { handedOver: boolean }): WhatsAppTemplateKind[] {
  const kinds: WhatsAppTemplateKind[] = ['IntakeReceived']
  if (item.pendingQuotation) kinds.push('QuoteReady')
  if (item.isReady && !item.handedOver) kinds.push(item.repairOutcome === 'NotRepairable' || item.repairOutcome === 'QuoteRejected' ? 'NotRepairable' : 'ReadyForPickup')
  if (item.handedOver) kinds.push('Completed')
  return kinds
}

// ── The branch board (phase 5 §3) ────────────────────────────────────────────

/** A walk-in row opens the counter item; a platform device opens the service in work. */
export function boardItemHref(item: Pick<BranchBoardItem, 'serviceItemId' | 'fulfillmentChannel'>): string {
  return item.fulfillmentChannel === 'WalkIn' ? `/counter/items/${item.serviceItemId}` : `/work/${item.serviceItemId}`
}

/** A stage bar's three age slices as % of the longest bar (so bars compare across stages). */
export function stageShares(s: Pick<BranchBoardStageCount, 'days0To2' | 'days3To7' | 'over7Days'>, max: number): { fresh: number; mid: number; old: number } {
  const scale = max > 0 ? 100 / max : 0
  const round = (n: number) => Math.round(n * scale * 10) / 10
  return { fresh: round(s.days0To2), mid: round(s.days3To7), old: round(s.over7Days) }
}
