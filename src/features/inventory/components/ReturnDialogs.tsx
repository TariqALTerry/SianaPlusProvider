import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SupplierReturnResponse, SupplierReturnStatus } from '@/api/types'
import { ActionDialog } from '@/components/ActionDialog'
import { Money } from '@/components/Format'
import { StatusBadge } from '@/components/StatusBadge'
import { CheckboxField } from '@/components/ui/checkbox'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { BranchSelect } from '@/features/branches/BranchSelect'
import { useBranchScope } from '@/features/branches/scope'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { INVENTORY_INVALIDATION, inventoryApi } from '../api'
import { defaultCredit, INVENTORY_LIMITS, parseDecimal, validateReturn, type ReturnDraft } from '../logic'
import { PartPicker, Qty, SupplierSelect } from './Shared'
import '../i18n'

const returnLabel = (r: SupplierReturnResponse, pick: (ar: string, en: string) => string) => `${r.sku} · ${pick(r.partNameAr, r.partNameEn)} · ${r.branchName}`

/** A manual return (new), or a draft's edit (`existing`): supplier, quantity, batch, reason and note. */
export function ReturnFormDialog({ open, onOpenChange, existing }: { open: boolean; onOpenChange: (open: boolean) => void; existing?: SupplierReturnResponse | null }) {
  const { t } = useTranslation('inventory')
  const { pick } = useLang()
  const uid = useId()
  const scope = useBranchScope()
  const editing = !!existing
  const fresh = (): ReturnDraft =>
    existing
      ? {
          branchId: existing.branchId,
          partItemId: existing.partItemId,
          supplierId: existing.supplierId,
          quantity: String(existing.quantity),
          batchRef: existing.batchRef ?? '',
          reason: existing.reason,
          fromStock: existing.fromStock,
          note: existing.note ?? '',
        }
      : { branchId: scope.selected?.id ?? scope.branches.find((b) => b.isActive)?.id ?? null, partItemId: null, supplierId: null, quantity: '', batchRef: '', reason: '', fromStock: true, note: '' }
  const [draft, setDraft] = useState<ReturnDraft>(fresh)
  const [partLabel, setPartLabel] = useState<string | null>(null)
  const [tried, setTried] = useState(false)
  const action = useAction({
    mutationFn: (d: ReturnDraft) => {
      const quantity = parseDecimal(d.quantity)!
      const batchRef = d.batchRef.trim() || null
      const note = d.note.trim() || null
      return existing
        ? inventoryApi.updateSupplierReturn(existing.id, { supplierId: d.supplierId, quantity, batchRef, reason: d.reason.trim(), note })
        : inventoryApi.createSupplierReturn({ branchId: d.branchId!, partItemId: d.partItemId!, supplierId: d.supplierId, quantity, batchRef, reason: d.reason.trim(), fromStock: d.fromStock, note })
    },
    invalidate: INVENTORY_INVALIDATION,
    success: editing ? t('returns.saved') : t('returns.created'),
    onSuccess: () => onOpenChange(false),
  })
  const { reset } = action
  useEffect(() => {
    if (open) {
      setDraft(fresh())
      setPartLabel(null)
      setTried(false)
      reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing, reset])

  const errors = validateReturn(draft, editing)
  const show = (k: keyof typeof errors) => (tried && errors[k] ? t(`errors.${errors[k]}`) : undefined)
  const patch = (p: Partial<ReturnDraft>) => setDraft((d) => ({ ...d, ...p }))

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? t('actions.editReturn') : t('returns.title')}
      description={editing ? undefined : t('returns.createHint')}
      target={existing ? returnLabel(existing, pick) : undefined}
      confirmLabel={t('common:actions.save')}
      submitting={action.isPending}
      error={action.error}
      onSubmit={() => {
        setTried(true)
        if (Object.keys(errors).length === 0) action.mutate(draft)
      }}
    >
      {!editing && (
        <>
          <Field label={t('form.branch')} htmlFor={`${uid}-branch`} required error={show('branchId')}>
            <BranchSelect id={`${uid}-branch`} value={draft.branchId} onChange={(branchId) => patch({ branchId })} emptyLabel={t('form.branch')} className="h-11" />
          </Field>
          <Field label={t('form.part')} htmlFor={`${uid}-part`} required error={show('partItemId')}>
            <PartPicker
              id={`${uid}-part`}
              value={draft.partItemId}
              selectedLabel={partLabel}
              onChange={(partItemId, label) => {
                patch({ partItemId })
                setPartLabel(label)
              }}
              invalid={tried && !!errors.partItemId}
            />
          </Field>
        </>
      )}
      <Field label={t('form.supplier')} htmlFor={`${uid}-supplier`} optional hint={t('errors.supplierRequired')}>
        <SupplierSelect id={`${uid}-supplier`} value={draft.supplierId} currentLabel={existing?.supplierName} onChange={(supplierId) => patch({ supplierId })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('form.quantity')} htmlFor={`${uid}-qty`} required error={show('quantity')}>
          <Input id={`${uid}-qty`} type="text" inputMode="decimal" dir="ltr" className="h-11 tabular" value={draft.quantity} onChange={(e) => patch({ quantity: e.target.value })} />
        </Field>
        <Field label={t('form.batchRef')} htmlFor={`${uid}-batch`} optional error={show('batchRef')}>
          <Input id={`${uid}-batch`} dir="ltr" className="h-11" value={draft.batchRef} maxLength={INVENTORY_LIMITS.batchRef} onChange={(e) => patch({ batchRef: e.target.value })} />
        </Field>
      </div>
      <Field label={t('form.reason')} htmlFor={`${uid}-reason`} required error={show('reason')}>
        <Textarea id={`${uid}-reason`} dir="auto" rows={2} value={draft.reason} maxLength={INVENTORY_LIMITS.reason} onChange={(e) => patch({ reason: e.target.value })} />
      </Field>
      {!editing && <CheckboxField id={`${uid}-stock`} checked={draft.fromStock} onCheckedChange={(fromStock) => patch({ fromStock })} label={t('form.fromStock')} hint={t('form.fromStockHint')} />}
      <Field label={t('form.note')} htmlFor={`${uid}-note`} optional>
        <Textarea id={`${uid}-note`} dir="auto" rows={2} value={draft.note} maxLength={INVENTORY_LIMITS.note} onChange={(e) => patch({ note: e.target.value })} />
      </Field>
    </ActionDialog>
  )
}

