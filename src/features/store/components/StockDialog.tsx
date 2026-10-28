import { Minus, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionDialog } from '@/components/ActionDialog'
import { Num } from '@/components/Format'
import { InlineError } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { ApiError, toApiError } from '@/api/http'
import type { StoreProductResponse, StoreProductVariantResponse } from '@/api/types'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import '../i18n'
import { productActionInvalidation, storeProductsApi } from '../api'
import { checkStockDelta, insufficientStockAvailable } from '../product'

interface StockDialogProps {
  product: StoreProductResponse
  /** A saved variant: moves that variant's stock (the product total follows). */
  variant?: StoreProductVariantResponse | null
  open: boolean
  onClose: () => void
}

/**
 * Relative stock movement (§3.4): `PATCH …/stock { delta }` for a simple product, or
 * `PATCH …/variants/{id}/stock { delta }` for a variant. Shows current → after before submitting.
 */
export function StockDialog({ product, variant, open, onClose }: StockDialogProps) {
  const { t } = useTranslation('store')
  const { pick, lang, isRtl } = useLang()
  const [raw, setRaw] = useState('')
  const current = variant ? variant.stockQuantity : product.stockQuantity

  useEffect(() => {
    if (open) setRaw('')
  }, [open])

  const check = checkStockDelta(raw, current)

  const action = useAction({
    invalidate: productActionInvalidation,
    success: t('success.stock'),
    onSuccess: onClose,
    mutationFn: (delta: number) => (variant ? storeProductsApi.adjustVariantStock(product.id, variant.id, delta) : storeProductsApi.adjustStock(product.id, delta)),
  })

  useEffect(() => {
    if (open) action.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // `InsufficientStock` carries `{ productId, available }`: show the server message plus the live count,
  // not the raw data lines the generic error box would print.
  const apiError = action.error ? toApiError(action.error) : null
  const insufficient = apiError?.errorCode === 'InsufficientStock'
  const available = insufficient ? insufficientStockAvailable(apiError?.details) : null

  const bump = (by: number) => {
    const n = Number(raw.trim())
    const base = raw.trim() !== '' && Number.isInteger(n) ? n : 0
    const v = base + by
    setRaw(v === 0 ? '' : String(v))
  }

  const fieldError = check.ok ? undefined : check.reason === 'negative' ? t('stock.negative') : check.reason === 'invalid' ? t('stock.invalid') : undefined

  return (
    <ActionDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      size="sm"
      title={t('stock.title')}
      target={`${variant ? variant.sku : product.sku} · ${pick(product.nameAr, product.nameEn)}${variant ? ` · ${pick(variant.labelAr, variant.labelEn)}` : ''}`}
      changes={
        <span className="flex items-center gap-3 text-base">
          <span className="flex flex-col">
            <span className="text-xs text-muted-foreground">{t('stock.current')}</span>
            <Num value={current} className="font-semibold" />
          </span>
          <span aria-hidden className="text-muted-foreground">
            {isRtl ? '←' : '→'}
          </span>
          <span className="flex flex-col">
            <span className="text-xs text-muted-foreground">{t('stock.next')}</span>
            <Num value={check.next} className={cn('font-semibold', check.next < 0 ? 'text-tone-danger' : check.ok ? 'text-tone-success' : '')} />
          </span>
        </span>
      }
      confirmLabel={t('actions.adjustStock')}
      submitting={action.isPending}
      submitDisabled={!check.ok}
      error={insufficient ? null : action.error}
      onSubmit={() => check.ok && action.mutate(check.delta)}
    >
      <Field label={t('stock.delta')} htmlFor="stock-delta" required hint={t('stock.deltaHint')} error={fieldError}>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => bump(-1)} aria-label="-1">
            <Minus />
          </Button>
          <Input
            id="stock-delta"
            type="number"
            inputMode="numeric"
            step={1}
            dir="ltr"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="+10 / -2"
            className="tabular w-32 text-center"
            autoFocus
            aria-invalid={!!fieldError}
          />
          <Button variant="outline" size="icon-sm" onClick={() => bump(1)} aria-label="+1">
            <Plus />
          </Button>
        </div>
      </Field>
      {insufficient && (
        <div className="space-y-1">
          <InlineError error={new ApiError({ status: apiError?.status ?? 400, errorCode: apiError?.errorCode ?? null, message: apiError?.message ?? '' })} />
          {available !== null && <p className="tabular text-xs text-muted-foreground">{t('stock.available', { count: available, formattedCount: formatNumber(available, lang) })}</p>}
        </div>
      )}
    </ActionDialog>
  )
}
