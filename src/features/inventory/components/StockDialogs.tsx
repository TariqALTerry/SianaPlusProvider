import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionDialog } from '@/components/ActionDialog'
import { CheckboxField } from '@/components/ui/checkbox'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useRoleKind } from '@/features/auth/authStore'
import { useBranches } from '@/features/branches/api'
import { BranchSelect } from '@/features/branches/BranchSelect'
import { useBranchScope } from '@/features/branches/scope'
import { useAction } from '@/hooks/useAction'
import { cn } from '@/lib/utils'
import { INVENTORY_INVALIDATION, inventoryApi } from '../api'
import {
  adjustedOnHand,
  adjustRequest,
  canOverrideNegative,
  INVENTORY_LIMITS,
  receiveRequest,
  transferRequest,
  validateAdjust,
  validateReceive,
  validateTransfer,
  type AdjustDraft,
  type AdjustMode,
  type FormProblem,
  type ReceiveDraft,
  type TransferDraft,
} from '../logic'
import { PartPicker, Qty, SupplierSelect } from './Shared'
import '../i18n'

/** A stock row (or a low-stock row) the dialog starts from: its branch and part are filled in. */
export interface StockTarget {
  branchId: string
  partItemId: string
  partLabel: string
  onHand?: number | null
  unit?: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  target?: StockTarget | null
}

/** The branch a new form starts on: the row's, else the switcher's, else the user's first branch. */
function useDefaultBranch(target?: StockTarget | null): string | null {
  const scope = useBranchScope()
  return target?.branchId ?? scope.selected?.id ?? scope.branches.find((b) => b.isActive)?.id ?? null
}

const decimalProps = { type: 'text', inputMode: 'decimal', dir: 'ltr', autoComplete: 'off', className: 'h-11 tabular' } as const

function useProblem() {
  const { t } = useTranslation('inventory')
  return (p: FormProblem | undefined) => (p ? t(`errors.${p}`) : undefined)
}

/** "استلام": adds to the shelf and moves the average cost. */
export function ReceiveDialog({ open, onOpenChange, target }: Props) {
  const { t } = useTranslation('inventory')
  const uid = useId()
  const problem = useProblem()
  const defaultBranch = useDefaultBranch(target)
  const fresh = (): ReceiveDraft => ({ branchId: defaultBranch, partItemId: target?.partItemId ?? null, quantity: '', unitCost: '', supplierId: null, batchRef: '', note: '' })
  const [draft, setDraft] = useState<ReceiveDraft>(fresh)
  const [partLabel, setPartLabel] = useState<string | null>(target?.partLabel ?? null)
  const [tried, setTried] = useState(false)
  const action = useAction({ mutationFn: inventoryApi.receive, invalidate: INVENTORY_INVALIDATION, success: t('receive.saved'), onSuccess: () => onOpenChange(false) })
  const { reset } = action
  useEffect(() => {
    if (open) {
      setDraft(fresh())
      setPartLabel(target?.partLabel ?? null)
      setTried(false)
      reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset])

  const errors = validateReceive(draft)
  const show = (k: keyof typeof errors) => (tried ? problem(errors[k]) : undefined)
  const patch = (p: Partial<ReceiveDraft>) => setDraft((d) => ({ ...d, ...p }))

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('receive.title')}
      description={t('receive.hint')}
      target={partLabel ?? undefined}
      confirmLabel={t('actions.receive')}
      submitting={action.isPending}
      error={action.error}
      onSubmit={() => {
        setTried(true)
        if (Object.keys(errors).length === 0) action.mutate(receiveRequest(draft))
      }}
    >
      <Field label={t('form.branch')} htmlFor={`${uid}-branch`} required error={show('branchId')}>
        <BranchSelect id={`${uid}-branch`} value={draft.branchId} onChange={(branchId) => patch({ branchId })} emptyLabel={t('form.branch')} className="h-11" />
      </Field>
      {!target && (
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
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('form.quantity')} htmlFor={`${uid}-qty`} required error={show('quantity')}>
          <Input id={`${uid}-qty`} {...decimalProps} value={draft.quantity} onChange={(e) => patch({ quantity: e.target.value })} autoFocus={!!target} />
        </Field>
        <Field label={t('form.unitCost')} htmlFor={`${uid}-cost`} optional hint={t('receive.unitCostHint')} error={show('unitCost')}>
          <Input id={`${uid}-cost`} {...decimalProps} value={draft.unitCost} onChange={(e) => patch({ unitCost: e.target.value })} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('form.supplier')} htmlFor={`${uid}-supplier`} optional>
          <SupplierSelect id={`${uid}-supplier`} value={draft.supplierId} onChange={(supplierId) => patch({ supplierId })} />
        </Field>
        <Field label={t('form.batchRef')} htmlFor={`${uid}-batch`} optional error={show('batchRef')}>
          <Input id={`${uid}-batch`} dir="ltr" className="h-11" value={draft.batchRef} maxLength={INVENTORY_LIMITS.batchRef} onChange={(e) => patch({ batchRef: e.target.value })} />
        </Field>
      </div>
      <Field label={t('form.note')} htmlFor={`${uid}-note`} optional>
        <Textarea id={`${uid}-note`} dir="auto" rows={2} value={draft.note} maxLength={INVENTORY_LIMITS.note} onChange={(e) => patch({ note: e.target.value })} />
      </Field>
    </ActionDialog>
  )
}

