import { Star } from 'lucide-react'
import { useLang } from '@/hooks/useLang'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

/** 1–5 stars. `value` may be fractional (averages); ≤ 2 is highlighted as low (§9.2). */
export function Stars({ value, showValue = true, className }: { value: number | null | undefined; showValue?: boolean; className?: string }) {
  const { lang } = useLang()
  if (value === null || value === undefined || value <= 0) return <span className="text-muted-foreground">—</span>
  const rounded = Math.round(value)
  const low = value <= 2
  return (
    <span className={cn('inline-flex items-center gap-1', className)} aria-label={`${value} / 5`}>
      <span className="inline-flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={cn('size-3.5', i <= rounded ? (low ? 'fill-tone-danger text-tone-danger' : 'fill-amber-400 text-amber-400') : 'text-muted-foreground/40')} />
        ))}
      </span>
      {showValue && <span className={cn('tabular text-xs', low ? 'font-medium text-tone-danger' : 'text-muted-foreground')}>{formatNumber(value, lang, 1)}</span>}
    </span>
  )
}

/** Compact "★ 4.6" for dense table cells. */
export function Rating({ value, count }: { value: number | null | undefined; count?: number }) {
  const { lang } = useLang()
  if (!value) return <span className="text-muted-foreground">—</span>
  return (
    <span className={cn('tabular inline-flex items-center gap-1 whitespace-nowrap', value < 3.5 && 'text-tone-danger')}>
      <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
      {formatNumber(value, lang, 1)}
      {count !== undefined && <span className="text-xs text-muted-foreground">({formatNumber(count, lang)})</span>}
    </span>
  )
}
