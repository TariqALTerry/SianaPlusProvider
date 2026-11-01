import { useQueryClient } from '@tanstack/react-query'
import { Clock, RefreshCw, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { DateTime, Money } from '@/components/Format'
import { InlineError } from '@/components/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { canPrefetch } from '@/api/netStatus'
import type { QuotationReviewResponse } from '@/api/types'
import { useLang } from '@/hooks/useLang'
import { prefetchWorkItem } from '@/features/work/api'
import { QuotationReviewActions } from '@/features/work/components/QuotationReview'
import { overLimitBy } from '../logic'
import { useQuotationReviews } from '../queries'
import '../i18n'

/** The quotations waiting for the company, above the Incoming list. Nothing shows while there are none. */
export function QuotationReviews() {
  const { t } = useTranslation('incoming')
  const query = useQuotationReviews()
  const rows = query.data ?? []

  if (query.isError) {
    return (
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <InlineError error={query.error} className="min-w-0 flex-1" />
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
          <RefreshCw /> {t('common:actions.retry')}
        </Button>
      </div>
    )
  }
  if (!rows.length) return null

  return (
    <section aria-labelledby="quotation-reviews" className="mb-6">
      <div className="mb-3">
        <h2 id="quotation-reviews" className="flex items-center gap-2 font-semibold">
          {t('reviews.title')}
          <span className="tabular rounded-full bg-tone-attention-soft px-2 py-0.5 text-xs font-medium text-tone-attention">{rows.length}</span>
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{t('reviews.description')}</p>
      </div>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <li key={row.quotation.id} className="flex">
            <ReviewCard row={row} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function ReviewCard({ row }: { row: QuotationReviewResponse }) {
  const { t } = useTranslation('incoming')
  const { t: tw } = useTranslation('work')
  const { pick } = useLang()
  const queryClient = useQueryClient()
  const { quotation } = row
  const over = overLimitBy(quotation.total, row.executorLimit)
  const prefetch = () => canPrefetch() && void prefetchWorkItem(queryClient, row.serviceItemId)

  return (
    <Card className="flex w-full flex-col border-tone-attention/40">
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold leading-snug">{pick(row.serviceNameAr, row.serviceNameEn)}</h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              {row.itemNumber && <span className="ltr-nums font-mono">{row.itemNumber}</span>}
              <span className="ltr-nums font-mono">{quotation.quotationNumber}</span>
            </p>
          </div>
          <Badge tone="attention" className="shrink-0">
            <Clock className="size-3" aria-hidden />
            <DateTime value={quotation.sentAt ?? quotation.createdAt} />
          </Badge>
        </div>

        <p className="flex items-center gap-2 text-sm">
          <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="sr-only">{t('reviews.technician')}: </span>
          <span>{row.executorName ?? '—'}</span>
        </p>

        <dl className="space-y-1 rounded-md bg-muted/60 px-3 py-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t('reviews.total')}</dt>
            <dd className="font-semibold">
              <Money value={quotation.total} />
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t('reviews.limit')}</dt>
            <dd>{row.executorLimit === null ? <span className="text-muted-foreground">{t('reviews.noLimit')}</span> : <Money value={row.executorLimit} />}</dd>
          </div>
          {over !== null && (
            <div className="flex justify-between gap-3 text-tone-attention">
              <dt>{t('reviews.overBy')}</dt>
              <dd className="font-medium">
                <Money value={over} />
              </dd>
            </div>
          )}
        </dl>

        {quotation.increaseReason && (
          <div className="text-sm">
            <p className="text-xs text-muted-foreground">{tw('detail.quotation.increaseReason')}</p>
            <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap">{quotation.increaseReason}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t bg-muted/30 px-4 py-3">
        <QuotationReviewActions item={{ ...row, id: row.serviceItemId }} quotation={quotation} />
        <Link
          to={`/work/${row.serviceItemId}?tab=quotations`}
          onMouseEnter={prefetch}
          onFocus={prefetch}
          className="ms-auto text-xs font-medium text-primary hover:underline"
        >
          {t('reviews.details')}
        </Link>
      </div>
    </Card>
  )
}
