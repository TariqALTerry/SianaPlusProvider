import type {
  AdjustBranchStockRequest,
  PartResponse,
  ReceiveStockRequest,
  SavePartRequest,
  SavePartSupplierRequest,
  StockMovementResponse,
  SupplierResponse,
  SupplierReturnResponse,
  SupplierReturnStatus,
  TransferStockRequest,
} from '@/api/types'
import type { ProviderRoleKind } from '@/features/auth/authStore'
import { LOCALES } from '@/i18n'

/**
 * Workshop parts per branch (PROVIDER-BRANCHES-PROVIDER-PLATFORM-PROMPT phase 6). Quantities are decimals with two
 * places (a part sold by the metre); money is SAR.
 */

// ── Who may do what (§1) ──────────────────────────────────────────────────────

/** Owner and supervisors write (parts, suppliers, receive, adjust, transfer, returns); the front desk only reads. */
export function canWriteInventory(role: ProviderRoleKind): boolean {
  return role !== 'frontDesk'
}

/** Costs come back `null` for the front desk: hide their columns and fields instead of showing dashes. */
export function canSeeCosts(role: ProviderRoleKind): boolean {
  return role !== 'frontDesk'
}

/** Taking stock below zero (`allowNegative`) is the owner's (`StockNegativeOverrideNotAllowed`). */
export function canOverrideNegative(role: ProviderRoleKind): boolean {
  return role === 'owner'
}

/** The settings: read by the owner and supervisors, saved by the owner (`InventorySettingsOwnerOnly`). */
export function settingsAccess(role: ProviderRoleKind): 'edit' | 'read' | 'none' {
  if (role === 'owner') return 'edit'
  if (role === 'supervisor') return 'read'
  return 'none'
}

// ── Quantities ───────────────────────────────────────────────────────────────

export const QTY_DECIMALS = 2

function normalizeDigits(raw: string): string {
  return raw
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace('٫', '.')
    .replace(',', '.')
    .trim()
}

export const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * A typed quantity or amount: Arabic digits and a decimal comma are accepted, rounded to two places. Null when empty or
 * not a number.
 */
export function parseDecimal(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  const v = normalizeDigits(String(raw))
  if (v === '' || !/^[-+]?\d*\.?\d+$/.test(v)) return null
  const n = Number(v)
  return Number.isFinite(n) ? round2(n) : null
}

/** 0 to 2 decimals: `3`, `2.5`, `1.25`; negative quantities keep their sign. */
export function formatQuantity(value: number | null | undefined, lang: 'ar' | 'en'): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat(LOCALES[lang], { minimumFractionDigits: 0, maximumFractionDigits: QTY_DECIMALS }).format(value)
}

/** A movement's quantity is signed: + in, − out. `ReturnToSupplier` with 0 = a part that left a customer's device. */
export function movementDirection(m: Pick<StockMovementResponse, 'kind' | 'quantity'>): 'in' | 'out' | 'recordOnly' {
  if (m.kind === 'ReturnToSupplier' && m.quantity === 0) return 'recordOnly'
  return m.quantity >= 0 ? 'in' : 'out'
}

// ── Receive (§5) ─────────────────────────────────────────────────────────────

export interface ReceiveDraft {
  branchId: string | null
  partItemId: string | null
  quantity: string
  /** Empty = the part's `defaultCost`. */
  unitCost: string
  supplierId: string | null
  batchRef: string
  note: string
}

export type FormProblem = 'required' | 'positive' | 'notNegative' | 'tooLong' | 'sameBranch' | 'range' | 'whole'
export type ReceiveErrors = Partial<Record<'branchId' | 'partItemId' | 'quantity' | 'unitCost' | 'batchRef', FormProblem>>

export const INVENTORY_LIMITS = {
  sku: 50,
  partName: 200,
  category: 100,
  brand: 100,
  models: 1000,
  unit: 20,
  barcode: 100,
  supplierName: 200,
  supplierPhone: 30,
  supplierNotes: 1000,
  batchRef: 100,
  note: 500,
  reason: 500,
  warrantyMax: 3650,
} as const

