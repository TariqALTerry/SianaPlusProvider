import type {
  BranchTransferResponse,
  CounterWarrantyClaimRequest,
  CounterWarrantyLineItem,
  CounterWarrantyLookupItem,
  CounterWarrantyLookupRequest,
  IntakeAccessory,
  IntakeCondition,
  PowersOnState,
} from '@/api/types'
import type { ProviderRoleKind } from '@/features/auth/authStore'
import type { Tone } from '@/i18n/enums'
import { riyadhInputToIso } from '@/lib/format'

/** Owner or supervisor: the "المشرف" of phase 5 (goodwill, executor choice, transfer create / cancel). */
export const isManager = (role: ProviderRoleKind) => role === 'owner' || role === 'supervisor'

// ── Transfers (phase 5 §5) ───────────────────────────────────────────────────

export type TransferAction = 'Send' | 'Receive' | 'Cancel'
const TRANSFER_ACTIONS: readonly TransferAction[] = ['Send', 'Receive', 'Cancel']

/** The staff actions the server offers now, in screen order (courier actions are the app's). */
export function transferActions(t: Pick<BranchTransferResponse, 'availableActions'>): TransferAction[] {
  return TRANSFER_ACTIONS.filter((a) => t.availableActions.includes(a))
}

/** A counter item opens in the counter, a platform service in the work pages. */
export function serviceHref(t: Pick<BranchTransferResponse, 'fulfillmentChannel' | 'serviceItemId'>): string {
  return t.fulfillmentChannel === 'WalkIn' ? `/counter/items/${t.serviceItemId}` : `/work/${t.serviceItemId}`
}

/** Seen from the switcher's branch: leaving it, arriving at it, or neither (every branch). */
export function transferDirection(t: Pick<BranchTransferResponse, 'fromBranch' | 'toBranch'>, branchId: string | null | undefined): 'out' | 'in' | null {
  if (!branchId) return null
  if (t.fromBranch.id === branchId) return 'out'
  if (t.toBranch.id === branchId) return 'in'
  return null
}

/** The arrow that reads "from → to" in the page direction. */
export const routeArrow = (isRtl: boolean) => (isRtl ? '←' : '→')

export const transferTarget = (tr: BranchTransferResponse, pick: (ar: string, en: string) => string, isRtl: boolean) =>
  [tr.intakeNumber ?? tr.itemNumber, pick(tr.serviceNameAr, tr.serviceNameEn), `${tr.fromBranch.name} ${routeArrow(isRtl)} ${tr.toBranch.name}`].filter(Boolean).join(' · ')

export const TRANSFER_LIMITS = { reason: 500, note: 500, code: 100 } as const

// ── Warranty lookup and claim (phase 5 §6, phase 6 §11) ──────────────────────

export interface LookupDraft {
  phone: string
  imei: string
  code: string
}

/** The lookup query, or null when every field is blank (`CounterWarrantyLookupQueryRequired`). */
export function lookupQuery(d: LookupDraft): CounterWarrantyLookupRequest | null {
  const phone = d.phone.trim()
  const imei = d.imei.trim()
  const code = d.code.trim()
  if (!phone && !imei && !code) return null
  return { phone: phone || null, imei: imei || null, code: code || null }
}

export type LineState = 'claimable' | 'claimed' | 'expired'

export function lineState(line: Pick<CounterWarrantyLineItem, 'claimable' | 'claimedAt' | 'claimServiceItemId'>): LineState {
  if (line.claimable) return 'claimable'
  if (line.claimedAt || line.claimServiceItemId) return 'claimed'
  return 'expired'
}

/**
 * Which lines a checkbox may pick: claimable ones for everyone; an expired one only for the owner or a supervisor (a
 * goodwill claim); a claimed one never (each line is claimed once).
 */
export function lineSelectable(line: Pick<CounterWarrantyLineItem, 'claimable' | 'claimedAt' | 'claimServiceItemId'>, role: ProviderRoleKind): boolean {
  const state = lineState(line)
  if (state === 'claimable') return true
  if (state === 'expired') return isManager(role)
  return false
}

/** Pre-checked lines: the claimable ones. */
export function defaultLineIds(lines: readonly CounterWarrantyLineItem[]): string[] {
  return lines.filter((l) => l.claimable).map((l) => l.id)
}

/**
 * Free only when every chosen line is still within its days (a warranty without lines: `inWarranty`). Anything else is
 * a goodwill claim, which only the owner or a supervisor may make.
 */
export function claimNeedsGoodwill(item: Pick<CounterWarrantyLookupItem, 'inWarranty' | 'lines'>, lineIds: readonly string[]): boolean {
  if (item.lines.length === 0) return !item.inWarranty
  const picked = item.lines.filter((l) => lineIds.includes(l.id))
  if (picked.length === 0) return !item.inWarranty
  return picked.some((l) => !l.claimable)
}

