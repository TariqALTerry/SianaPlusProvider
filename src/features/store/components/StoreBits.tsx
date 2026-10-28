import { ImageOff, Sparkles, Store } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { EmptyState } from '@/components/States'
import { Button } from '@/components/ui/button'
import { fileUrl } from '@/api/files'
import { cn } from '@/lib/utils'
import { errorCodeOf } from '../api'
import '../i18n'

/** "AI" on mint (§1): the product was drafted by the model. */
export function AiBadge({ className }: { className?: string }) {
  const { t } = useTranslation('store')
  return (
    <span
      title={t('products.aiGenerated')}
      className={cn('inline-flex items-center gap-1 rounded-full bg-brand-mint px-2 py-0.5 text-[11px] font-semibold text-brand-deep', className)}
    >
      <Sparkles className="size-3" aria-hidden />
      AI
    </span>
  )
}

/** "مسودة" on yellow (§1): saved but not on sale. */
export function DraftBadge({ className }: { className?: string }) {
  const { t } = useTranslation('store')
  return <span className={cn('inline-flex items-center rounded-full bg-brand-yellow/90 px-2 py-0.5 text-[11px] font-semibold text-brand-ink', className)}>{t('products.draft')}</span>
}

/** Fixed-size lazy thumbnail of the templated cover (no layout shift); a soft placeholder before it is ready. */
export function ProductThumb({ url, size = 40, className }: { url: string | null | undefined; size?: number; className?: string }) {
  const src = fileUrl(url)
  return (
    <span
      className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-gradient-to-b from-white to-brand-wash', className)}
      style={{ width: size, height: size }}
    >
      {src ? <img src={src} alt="" loading="lazy" width={size} height={size} className="size-full object-cover" /> : <ImageOff className="size-4 text-brand-muted" />}
    </span>
  )
}

/**
 * "المتجر غير متاح" (§2): the module was switched off (`StoreModuleDisabled`), or the organization
 * can't operate (`ProviderNotOperational`). The shell refetches the organization and hides the link.
 */
export function StoreUnavailable({ error }: { error: unknown }) {
  const { t } = useTranslation('store')
  const code = errorCodeOf(error)
  return (
    <EmptyState
      className="mt-16"
      icon={<Store className="size-5" />}
      title={t('unavailable.title')}
      description={code === 'ProviderNotOperational' ? t('errors.ProviderNotOperational') : t('errors.StoreModuleDisabled')}
      action={
        <Button asChild variant="outline">
          <Link to="/">{t('common:notFound.back')}</Link>
        </Button>
      }
    />
  )
}

/** Writes are refused until the organization can operate again; the form stays readable. */
export function NotOperationalNote() {
  const { t } = useTranslation('store')
  return <p className="mb-3 rounded-md bg-tone-attention-soft px-3 py-2 text-sm text-tone-attention">{t('notOperational')}</p>
}