export function validateReceive(d: ReceiveDraft): ReceiveErrors {
  const errors: ReceiveErrors = {}
  if (!d.branchId) errors.branchId = 'required'
  if (!d.partItemId) errors.partItemId = 'required'
  const q = parseDecimal(d.quantity)
  if (q === null) errors.quantity = 'required'
  else if (q <= 0) errors.quantity = 'positive'
  if (d.unitCost.trim()) {
    const c = parseDecimal(d.unitCost)
    if (c === null || c < 0) errors.unitCost = 'notNegative'
  }
  if (d.batchRef.trim().length > INVENTORY_LIMITS.batchRef) errors.batchRef = 'tooLong'
  return errors
}

const text = (v: string) => (v.trim() ? v.trim() : null)

export function receiveRequest(d: ReceiveDraft): ReceiveStockRequest {
  return {
    branchId: d.branchId!,
    partItemId: d.partItemId!,
    quantity: parseDecimal(d.quantity)!,
    unitCost: d.unitCost.trim() ? parseDecimal(d.unitCost) : null,
    supplierId: d.supplierId || null,
    batchRef: text(d.batchRef),
    note: text(d.note),
  }
}

// ── Adjust (stock count, §5) ─────────────────────────────────────────────────

export type AdjustMode = 'delta' | 'count'

export interface AdjustDraft {
  branchId: string | null
  partItemId: string | null
  mode: AdjustMode
  /** ± change (mode `delta`) or what was counted (mode `count`). */
  value: string
  reason: string
  allowNegative: boolean
}

export type AdjustErrors = Partial<Record<'branchId' | 'partItemId' | 'value' | 'reason', FormProblem>>

/** Exactly one of `quantityDelta` / `countedOnHand` (`StockAdjustQuantityRequired`); no change is `StockAdjustNoChange`. */
export function validateAdjust(d: AdjustDraft): AdjustErrors {
  const errors: AdjustErrors = {}
  if (!d.branchId) errors.branchId = 'required'
  if (!d.partItemId) errors.partItemId = 'required'
  const v = parseDecimal(d.value)
  if (v === null) errors.value = 'required'
  else if (d.mode === 'delta' && v === 0) errors.value = 'required'
  else if (d.mode === 'count' && v < 0) errors.value = 'notNegative'
  if (!d.reason.trim()) errors.reason = 'required'
  else if (d.reason.trim().length > INVENTORY_LIMITS.reason) errors.reason = 'tooLong'
  return errors
}

/** `allowNegative` is sent only when the caller may use it (the owner). */
export function adjustRequest(d: AdjustDraft, role: ProviderRoleKind): AdjustBranchStockRequest {
  const v = parseDecimal(d.value)!
  return {
    branchId: d.branchId!,
    partItemId: d.partItemId!,
    quantityDelta: d.mode === 'delta' ? v : null,
    countedOnHand: d.mode === 'count' ? v : null,
    reason: d.reason.trim(),
    allowNegative: canOverrideNegative(role) && d.allowNegative,
  }
}

/** The on-hand after the adjustment, for the "what will change" line (null until the value is valid). */
export function adjustedOnHand(onHand: number | null | undefined, d: Pick<AdjustDraft, 'mode' | 'value'>): number | null {
  const v = parseDecimal(d.value)
  if (v === null) return null
  if (d.mode === 'count') return v
  return onHand === null || onHand === undefined ? null : round2(onHand + v)
}

// ── Transfer between branches (§5) ───────────────────────────────────────────

export interface TransferDraft {
  fromBranchId: string | null
  toBranchId: string | null
  partItemId: string | null
  quantity: string
  note: string
}

export type TransferErrors = Partial<Record<'fromBranchId' | 'toBranchId' | 'partItemId' | 'quantity', FormProblem>>

export function validateTransfer(d: TransferDraft): TransferErrors {
  const errors: TransferErrors = {}
  if (!d.fromBranchId) errors.fromBranchId = 'required'
  if (!d.toBranchId) errors.toBranchId = 'required'
  else if (d.toBranchId === d.fromBranchId) errors.toBranchId = 'sameBranch'
  if (!d.partItemId) errors.partItemId = 'required'
  const q = parseDecimal(d.quantity)
  if (q === null) errors.quantity = 'required'
  else if (q <= 0) errors.quantity = 'positive'
  return errors
}