/**
 * Moves a return along: Draft → Sent | Rejected, Sent → Credited (with the credit, default quantity × unit cost) |
 * Rejected. Sending writes a `ReturnToSupplier` movement.
 */
export function ReturnStatusDialog({
  open,
  onOpenChange,
  item,
  to,
  showCosts,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: SupplierReturnResponse | null
  to: SupplierReturnStatus | null
  showCosts: boolean
}) {
  const { t } = useTranslation('inventory')
  const { pick } = useLang()
  const uid = useId()
  const [credit, setCredit] = useState('')
  const [note, setNote] = useState('')
  const action = useAction({
    mutationFn: () => inventoryApi.setSupplierReturnStatus(item!.id, { status: to!, creditAmount: to === 'Credited' && credit.trim() ? parseDecimal(credit) : null, note: note.trim() || null }),
    invalidate: INVENTORY_INVALIDATION,
    success: t('returns.statusSaved'),
    onSuccess: () => onOpenChange(false),
  })
  const { reset } = action
  useEffect(() => {
    if (open) {
      setCredit('')
      setNote('')
      reset()
    }
  }, [open, reset])

  if (!item || !to) return null
  const creditInvalid = to === 'Credited' && credit.trim() !== '' && (parseDecimal(credit) === null || parseDecimal(credit)! < 0)
  const label = to === 'Sent' ? t('actions.send') : to === 'Credited' ? t('actions.credit') : item.status === 'Draft' ? t('actions.cancelDraft') : t('actions.reject')

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('returns.statusTitle')}
      description={to === 'Sent' ? t('returns.sendHint') : to === 'Rejected' && item.status === 'Draft' ? t('returns.rejectDraftHint') : undefined}
      target={
        <span className="flex flex-wrap items-center gap-2">
          {returnLabel(item, pick)} · <Qty value={item.quantity} />
        </span>
      }
      changes={
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge enum="SupplierReturnStatus" value={item.status} /> → <StatusBadge enum="SupplierReturnStatus" value={to} />
        </span>
      }
      confirmLabel={label}
      destructive={to === 'Rejected'}
      submitting={action.isPending}
      submitDisabled={creditInvalid}
      error={action.error}
      onSubmit={() => action.mutate()}
    >
      {to === 'Credited' && showCosts && (
        <Field
          label={t('form.creditAmount')}
          htmlFor={`${uid}-credit`}
          optional
          hint={
            <>
              {t('form.creditHint')}
              <Money value={defaultCredit(item)} />
            </>
          }
          error={creditInvalid ? t('errors.notNegative') : undefined}
        >
          <Input id={`${uid}-credit`} type="text" inputMode="decimal" dir="ltr" className="h-11 tabular" value={credit} onChange={(e) => setCredit(e.target.value)} />
        </Field>
      )}
      <Field label={t('form.statusNote')} htmlFor={`${uid}-note`} optional>
        <Textarea id={`${uid}-note`} dir="auto" rows={2} value={note} maxLength={INVENTORY_LIMITS.note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </ActionDialog>
  )
}
