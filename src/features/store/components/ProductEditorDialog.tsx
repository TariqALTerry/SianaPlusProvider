import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ActionDialog } from '@/components/ActionDialog'
import { CheckboxField } from '@/components/ui/checkbox'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import type { StoreProductResponse } from '@/api/types'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import '../i18n'
import { productActionInvalidation, storeApi } from '../api'
import {
  DESCRIPTION_MAX,
  NAME_MAX,
  productFormDefaults,
  productFormSchema,
  SKU_MAX,
  toProductRequest,
  type ProductFieldError,
  type ProductFormValues,
} from '../product'
import { ServicePicker } from './ServicePicker'

interface ProductEditorDialogProps {
  open: boolean
  onClose: () => void
  /** Null = create (POST, with opening stock); otherwise edit (PUT, stock excluded). */
  product: StoreProductResponse | null
  onCreated?: (product: StoreProductResponse) => void
}

/**
 * Create or edit a product. Server errors (`ProductSkuExists`, `InstallationServiceRequired`,
 * `CanonicalServiceNotFound`, `ProductPriceInvalid`, `StockQuantityInvalid`) stay in the dialog.
 */
export function ProductEditorDialog({ open, onClose, product, onCreated }: ProductEditorDialogProps) {
  const { t } = useTranslation('store')
  const { pick } = useLang()
  const isEdit = !!product
  const form = useForm<ProductFormValues>({ resolver: zodResolver(productFormSchema), defaultValues: productFormDefaults(product) })
  const { register, control, formState, reset, handleSubmit, clearErrors } = form

  useEffect(() => {
    if (open) reset(productFormDefaults(product))
  }, [open, product, reset])

  const requiresDelivery = useWatch({ control, name: 'requiresDelivery' })
  const requiresInstallation = useWatch({ control, name: 'requiresInstallation' })

  const save = useAction({
    invalidate: productActionInvalidation,
    success: isEdit ? t('success.updated') : t('success.created'),
    mutationFn: (v: ProductFormValues) =>
      product ? storeApi.update(product.id, toProductRequest(v)) : storeApi.create({ ...toProductRequest(v), stockQuantity: Number(v.stockQuantity) }),
    onSuccess: (saved) => {
      onClose()
      if (!isEdit) onCreated?.(saved)
    },
  })

  useEffect(() => {
    if (open) save.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const err = (name: keyof ProductFormValues): string | undefined => {
    const code = formState.errors[name]?.message as ProductFieldError | undefined
    return code ? t(`form.errors.${code}`) : undefined
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={isEdit ? t('form.editTitle') : t('form.createTitle')}
      target={product ? `${product.sku} · ${pick(product.nameAr, product.nameEn)}` : undefined}
      confirmLabel={isEdit ? t('common:actions.saveChanges') : t('common:actions.create')}
      submitting={save.isPending}
      error={save.error}
      onSubmit={() => void handleSubmit((v) => save.mutate(v))()}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('fields.sku')} htmlFor="p-sku" required hint={t('fields.skuHint')} error={err('sku')}>
          <Input id="p-sku" dir="ltr" className="font-mono" autoComplete="off" maxLength={SKU_MAX} {...register('sku')} aria-invalid={!!formState.errors.sku} />
        </Field>
        <Field label={t('fields.price')} htmlFor="p-price" required error={err('price')}>
          <Input id="p-price" type="number" inputMode="decimal" min={0} step="0.01" dir="ltr" className="tabular" {...register('price')} aria-invalid={!!formState.errors.price} />
        </Field>
        <Field label={t('fields.nameAr')} htmlFor="p-name-ar" required error={err('nameAr')}>
          <Input id="p-name-ar" dir="rtl" maxLength={NAME_MAX} {...register('nameAr')} aria-invalid={!!formState.errors.nameAr} />
        </Field>
        <Field label={t('fields.nameEn')} htmlFor="p-name-en" required error={err('nameEn')}>
          <Input id="p-name-en" dir="ltr" maxLength={NAME_MAX} {...register('nameEn')} aria-invalid={!!formState.errors.nameEn} />
        </Field>
        <Field label={t('fields.descriptionAr')} htmlFor="p-desc-ar" optional error={err('descriptionAr')}>
          <Textarea id="p-desc-ar" dir="rtl" rows={3} maxLength={DESCRIPTION_MAX} {...register('descriptionAr')} />
        </Field>
        <Field label={t('fields.descriptionEn')} htmlFor="p-desc-en" optional error={err('descriptionEn')}>
          <Textarea id="p-desc-en" dir="ltr" rows={3} maxLength={DESCRIPTION_MAX} {...register('descriptionEn')} />
        </Field>
        {!isEdit && (
          <Field label={t('fields.stockQuantity')} htmlFor="p-stock" required hint={t('fields.stockHint')} error={err('stockQuantity')}>
            <Input
              id="p-stock"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              dir="ltr"
              className="tabular"
              {...register('stockQuantity')}
              aria-invalid={!!formState.errors.stockQuantity}
            />
          </Field>
        )}
      </div>

      <fieldset className="space-y-3 rounded-md border p-3">
        <legend className="px-1 text-sm font-medium">{t('form.fulfilment')}</legend>

        <Controller
          control={control}
          name="requiresDelivery"
          render={({ field }) => <CheckboxField id="p-req-delivery" checked={field.value} onCheckedChange={field.onChange} label={t('fields.requiresDelivery')} />}
        />
        {requiresDelivery && (
          <Field label={t('fields.deliveryService')} htmlFor="p-delivery" optional hint={t('fields.deliveryHint')}>
            <Controller
              control={control}
              name="deliveryServiceId"
              render={({ field }) => <ServicePicker id="p-delivery" value={field.value} onChange={field.onChange} />}
            />
          </Field>
        )}

        <Controller
          control={control}
          name="requiresInstallation"
          render={({ field }) => (
            <CheckboxField
              id="p-req-installation"
              checked={field.value}
              onCheckedChange={(v) => {
                field.onChange(v)
                if (!v) clearErrors('installationServiceId')
              }}
              label={t('fields.requiresInstallation')}
            />
          )}
        />
        {requiresInstallation && (
          <Field label={t('fields.installationService')} htmlFor="p-installation" required hint={t('fields.installationHint')} error={err('installationServiceId')}>
            <Controller
              control={control}
              name="installationServiceId"
              render={({ field }) => (
                <ServicePicker id="p-installation" value={field.value} onChange={field.onChange} invalid={!!formState.errors.installationServiceId} />
              )}
            />
          </Field>
        )}
      </fieldset>

      {!isEdit && <p className="text-xs text-muted-foreground">{t('form.imageHint')}</p>}
    </ActionDialog>
  )
}