export function transferRequest(d: TransferDraft): TransferStockRequest {
  return {
    fromBranchId: d.fromBranchId!,
    toBranchId: d.toBranchId!,
    partItemId: d.partItemId!,
    quantity: parseDecimal(d.quantity)!,
    note: text(d.note),
  }
}

// ── Parts (§3) ───────────────────────────────────────────────────────────────

export interface PartDraft {
  sku: string
  nameAr: string
  nameEn: string
  category: string
  brand: string
  compatibleModels: string
  unit: string
  barcode: string
  defaultCost: string
  defaultPrice: string
  defaultWarrantyDays: string
  reorderLevel: string
  isActive: boolean
}

export const EMPTY_PART: PartDraft = {
  sku: '',
  nameAr: '',
  nameEn: '',
  category: '',
  brand: '',
  compatibleModels: '',
  unit: '',
  barcode: '',
  defaultCost: '',
  defaultPrice: '',
  defaultWarrantyDays: '',
  reorderLevel: '',
  isActive: true,
}

const str = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n))

export function partDraft(p: PartResponse): PartDraft {
  return {
    sku: p.sku,
    nameAr: p.nameAr,
    nameEn: p.nameEn === p.nameAr ? '' : p.nameEn,
    category: p.category ?? '',
    brand: p.brand ?? '',
    compatibleModels: p.compatibleModels ?? '',
    unit: p.unit === 'pcs' ? '' : p.unit,
    barcode: p.barcode ?? '',
    defaultCost: str(p.defaultCost),
    defaultPrice: str(p.defaultPrice),
    defaultWarrantyDays: p.defaultWarrantyDays ? String(p.defaultWarrantyDays) : '',
    reorderLevel: str(p.reorderLevel),
    isActive: p.isActive,
  }
}

export type PartErrors = Partial<Record<keyof PartDraft, FormProblem>>

export function validatePart(d: PartDraft): PartErrors {
  const errors: PartErrors = {}
  const L = INVENTORY_LIMITS
  if (!d.sku.trim()) errors.sku = 'required'
  else if (d.sku.trim().length > L.sku) errors.sku = 'tooLong'
  if (!d.nameAr.trim()) errors.nameAr = 'required'
  else if (d.nameAr.trim().length > L.partName) errors.nameAr = 'tooLong'
  if (d.nameEn.trim().length > L.partName) errors.nameEn = 'tooLong'
  if (d.category.trim().length > L.category) errors.category = 'tooLong'
  if (d.brand.trim().length > L.brand) errors.brand = 'tooLong'
  if (d.compatibleModels.trim().length > L.models) errors.compatibleModels = 'tooLong'
  if (d.unit.trim().length > L.unit) errors.unit = 'tooLong'
  if (d.barcode.trim().length > L.barcode) errors.barcode = 'tooLong'
  for (const k of ['defaultCost', 'defaultPrice', 'reorderLevel'] as const) {
    if (!d[k].trim()) continue
    const n = parseDecimal(d[k])
    if (n === null || n < 0) errors[k] = 'notNegative'
  }
  if (d.defaultWarrantyDays.trim()) {
    const w = parseDecimal(d.defaultWarrantyDays)
    if (w === null || !Number.isInteger(w)) errors.defaultWarrantyDays = 'whole'
    else if (w < 0 || w > L.warrantyMax) errors.defaultWarrantyDays = 'range'
  }
  return errors
}

/** The full-replace body: an empty English name = the Arabic one, an empty unit = `pcs` (the server's defaults). */
export function partRequest(d: PartDraft, keepCost?: number | null): SavePartRequest {
  const warranty = parseDecimal(d.defaultWarrantyDays)
  return {
    sku: d.sku.trim().toUpperCase(),
    nameAr: d.nameAr.trim(),
    nameEn: d.nameEn.trim(),
    category: text(d.category),
    brand: text(d.brand),
    compatibleModels: text(d.compatibleModels),
    unit: text(d.unit),
    barcode: text(d.barcode),
    defaultCost: d.defaultCost.trim() ? parseDecimal(d.defaultCost)! : keepCost ?? 0,
    defaultPrice: parseDecimal(d.defaultPrice) ?? 0,
    defaultWarrantyDays: warranty ? warranty : null,
    reorderLevel: parseDecimal(d.reorderLevel) ?? 0,
    isActive: d.isActive,
  }
}

