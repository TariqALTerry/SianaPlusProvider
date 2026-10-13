import { ImageOff, Truck, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { fileUrl } from '@/api/files'
import type { StoreProductResponse } from '@/api/types'
import { cn } from '@/lib/utils'
import '../i18n'

/** Fixed-size lazy thumbnail (no layout shift). */
export function Thumb({ url, size = 40, className }: { url: string | null; size?: number; className?: string }) {
  const src = fileUrl(url)
  return (
    <span className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted', className)} style={{ width: size, height: size }}>
      {src ? <img src={src} alt="" loading="lazy" width={size} height={size} className="size-full object-cover" /> : <ImageOff className="size-4 text-muted-foreground" aria-hidden />}
    </span>
  )
}

export function OutOfStockBadge({ quantity }: { quantity: number }) {
  const { t } = useTranslation('store')
  return quantity <= 0 ? <Badge tone="danger">{t('outOfStock')}</Badge> : null
}

export function VisibilityBadge({ active }: { active: boolean }) {
  const { t } = useTranslation('store')
  return (
    <Badge tone={active ? 'success' : 'muted'} dot>
      {active ? t('shown') : t('hidden')}
    </Badge>
  )
}

export function FulfilmentBadges({ product }: { product: Pick<StoreProductResponse, 'requiresDelivery' | 'requiresInstallation'> }) {
  const { t } = useTranslation('store')
  if (!product.requiresDelivery && !product.requiresInstallation) return <span className="text-muted-foreground">—</span>
  return (
    <span className="flex flex-wrap gap-1">
      {product.requiresDelivery && (
        <Badge tone="info">
          <Truck className="size-3" aria-hidden /> {t('delivery')}
        </Badge>
      )}
      {product.requiresInstallation && (
        <Badge tone="active">
          <Wrench className="size-3" aria-hidden /> {t('installation')}
        </Badge>
      )}
    </span>
  )
}
