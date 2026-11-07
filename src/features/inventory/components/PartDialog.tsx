import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PartResponse } from '@/api/types'
import { ActionDialog } from '@/components/ActionDialog'
import { CheckboxField } from '@/components/ui/checkbox'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useAction } from '@/hooks/useAction'
import { INVENTORY_INVALIDATION, inventoryApi } from '../api'
import { EMPTY_PART, INVENTORY_LIMITS, partDraft, partRequest, validatePart, type PartDraft } from '../logic'
import '../i18n'

/** Create or edit a part (`SavePartRequest`, a full replace). No delete: stop it with "القطعة نشطة" off. */
export function PartDialog({ open, onOpenChange, part }: { open: boolean; onOpenChange: (open: boolean) => void; part?: PartResponse | null }) {
  const { t } = useTranslation('inventory')
  const uid = useId()
  const [draft, setDraft] = useState<PartDraft>(EMPTY_PART)
  const [tried, setTried] = useState(false)
  const action = useAction({
    mutationFn: (d: PartDraft) => (part ? inventoryApi.updatePart(part.id, partRequest(d, part.defaultCost)) : inventoryApi.createPart(partRequest(d))),
    invalidate: INVENTORY_INVALIDATION,
    success: part ? t('part.saved') : t('part.created'),
    onSuccess: () => onOpenChange(false),
  })
  const { reset } = action
  useEffect(() => {
    if (open) {
      setDraft(part ? partDraft(part) : EMPTY_PART)
      setTried(false)
      reset()
    }
  }, [open, part, reset])

  const errors = validatePart(draft)
  const show = (k: keyof PartDraft) => (tried && errors[k] ? t(`errors.${errors[k]}`) : undefined)
  const patch = (p: Partial<PartDraft>) => setDraft((d) => ({ ...d, ...p }))
  const id = (k: string) => `${uid}-${k}`
  const decimal = { type: 'text', inputMode: 'decimal', dir: 'ltr', autoComplete: 'off', className: 'h-11 tabular' } as const

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={part ? t('actions.editPart') : t('actions.addPart')}
      target={part ? `${part.sku} · ${part.nameAr}` : undefined}
      confirmLabel={t('common:actions.save')}
      size="lg"
      submitting={action.isPending}
      error={action.error}
      onSubmit={() => {
        setTried(true)
        if (Object.keys(errors).length === 0) action.mutate(draft)
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('form.sku')} htmlFor={id('sku')} required hint={t('form.skuHint')} error={show('sku')}>
          <Input id={id('sku')} dir="ltr" className="h-11 font-mono uppercase" value={draft.sku} maxLength={INVENTORY_LIMITS.sku} onChange={(e) => patch({ sku: e.target.value })} />
        </Field>
        <Field label={t('form.barcode')} htmlFor={id('barcode')} optional error={show('barcode')}>
          <Input id={id('barcode')} dir="ltr" className="h-11 font-mono" value={draft.barcode} maxLength={INVENTORY_LIMITS.barcode} onChange={(e) => patch({ barcode: e.target.value })} />
        </Field>
        <Field label={t('form.nameAr')} htmlFor={id('nameAr')} required error={show('nameAr')}>
          <Input id={id('nameAr')} dir="rtl" className="h-11" value={draft.nameAr} maxLength={INVENTORY_LIMITS.partName} onChange={(e) => patch({ nameAr: e.target.value })} />
        </Field>
        <Field label={t('form.nameEn')} htmlFor={id('nameEn')} optional hint={t('form.nameEnHint')} error={show('nameEn')}>
          <Input id={id('nameEn')} dir="ltr" className="h-11" value={draft.nameEn} maxLength={INVENTORY_LIMITS.partName} onChange={(e) => patch({ nameEn: e.target.value })} />
        </Field>
        <Field label={t('form.category')} htmlFor={id('category')} optional error={show('category')}>
          <Input id={id('category')} dir="auto" className="h-11" value={draft.category} maxLength={INVENTORY_LIMITS.category} onChange={(e) => patch({ category: e.target.value })} />
        </Field>
        <Field label={t('form.brand')} htmlFor={id('brand')} optional error={show('brand')}>
          <Input id={id('brand')} dir="auto" className="h-11" value={draft.brand} maxLength={INVENTORY_LIMITS.brand} onChange={(e) => patch({ brand: e.target.value })} />
        </Field>
      </div>
      <Field label={t('form.compatibleModels')} htmlFor={id('models')} optional error={show('compatibleModels')}>
        <Textarea id={id('models')} dir="auto" rows={2} value={draft.compatibleModels} maxLength={INVENTORY_LIMITS.models} onChange={(e) => patch({ compatibleModels: e.target.value })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t('form.defaultCost')} htmlFor={id('cost')} optional error={show('defaultCost')}>
          <Input id={id('cost')} {...decimal} value={draft.defaultCost} onChange={(e) => patch({ defaultCost: e.target.value })} />
        </Field>
        <Field label={t('form.defaultPrice')} htmlFor={id('price')} optional error={show('defaultPrice')}>
          <Input id={id('price')} {...decimal} value={draft.defaultPrice} onChange={(e) => patch({ defaultPrice: e.target.value })} />
        </Field>
        <Field label={t('form.unit')} htmlFor={id('unit')} optional hint={t('form.unitHint')} error={show('unit')}>
          <Input id={id('unit')} dir="ltr" className="h-11" value={draft.unit} maxLength={INVENTORY_LIMITS.unit} onChange={(e) => patch({ unit: e.target.value })} />
        </Field>
        <Field label={t('form.defaultWarrantyDays')} htmlFor={id('warranty')} optional hint={t('form.warrantyHint')} error={show('defaultWarrantyDays')}>
          <Input id={id('warranty')} {...decimal} inputMode="numeric" value={draft.defaultWarrantyDays} onChange={(e) => patch({ defaultWarrantyDays: e.target.value })} />
        </Field>
        <Field label={t('form.reorderLevel')} htmlFor={id('reorder')} optional hint={t('form.reorderHint')} error={show('reorderLevel')} className="sm:col-span-2">
          <Input id={id('reorder')} {...decimal} value={draft.reorderLevel} onChange={(e) => patch({ reorderLevel: e.target.value })} />
        </Field>
      </div>
      <CheckboxField id={id('active')} checked={draft.isActive} onCheckedChange={(isActive) => patch({ isActive })} label={t('form.isActive')} hint={t('form.isActiveHint')} />
    </ActionDialog>
  )
}