// ── Suppliers (§4) ───────────────────────────────────────────────────────────

export interface SupplierDraft {
  name: string
  phone: string
  notes: string
  isActive: boolean
}

export const EMPTY_SUPPLIER: SupplierDraft = { name: '', phone: '', notes: '', isActive: true }

export function supplierDraft(s: SupplierResponse): SupplierDraft {
  return { name: s.name, phone: s.phone ?? '', notes: s.notes ?? '', isActive: s.isActive }
}

export function validateSupplier(d: SupplierDraft): Partial<Record<keyof SupplierDraft, FormProblem>> {
  const errors: Partial<Record<keyof SupplierDraft, FormProblem>> = {}
  if (!d.name.trim()) errors.name = 'required'
  else if (d.name.trim().length > INVENTORY_LIMITS.supplierName) errors.name = 'tooLong'
  if (d.phone.trim().length > INVENTORY_LIMITS.supplierPhone) errors.phone = 'tooLong'
  if (d.notes.trim().length > INVENTORY_LIMITS.supplierNotes) errors.notes = 'tooLong'
  return errors
}

export function supplierRequest(d: SupplierDraft): SavePartSupplierRequest {
  return { name: d.name.trim(), phone: text(d.phone), notes: text(d.notes), isActive: d.isActive }
}

// ── Supplier returns (§8) ────────────────────────────────────────────────────

/** Draft → Sent | Rejected (cancel before sending); Sent → Credited | Rejected. Anything else: `SupplierReturnTransitionInvalid`. */
export const SUPPLIER_RETURN_TRANSITIONS: Readonly<Record<SupplierReturnStatus, readonly SupplierReturnStatus[]>> = {
  Draft: ['Sent', 'Rejected'],
  Sent: ['Credited', 'Rejected'],
  Credited: [],
  Rejected: [],
}

export function nextReturnStatuses(status: SupplierReturnStatus): readonly SupplierReturnStatus[] {
  return SUPPLIER_RETURN_TRANSITIONS[status] ?? []
}

/** Sending needs a supplier (`SupplierReturnSupplierRequired`). */
export function returnStatusBlocked(r: Pick<SupplierReturnResponse, 'supplierId'>, to: SupplierReturnStatus): 'supplierRequired' | null {
  return to === 'Sent' && !r.supplierId ? 'supplierRequired' : null
}

/** The server's default credit: quantity × unit cost. */
export function defaultCredit(r: Pick<SupplierReturnResponse, 'quantity' | 'unitCost'>): number {
  return round2(r.quantity * r.unitCost)
}

export interface ReturnDraft {
  branchId: string | null
  partItemId: string | null
  supplierId: string | null
  quantity: string
  batchRef: string
  reason: string
  fromStock: boolean
  note: string
}

export type ReturnErrors = Partial<Record<'branchId' | 'partItemId' | 'quantity' | 'reason' | 'batchRef', FormProblem>>

/** `editing`: a draft's update has no branch, part or `fromStock`. */
export function validateReturn(d: ReturnDraft, editing = false): ReturnErrors {
  const errors: ReturnErrors = {}
  if (!editing && !d.branchId) errors.branchId = 'required'
  if (!editing && !d.partItemId) errors.partItemId = 'required'
  const q = parseDecimal(d.quantity)
  if (q === null) errors.quantity = 'required'
  else if (q <= 0) errors.quantity = 'positive'
  if (!d.reason.trim()) errors.reason = 'required'
  else if (d.reason.trim().length > INVENTORY_LIMITS.reason) errors.reason = 'tooLong'
  if (d.batchRef.trim().length > INVENTORY_LIMITS.batchRef) errors.batchRef = 'tooLong'
  return errors
}