/** "تعديل جرد": exactly one of a ± change or the counted on-hand, with a reason; below zero is the owner's. */
export function AdjustDialog({ open, onOpenChange, target }: Props) {
  const { t } = useTranslation('inventory')
  const uid = useId()
  const role = useRoleKind()
  const problem = useProblem()
  const defaultBranch = useDefaultBranch(target)
  const fresh = (): AdjustDraft => ({ branchId: defaultBranch, partItemId: target?.partItemId ?? null, mode: 'delta', value: '', reason: '', allowNegative: false })
  const [draft, setDraft] = useState<AdjustDraft>(fresh)
  const [partLabel, setPartLabel] = useState<string | null>(target?.partLabel ?? null)
  const [tried, setTried] = useState(false)
  const action = useAction({ mutationFn: inventoryApi.adjust, invalidate: INVENTORY_INVALIDATION, success: t('adjust.saved'), onSuccess: () => onOpenChange(false) })
  const { reset } = action
  useEffect(() => {
    if (open) {
      setDraft(fresh())
      setPartLabel(target?.partLabel ?? null)
      setTried(false)
      reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset])

  const errors = validateAdjust(draft)
  const show = (k: keyof typeof errors) => (tried ? problem(errors[k]) : undefined)
  const patch = (p: Partial<AdjustDraft>) => setDraft((d) => ({ ...d, ...p }))
  // The preview only makes sense for the row's own branch.
  const after = target && draft.branchId === target.branchId ? adjustedOnHand(target.onHand, draft) : null

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('adjust.title')}
      description={t('adjust.hint')}
      target={partLabel ?? undefined}
      changes={after !== null ? <span className={cn(after < 0 && 'text-tone-danger')}>{t('adjust.after')}: <Qty value={after} unit={target?.unit} /></span> : undefined}
      confirmLabel={t('actions.adjust')}
      submitting={action.isPending}
      error={action.error}
      onSubmit={() => {
        setTried(true)
        if (Object.keys(errors).length === 0) action.mutate(adjustRequest(draft, role))
      }}
    >
      <Field label={t('form.branch')} htmlFor={`${uid}-branch`} required error={show('branchId')}>
        <BranchSelect id={`${uid}-branch`} value={draft.branchId} onChange={(branchId) => patch({ branchId })} emptyLabel={t('form.branch')} className="h-11" />
      </Field>
      {!target && (
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
      )}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('adjust.title')}>
        {(['delta', 'count'] as AdjustMode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={draft.mode === m}
            onClick={() => patch({ mode: m, value: '' })}
            className={cn(
              'inline-flex h-11 items-center rounded-lg border px-4 text-sm font-medium',
              draft.mode === m ? 'border-primary bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted',
            )}
          >
            {m === 'delta' ? t('adjust.modeDelta') : t('adjust.modeCount')}
          </button>
        ))}
      </div>
      <Field
        label={draft.mode === 'delta' ? t('adjust.delta') : t('adjust.counted')}
        htmlFor={`${uid}-value`}
        required
        hint={draft.mode === 'delta' ? t('adjust.deltaHint') : undefined}
        error={show('value')}
      >
        <Input id={`${uid}-value`} {...decimalProps} value={draft.value} onChange={(e) => patch({ value: e.target.value })} />
      </Field>
      <Field label={t('form.reason')} htmlFor={`${uid}-reason`} required error={show('reason')}>
        <Textarea id={`${uid}-reason`} dir="auto" rows={2} value={draft.reason} maxLength={INVENTORY_LIMITS.reason} onChange={(e) => patch({ reason: e.target.value })} />
      </Field>
      {canOverrideNegative(role) && (
        <CheckboxField
          id={`${uid}-negative`}
          checked={draft.allowNegative}
          onCheckedChange={(allowNegative) => patch({ allowNegative })}
          label={t('adjust.allowNegative')}
          hint={t('adjust.allowNegativeHint')}
        />
      )}
    </ActionDialog>
  )
}

