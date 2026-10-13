import { useQuery } from '@tanstack/react-query'
import { Boxes, Pencil, Truck, Wrench } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/components/ActionDialog'
import { HumanNumber } from '@/components/EntityLink'
import { FileUpload } from '@/components/FileUpload'
import { DateTime, Money, Num } from '@/components/Format'
import { KeyValue } from '@/components/KeyValue'
import { ErrorState } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/checkbox'
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle, SheetContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { fileUrl } from '@/api/files'
import { detailQueryOptions } from '@/api/queryClient'
import type { StoreProductResponse } from '@/api/types'
import { useProvider } from '@/app/provider'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import '../i18n'
import { productActionInvalidation, storeApi, storeKeys } from '../api'
import { OutOfStockBadge, VisibilityBadge } from './ProductBits'
import { ProductEditorDialog } from './ProductEditorDialog'
import { useServiceName } from './useServiceName'
import { StockDialog } from './StockDialog'

interface ProductDrawerProps {
  productId: string | null
  /** The list row, shown instantly while the detail loads. */
  placeholder?: StoreProductResponse
  onClose: () => void
}

/** Side drawer for one product (`/store?open=:id`): image, stock, visibility, details, edit. */
export function ProductDrawer({ productId, placeholder, onClose }: ProductDrawerProps) {
  const { t } = useTranslation('store')
  const open = !!productId

  const query = useQuery({
    queryKey: storeKeys.detail(productId ?? ''),
    queryFn: ({ signal }) => storeApi.detail(productId!, signal),
    enabled: open,
    placeholderData: placeholder,
    ...detailQueryOptions,
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent size="md">
        {query.data ? (
          <ProductDrawerBody product={query.data} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t('drawer.title')}</DialogTitle>
            </DialogHeader>
            {query.isError ? (
              <ErrorState error={query.error} onRetry={() => void query.refetch()} />
            ) : (
              <div className="space-y-3 p-5" aria-busy>
                <Skeleton className="size-16" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-32" />
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Dialog>
  )
}

function ProductDrawerBody({ product }: { product: StoreProductResponse }) {
  const { t } = useTranslation('store')
  const { pick } = useLang()
  const { operational } = useProvider()
  const [dialog, setDialog] = useState<'edit' | 'stock' | 'active' | null>(null)
  const close = () => setDialog(null)
  const target = `${product.sku} · ${pick(product.nameAr, product.nameEn)}`
  const imageSrc = fileUrl(product.imageUrl)

  const upload = useAction({
    invalidate: productActionInvalidation,
    success: t('success.image'),
    mutationFn: (file: File) => storeApi.uploadImage(product.id, file),
  })
  const setActive = useAction({
    invalidate: productActionInvalidation,
    success: (saved) => (saved.isActive ? t('success.shown') : t('success.hidden')),
    onSuccess: close,
    mutationFn: () => storeApi.setActive(product.id, !product.isActive),
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          {pick(product.nameAr, product.nameEn)}
          <VisibilityBadge active={product.isActive} />
        </DialogTitle>
        <DialogDescription asChild>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <HumanNumber value={product.sku} />
            <Money value={product.price} className="font-medium text-foreground" />
          </div>
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-5">
        {!operational && <p className="rounded-md bg-tone-attention-soft px-3 py-2 text-sm text-tone-attention">{t('notOperational')}</p>}

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t('drawer.image')}</h3>
          {operational ? (
            <FileUpload currentUrl={product.imageUrl} onUpload={(file) => upload.mutateAsync(file)} />
          ) : imageSrc ? (
            <img src={imageSrc} alt={pick(product.nameAr, product.nameEn)} loading="lazy" className="max-h-48 rounded-md border object-contain" />
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground" aria-hidden>
              <Boxes className="size-4" />
            </span>
            <div>
              <div className="text-xs text-muted-foreground">{t('drawer.stock')}</div>
              <div className="flex items-center gap-2">
                <Num value={product.stockQuantity} className="text-lg font-semibold" />
                <OutOfStockBadge quantity={product.stockQuantity} />
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setDialog('stock')} disabled={!operational}>
            {t('actions.adjustStock')}
          </Button>
        </section>

        <section className="flex items-center justify-between gap-3 rounded-md border p-3">
          <div>
            <div id="product-visibility" className="text-sm font-medium">
              {t('drawer.visibility')}
            </div>
            <div className="text-xs text-muted-foreground">{product.isActive ? t('drawer.shownHint') : t('drawer.hiddenHint')}</div>
          </div>
          <Switch
            checked={product.isActive}
            onCheckedChange={() => setDialog('active')}
            disabled={!operational}
            aria-labelledby="product-visibility"
          />
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">{t('drawer.details')}</h3>
          <KeyValue
            items={[
              { label: t('fields.nameAr'), value: <span dir="rtl">{product.nameAr}</span> },
              { label: t('fields.nameEn'), value: <span dir="ltr">{product.nameEn}</span> },
              { label: t('columns.createdAt'), value: <DateTime value={product.createdAt} mode="absolute" /> },
              { label: t('drawer.updatedAt'), value: product.updatedAt && <DateTime value={product.updatedAt} />, hidden: !product.updatedAt },
              {
                label: t('fields.descriptionAr'),
                value: product.descriptionAr && (
                  <span dir="rtl" className="whitespace-pre-line">
                    {product.descriptionAr}
                  </span>
                ),
                wide: true,
              },
              {
                label: t('fields.descriptionEn'),
                value: product.descriptionEn && (
                  <span dir="ltr" className="block whitespace-pre-line">
                    {product.descriptionEn}
                  </span>
                ),
                wide: true,
              },
            ]}
          />
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">{t('drawer.fulfilment')}</h3>
          <KeyValue
            columns={1}
            items={[
              {
                label: (
                  <span className="inline-flex items-center gap-1">
                    <Truck className="size-3.5" aria-hidden /> {t('fields.deliveryService')}
                  </span>
                ),
                value: <ServiceCell required={product.requiresDelivery} id={product.deliveryServiceId} />,
              },
              {
                label: (
                  <span className="inline-flex items-center gap-1">
                    <Wrench className="size-3.5" aria-hidden /> {t('fields.installationService')}
                  </span>
                ),
                value: <ServiceCell required={product.requiresInstallation} id={product.installationServiceId} />,
              },
            ]}
          />
        </section>
      </DialogBody>

      <DialogFooter>
        <Button size="sm" onClick={() => setDialog('edit')} disabled={!operational}>
          <Pencil /> {t('actions.edit')}
        </Button>
      </DialogFooter>

      <ProductEditorDialog open={dialog === 'edit'} onClose={close} product={product} />
      <StockDialog open={dialog === 'stock'} onClose={close} product={product} />
      <ConfirmDialog
        open={dialog === 'active'}
        onOpenChange={(o) => !o && close()}
        destructive={product.isActive}
        title={product.isActive ? t('actions.hide') : t('actions.show')}
        target={target}
        changes={product.isActive ? t('actions.hideChange') : t('actions.showChange')}
        confirmLabel={product.isActive ? t('actions.hide') : t('actions.show')}
        submitting={setActive.isPending}
        error={setActive.error}
        onSubmit={() => setActive.mutate()}
      />
    </>
  )
}

function ServiceCell({ required, id }: { required: boolean; id: string | null }) {
  const { t } = useTranslation('store')
  const service = useServiceName(required ? id : null)
  if (!required) return <span className="text-muted-foreground">{t('drawer.notRequired')}</span>
  if (!id) return <span className="text-muted-foreground">—</span>
  if (service.name) {
    return (
      <span>
        {service.name}
        {service.code && <span className="ltr-nums ms-2 font-mono text-xs text-muted-foreground">{service.code}</span>}
      </span>
    )
  }
  return <span className="text-muted-foreground">{service.missing ? t('picker.unavailable') : '…'}</span>
}
