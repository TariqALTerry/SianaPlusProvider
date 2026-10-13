import { useQueryClient } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Money } from '@/components/Format'
import { Tooltip } from '@/components/ui/menu'
import { useLang } from '@/hooks/useLang'
import { enumLabel } from '@/i18n/enums'
import { formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useWriteGate } from '../hooks'
import { WORK_INVALIDATION } from '../api'
import { commissionAmount, initials, isStaleItemDetail, loadRatio, type WorkErrorDetail } from '../logic'
import '../i18n'

export function WriteGateNote({ className }: { className?: string }) {
  const { disabled, reason } = useWriteGate()
  if (!disabled) return null
  return (
    <p className={cn('flex items-center gap-1.5 text-xs text-tone-attention', className)} role="note">
      <Lock className="size-3.5 shrink-0" aria-hidden /> {reason}
    </p>
  )
}

/** "صافي لك 170.00 ر.س" with the gross and the commission in a tooltip (§8.3). */
export function NetInline({
  netAmount,
  finalAmount,
  commissionRate,
  hideLabel,
  className,
}: {
  netAmount: number
  finalAmount: number
  commissionRate: number | null
  /** In a column already titled "صافي لك". */
  hideLabel?: boolean
  className?: string
}) {
  const { t } = useTranslation('work')
  const { lang } = useLang()
  const commission = commissionAmount(finalAmount, netAmount)
  const breakdown = (
    <span className="block space-y-0.5">
      <span className="flex justify-between gap-4">
        <span>{t('net.gross')}</span>
        <Money value={finalAmount} />
      </span>
      <span className="flex justify-between gap-4">
        <span>{commissionRate !== null ? t('net.commissionWithRate', { rate: formatPercent(commissionRate, lang) }) : t('net.commission')}</span>
        <Money value={-commission} />
      </span>
    </span>
  )
  return (
    <Tooltip content={breakdown}>
      <span tabIndex={0} className={cn('inline-flex cursor-help items-baseline gap-1.5 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}>
        {!hideLabel && <span className="text-xs text-muted-foreground">{t('net.label')}</span>}
        <Money value={netAmount} className="font-semibold text-primary" />
      </span>
    </Tooltip>
  )
}

/** The item page's money block: net first, then how it was computed. */
export function NetBlock({
  item,
}: {
  item: { netAmount: number; finalAmount: number; commissionRate: number | null; baseAmount: number; quotedAmount: number | null; refundedAmount: number }
}) {
  const { t } = useTranslation('work')
  const { lang } = useLang()
  const commission = commissionAmount(item.finalAmount, item.netAmount)
  const rows: Array<[string, number, boolean?]> = [
    [t('net.gross'), item.finalAmount],
    [item.commissionRate !== null ? t('net.commissionWithRate', { rate: formatPercent(item.commissionRate, lang) }) : t('net.commission'), -commission, true],
  ]
  if (item.quotedAmount !== null && item.quotedAmount !== item.finalAmount) rows.push([t('net.quoted'), item.quotedAmount])
  if (item.baseAmount !== item.finalAmount) rows.push([t('net.base'), item.baseAmount])
  if (item.refundedAmount > 0) rows.push([t('net.refunded'), -item.refundedAmount, true])
  return (
    <div className="rounded-xl border bg-primary-soft/60 p-4">
      <p className="text-xs font-medium text-muted-foreground">{t('net.label')}</p>
      <Money value={item.netAmount} className="mt-1 block text-2xl font-bold text-primary" />
      <dl className="mt-3 space-y-1 border-t border-primary/15 pt-2 text-sm">
        {rows.map(([label, value, signed]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>
              <Money value={value} signed={signed} className="text-[0.8125rem]" />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** `used/total` bar: green, then amber past 75 %, red when full. */
export function LoadBar({ used, total, className }: { used: number; total: number; className?: string }) {
  const { t } = useTranslation('work')
  const r = loadRatio(used, total)
  const full = used >= total
  return (
    <span className={cn('inline-flex items-center gap-2', className)} title={`${t('picker.load')}: ${used}/${total}`}>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" role="meter" aria-valuemin={0} aria-valuemax={total} aria-valuenow={used} aria-label={t('picker.load')}>
        <span className={cn('block h-full rounded-full', full ? 'bg-tone-danger' : r > 0.75 ? 'bg-tone-waiting' : 'bg-tone-success')} style={{ width: `${r * 100}%` }} />
      </span>
      <span className="tabular ltr-nums text-xs text-muted-foreground">
        {used}/{total}
      </span>
    </span>
  )
}

export function ScoreBar({ score, className }: { score: number; className?: string }) {
  const { t } = useTranslation('work')
  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100)
  return (
    <span className={cn('inline-flex items-center gap-2', className)} title={`${t('picker.score')}: ${pct}%`}>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-muted" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t('picker.score')}>
        <span className="block h-full rounded-full bg-brand-teal" style={{ width: `${pct}%` }} />
      </span>
      <span className="tabular text-xs text-muted-foreground">{pct}%</span>
    </span>
  )
}

export function Avatar({ name, className, muted }: { name: string | null | undefined; className?: string; muted?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
        muted ? 'bg-muted text-muted-foreground' : 'bg-primary-soft text-primary',
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

/**
 * Phrases assignment errors (§8.4) under the server's message: the structured data, or what to
 * do when the item changed elsewhere — in which case the work data is refetched so the page
 * shows the item's real state.
 */
export function WorkErrorHint({ detail }: { detail: WorkErrorDetail | null }) {
  const { t } = useTranslation('work')
  const { lang } = useLang()
  const queryClient = useQueryClient()
  const stale = isStaleItemDetail(detail)
  useEffect(() => {
    if (stale) for (const queryKey of WORK_INVALIDATION) void queryClient.invalidateQueries({ queryKey })
  }, [stale, detail, queryClient])
  if (!detail) return null
  const text =
    detail.kind === 'capacity'
      ? t('errors.capacity', { active: detail.activeJobs, max: detail.maxConcurrentJobs })
      : detail.kind === 'capabilities'
        ? t('errors.capabilities', { count: detail.count })
        : detail.kind === 'transition'
          ? t('errors.transition', { from: enumLabel('ServiceItemStatus', detail.from, lang), to: enumLabel('ServiceItemStatus', detail.to, lang) })
          : t(`errors.${detail.kind}`)
  return (
    <p role="status" className="rounded-md bg-tone-attention-soft px-3 py-2 text-xs text-tone-attention">
      {text}
    </p>
  )
}