export interface ClaimDraft {
  branchId: string | null
  description: string
  executorId: string | null
  goodwill: boolean
  goodwillReason: string
  goodwillAmount: string
  accessories: IntakeAccessory[]
  accessoriesNote: string
  conditions: IntakeCondition[]
  conditionNotes: string
  powersOn: PowersOnState | null
  lockCode: string
  /** `datetime-local` value, Riyadh time. */
  promisedReadyAt: string
  lineIds: string[]
}

export const CLAIM_LIMITS = { description: 2000, goodwillReason: 500, note: 1000, accessoriesNote: 500, lockCode: 50 } as const

export function emptyClaim(item: Pick<CounterWarrantyLookupItem, 'lines'>, branchId: string | null): ClaimDraft {
  return {
    branchId,
    description: '',
    executorId: null,
    goodwill: false,
    goodwillReason: '',
    goodwillAmount: '',
    accessories: [],
    accessoriesNote: '',
    conditions: [],
    conditionNotes: '',
    powersOn: null,
    lockCode: '',
    promisedReadyAt: '',
    lineIds: defaultLineIds(item.lines),
  }
}

export type ClaimProblem = 'branch' | 'description' | 'descriptionTooLong' | 'lines' | 'goodwillReason' | 'goodwillAmount' | 'goodwillNotAllowed'

/** The checks the server makes, so the button says why it is off before saving. */
export function claimProblem(d: ClaimDraft, item: Pick<CounterWarrantyLookupItem, 'inWarranty' | 'lines'>, role: ProviderRoleKind): ClaimProblem | null {
  if (!d.branchId) return 'branch'
  if (!d.description.trim()) return 'description'
  if (d.description.trim().length > CLAIM_LIMITS.description) return 'descriptionTooLong'
  if (item.lines.length > 0 && d.lineIds.length === 0) return 'lines'
  if (d.goodwill) {
    if (!isManager(role)) return 'goodwillNotAllowed'
    if (!d.goodwillReason.trim()) return 'goodwillReason'
    if (d.goodwillAmount.trim() !== '') {
      const n = Number(d.goodwillAmount)
      if (!Number.isFinite(n) || n < 0) return 'goodwillAmount'
    }
  }
  return null
}

const text = (v: string) => (v.trim() ? v.trim() : null)

/**
 * The claim body. Lines are named explicitly (the server reads "empty" as every unclaimed line, which a warranty
 * without lines sends). Goodwill fields and the technician choice go only from the owner or a supervisor.
 */
export function claimRequest(d: ClaimDraft, role: ProviderRoleKind): CounterWarrantyClaimRequest {
  const manager = isManager(role)
  const goodwill = manager && d.goodwill
  return {
    branchId: d.branchId ?? '',
    description: d.description.trim(),
    executorId: manager ? d.executorId : null,
    goodwill,
    goodwillReason: goodwill ? text(d.goodwillReason) : null,
    goodwillAmount: goodwill && d.goodwillAmount.trim() !== '' ? Number(d.goodwillAmount) : null,
    accessories: d.accessories,
    accessoriesNote: text(d.accessoriesNote),
    conditions: d.conditions,
    conditionNotes: text(d.conditionNotes),
    powersOn: d.powersOn,
    lockCode: text(d.lockCode),
    promisedReadyAt: riyadhInputToIso(d.promisedReadyAt),
    lineIds: d.lineIds,
  }
}

/** What the paid intake wizard is opened with when the warranty is over (`CounterWarrantyExpired`). */
export interface IntakePrefill {
  phone: string | null
  canonicalServiceId: string
  device: { name: string | null; brand: string | null; model: string | null; imei: string | null; serialNumber: string | null }
}

export function intakePrefill(item: CounterWarrantyLookupItem): IntakePrefill {
  return {
    phone: item.customerPhone,
    canonicalServiceId: item.canonicalServiceId,
    device: { name: item.deviceName, brand: item.brand, model: item.model, imei: item.imei, serialNumber: item.serialNumber },
  }
}

// ── Cash close (phase 5 §7) ──────────────────────────────────────────────────

/** Counted cash typed in the box: a number ≥ 0, or null while blank or invalid (`CashCloseCountInvalid`). */
export function parseCount(raw: string): number | null {
  if (raw.trim() === '') return null
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : null
}

/** Counted − expected cash, to the halala. */
export function cashDifference(counted: number, expectedCash: number): number {
  return Math.round((counted - expectedCash) * 100) / 100
}

/** Green when it matches, red when cash is short, orange when there is more than expected. */
export function differenceTone(difference: number): Tone {
  if (difference === 0) return 'success'
  return difference < 0 ? 'danger' : 'attention'
}

/** Any difference needs a note (`CashCloseNoteRequired`). */
export function closeNoteRequired(difference: number | null): boolean {
  return difference !== null && difference !== 0
}

export const CASH_LIMITS = { note: 500 } as const

/** `YYYY-MM-DD` comparison: no business day after today (`CashCloseDateInvalid`). */
export function isFutureDate(date: string, today: string): boolean {
  return !!date && date > today
}
