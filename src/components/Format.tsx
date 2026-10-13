import { useEffect, useState } from 'react'
import { Tooltip } from '@/components/ui/menu'
import { useLang } from '@/hooks/useLang'
import { formatDate, formatDateTime, formatDuration, formatMoney, formatNumber, formatPercent, formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'

/** SAR, two decimals, tabular digits. Negative values in the danger tone when `signed`. */
export function Money({
  value,
  className,
  signed,
  currency = true,
}: {
  value: number | null | undefined
  className?: string
  signed?: boolean
  currency?: boolean
}) {
  const { lang } = useLang()
  return (
    <span
      className={cn('tabular ltr-nums whitespace-nowrap', signed && value !== null && value !== undefined && value < 0 && 'text-tone-danger', className)}
    >
      {formatMoney(value, lang, currency)}
    </span>
  )
}

export function Num({ value, digits = 0, className }: { value: number | null | undefined; digits?: number; className?: string }) {
  const { lang } = useLang()
  return <span className={cn('tabular', className)}>{formatNumber(value, lang, digits)}</span>
}

export function Percent({ value, className }: { value: number | null | undefined; className?: string }) {
  const { lang } = useLang()
  return <span className={cn('tabular', className)}>{formatPercent(value, lang)}</span>
}

/** Re-render every minute so relative times stay honest on long-open pages. */
function useMinuteTick(): number {
  const [tick, setTick] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  return tick
}

/**
 * Relative time ("قبل 12 دقيقة") with the absolute Riyadh time in a tooltip (§4.3), or the
 * absolute time when `mode="absolute"`.
 */
export function DateTime({
  value,
  mode = 'relative',
  className,
}: {
  value: string | null | undefined
  mode?: 'relative' | 'absolute' | 'date'
  className?: string
}) {
  const { lang } = useLang()
  const tick = useMinuteTick()
  if (!value) return <span className="text-muted-foreground">—</span>
  const absolute = formatDateTime(value, lang)
  if (mode === 'absolute') return <time dateTime={value} className={cn('tabular whitespace-nowrap', className)}>{absolute}</time>
  if (mode === 'date') {
    return (
      <Tooltip content={absolute}>
        <time dateTime={value} className={cn('tabular whitespace-nowrap', className)}>{formatDate(value, lang)}</time>
      </Tooltip>
    )
  }
  return (
    <Tooltip content={absolute}>
      <time dateTime={value} className={cn('whitespace-nowrap', className)}>
        {formatRelative(value, lang, tick)}
      </time>
    </Tooltip>
  )
}

export function Duration({ minutes, className }: { minutes: number | null | undefined; className?: string }) {
  const { lang } = useLang()
  return <span className={cn('tabular whitespace-nowrap', className)}>{formatDuration(minutes, lang)}</span>
}
