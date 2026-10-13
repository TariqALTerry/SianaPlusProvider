import type { UseQueryResult } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Num, Percent } from '@/components/Format'
import { Rating, Stars } from '@/components/Stars'
import { ErrorState } from '@/components/States'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { ReviewSummaryResponse } from '@/api/types'
import { useLang } from '@/hooks/useLang'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import '../i18n'
import { histogramRows } from '../histogram'

interface RatingSummaryProps {
  query: Pick<UseQueryResult<ReviewSummaryResponse>, 'data' | 'isPending' | 'isError' | 'error' | 'refetch'>
  selectedExecutorId: string
  onSelectExecutor: (executorId: string) => void
}

/** Average + 5★…1★ histogram, and the technician leaderboard (click to filter the list). */
export function RatingSummary({ query, selectedExecutorId, onSelectExecutor }: RatingSummaryProps) {
  const { t } = useTranslation('reviews')
  const { lang } = useLang()

  if (query.isPending) {
    return (
      <div className="grid gap-4 lg:grid-cols-2" aria-busy>
        <Skeleton className="h-52" />
        <Skeleton className="h-52" />
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
  if (!s) return null
  const rows = histogramRows(s.distribution)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title={t('summary.distribution')} />
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex shrink-0 flex-col items-center gap-1 sm:w-36">
            <span className="tabular text-4xl font-semibold">{s.ratingsCount > 0 ? formatNumber(s.averageRating, lang, 1) : '—'}</span>
            <Stars value={s.averageRating} showValue={false} />
            <span className="tabular text-xs text-muted-foreground">{t('summary.count', { count: s.ratingsCount })}</span>
            <span className="text-xs text-muted-foreground">{t('summary.average')}</span>
          </div>
          <ul className="flex-1 space-y-1.5" aria-label={t('summary.distribution')}>
            {rows.map((r) => (
              <li key={r.stars} className="flex items-center gap-2 text-xs" aria-label={`${t('summary.starsLabel', { stars: r.stars })}: ${r.count}`}>
                <span className="tabular inline-flex w-8 shrink-0 items-center gap-0.5">
                  {r.stars}
                  <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden />
                </span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <span
                    className={cn('block h-full rounded-full', r.stars <= 2 ? 'bg-tone-danger' : r.stars === 3 ? 'bg-tone-waiting' : 'bg-primary')}
                    style={{ width: `${Math.round(r.fraction * 100)}%` }}
                  />
                </span>
                <Percent value={r.fraction} className="w-10 shrink-0 text-end text-muted-foreground" />
                <Num value={r.count} className="w-8 shrink-0 text-end" />
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('summary.leaderboard')} />
        {s.executors.length === 0 ? (
          <CardBody className="text-sm text-muted-foreground">{t('summary.leaderboardEmpty')}</CardBody>
        ) : (
          <ol className="max-h-64 divide-y overflow-y-auto">
            {s.executors.map((e, i) => {
              const selected = e.executorId === selectedExecutorId
              return (
                <li key={e.executorId}>
                  <button
                    type="button"
                    onClick={() => onSelectExecutor(selected ? '' : e.executorId)}
                    aria-pressed={selected}
                    title={t('summary.filterBy', { name: e.fullName })}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2 text-start text-sm transition-colors hover:bg-muted/60 focus-visible:bg-muted/60',
                      selected && 'bg-primary-soft',
                    )}
                  >
                    <span className="tabular w-5 shrink-0 text-xs text-muted-foreground">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{e.fullName || '—'}</span>
                    <Rating value={e.averageRating} count={e.ratingsCount} />
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </Card>
    </div>
  )
}
