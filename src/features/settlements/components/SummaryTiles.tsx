import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Hourglass, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Money } from '@/components/Format'
import { ErrorState } from '@/components/States'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useLang } from '@/hooks/useLang'
import { formatDate, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import '../i18n'
import { settlementKeys, settlementsApi } from '../api'

/** The three money tiles of §8.10: unsettled, being paid, paid. */
export function SummaryTiles() {
  const { t } = useTranslation('settlements')
  const { lang } = useLang()
  const query = useQuery({ queryKey: settlementKeys.summary(), queryFn: ({ signal }) => settlementsApi.summary(signal) })

  if (query.isPending) {
    return (
      <div className="grid gap-3 sm:grid-cols-3" aria-busy>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    )
  }
  if (query.isError) {
    return (
      <Card>
        <ErrorState compact error={query.error} onRetry={() => void query.refetch()} />
      </Card>
    )
  }

  const s = query.data
  const date = (v: string | null) => (v ? formatDate(v, lang) : t('summary.never'))

  return (
    <div className="space-y-1.5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile
          icon={<Wallet className="size-4" />}
          tone="attention"
          label={t('summary.unsettled')}
          value={<Money value={s.unsettledGrossAmount} />}
          sub={t('summary.unsettledItems', { count: s.unsettledItemsCount, formattedCount: formatNumber(s.unsettledItemsCount, lang) })}
        />
        <Tile
          icon={<Hourglass className="size-4" />}
          tone="waiting"
          label={t('summary.pending')}
          value={<Money value={s.pendingNetAmount} />}
          sub={t('summary.lastSettlement', { date: date(s.lastSettlementAt) })}
        />
        <Tile
          icon={<CheckCircle2 className="size-4" />}
          tone="success"
          label={t('summary.paid')}
          value={<Money value={s.paidNetAmount} />}
          sub={t('summary.lastPaid', { date: date(s.lastPaidAt) })}
        />
      </div>
      <p className="text-xs text-muted-foreground">{t('summary.scope')}</p>
    </div>
  )
}

const toneIcon = {
  attention: 'bg-tone-attention-soft text-tone-attention',
  waiting: 'bg-tone-waiting-soft text-tone-waiting',
  success: 'bg-tone-success-soft text-tone-success',
} as const

function Tile({ icon, tone, label, value, sub }: { icon: ReactNode; tone: keyof typeof toneIcon; label: string; value: ReactNode; sub: string }) {
  return (
    <Card className="flex items-start gap-3 px-4 py-3">
      <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md', toneIcon[tone])} aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-xl font-semibold">{value}</div>
        <div className="tabular mt-0.5 text-xs text-muted-foreground">{sub}</div>
      </div>
    </Card>
  )
}
