import { Plus, Wrench } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fileUrl } from '@/api/files'
import { cn } from '@/lib/utils'
import { discountPercent, displayPrice, swatches, type ProductDraft } from '../productForm'
import '../i18n'

const money = (value: number, lang: 'ar' | 'en') =>
  new Intl.NumberFormat(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)

/**
 * The customer app's product card (SMART-STORE-MOBILE-PROMPT §2.3), drawn from the unsaved form:
 * 1:1 templated cover (never the original upload), offer badge, swatches, brand, two-line name,
 * price with the struck "was" price, and "from" for a product with variants.
 */
export function ProductPreview({ draft, coverUrl }: { draft: ProductDraft; coverUrl: string | null }) {
  const { t } = useTranslation('store')
  const [lang, setLang] = useState<'ar' | 'en'>('ar')
  const tl = (key: string, options?: Record<string, unknown>) => t(key, { ...options, lng: lang })
  const price = displayPrice(draft)
  const percent = discountPercent(price.price, price.compareAtPrice)
  const dots = swatches(draft)
  const name = (lang === 'en' ? draft.nameEn || draft.nameAr : draft.nameAr || draft.nameEn).trim()
  const src = fileUrl(coverUrl)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t('preview.title')}</h3>
        <div role="group" aria-label={t('preview.language')} className="inline-flex rounded-md border p-0.5 text-xs">
          {(['ar', 'en'] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={lang === l}
              onClick={() => setLang(l)}
              className={cn('rounded px-2 py-0.5', lang === l ? 'bg-brand-deep text-white' : 'text-muted-foreground')}
            >
              {l === 'ar' ? 'ع' : 'EN'}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[22px] bg-brand-deep p-4">
        <article
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          lang={lang}
          className="mx-auto w-[11.5rem] overflow-hidden rounded-[22px] border border-brand-line bg-white text-brand-ink shadow-[0_16px_45px_rgba(1,59,55,.08)]"
          style={{ fontFamily: lang === 'ar' ? '"IBM Plex Sans Arabic", sans-serif' : 'Inter, "IBM Plex Sans Arabic", sans-serif' }}
        >
          <div className="relative aspect-square bg-gradient-to-b from-white to-brand-wash">
            {src && <img src={src} alt="" className="size-full object-cover" />}
            {percent !== null && (
              <span className="absolute start-2 top-2 rounded-full bg-brand-yellow px-2 py-0.5 text-[11px] font-bold text-brand-ink" dir="ltr">
                -{percent}%
              </span>
            )}
            <span className="absolute bottom-2 end-2 flex size-8 items-center justify-center rounded-[14px] bg-brand-primary text-white shadow">
              <Plus className="size-4" />
            </span>
          </div>
          <div className="space-y-1 p-3">
            {dots.length > 0 && (
              <div className="flex items-center gap-1">
                {dots.map((hex, i) => (
                  <span key={`${hex}-${i}`} className="size-3 rounded-full border border-brand-line" style={{ backgroundColor: hex }} />
                ))}
              </div>
            )}
            {draft.brand.trim() && <p className="truncate text-xs text-brand-muted">{draft.brand.trim()}</p>}
            <p className={cn('line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5', !name && 'text-brand-muted')}>{name || tl('preview.noName')}</p>
            <p className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="text-[18px] font-extrabold text-brand-deep">
                {price.from && <span className="text-xs font-semibold text-brand-muted">{tl('preview.from')} </span>}
                {money(price.price, lang)} <span className="text-xs font-semibold">{tl('preview.currency')}</span>
              </span>
              {price.compareAtPrice !== null && <span className="text-xs text-brand-muted line-through">{money(price.compareAtPrice, lang)}</span>}
            </p>
            {draft.requiresInstallation && (
              <p className="flex items-center gap-1 text-[11px] text-brand-primary">
                <Wrench className="size-3" /> {tl('preview.installation')}
              </p>
            )}
          </div>
        </article>
      </div>
      {!src && <p className="text-xs text-muted-foreground">{t('preview.noCover')}</p>}
    </div>
  )
}