/** "تحويل": immediate, from one of the user's branches to any active branch of the organization. */
export function TransferDialog({ open, onOpenChange, target }: Props) {
  const { t } = useTranslation('inventory')
  const uid = useId()
  const problem = useProblem()
  const defaultBranch = useDefaultBranch(target)
  const branches = useBranches(open)
  const fresh = (): TransferDraft => ({ fromBranchId: defaultBranch, toBranchId: null, partItemId: target?.partItemId ?? null, quantity: '', note: '' })
  const [draft, setDraft] = useState<TransferDraft>(fresh)
  const [partLabel, setPartLabel] = useState<string | null>(target?.partLabel ?? null)
  const [tried, setTried] = useState(false)
  const action = useAction({ mutationFn: inventoryApi.transfer, invalidate: INVENTORY_INVALIDATION, success: t('transfer.saved'), onSuccess: () => onOpenChange(false) })
  const { reset } = action
  useEffect(() => {
    if (open) {
      setDraft(fresh())
      setPartLabel(target?.partLabel ?? null)
      setTried(false)
      reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset])

  const errors = validateTransfer(draft)
  const show = (k: keyof typeof errors) => (tried ? problem(errors[k]) : undefined)
  const patch = (p: Partial<TransferDraft>) => setDraft((d) => ({ ...d, ...p }))

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('transfer.title')}
      description={t('transfer.hint')}
      target={partLabel ?? undefined}
      confirmLabel={t('actions.transfer')}
      submitting={action.isPending}
      error={action.error}
      onSubmit={() => {
        setTried(true)
        if (Object.keys(errors).length === 0) action.mutate(transferRequest(draft))
      }}
    >
      {!target && (
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
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('transfer.from')} htmlFor={`${uid}-from`} required error={show('fromBranchId')}>
          <BranchSelect id={`${uid}-from`} value={draft.fromBranchId} onChange={(fromBranchId) => patch({ fromBranchId })} emptyLabel={t('transfer.from')} className="h-11" />
        </Field>
        {/* The destination may be any active branch of the organization, not only the user's own. */}
        <Field label={t('transfer.to')} htmlFor={`${uid}-to`} required error={show('toBranchId')}>
          <Select
            id={`${uid}-to`}
            value={draft.toBranchId ?? ''}
            onChange={(e) => patch({ toBranchId: e.target.value || null })}
            placeholder={t('transfer.to')}
            disabled={branches.isPending}
            className="h-11"
          >
            {(branches.data ?? [])
              .filter((b) => b.isActive && b.id !== draft.fromBranchId)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {b.code}
                </option>
              ))}
          </Select>
        </Field>
      </div>
      <Field label={t('form.quantity')} htmlFor={`${uid}-qty`} required error={show('quantity')}>
        <Input id={`${uid}-qty`} {...decimalProps} value={draft.quantity} onChange={(e) => patch({ quantity: e.target.value })} />
      </Field>
      <Field label={t('form.note')} htmlFor={`${uid}-note`} optional>
        <Textarea id={`${uid}-note`} dir="auto" rows={2} value={draft.note} maxLength={INVENTORY_LIMITS.note} onChange={(e) => patch({ note: e.target.value })} />
      </Field>
    </ActionDialog>
  )
}
