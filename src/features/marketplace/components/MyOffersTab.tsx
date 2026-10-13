import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Inbox } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { DataTable } from '@/components/DataTable'
import { EntityLink, HumanNumber } from '@/components/EntityLink'
import { EnumFilter } from '@/components/Filters'
import { DateTime, Duration, Money } from '@/components/Format'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { listQueryOptions } from '@/api/queryClient'
import { MarketplaceOfferStatusValues, type MarketplaceOfferStatus, type ProviderOfferResponse } from '@/api/types'
import { useLang } from '@/hooks/useLang'
import '../i18n'
import { marketplaceApi, marketplaceKeys, prefetchTender, type OfferListParams } from '../api'
import type { MarketplaceUrl } from '../urlState'

/**
 * The organization's offers (`GET …/offers?status=`), newest first. For a won offer the row
 * follows the work: item number and status, technician, completion and settlement. The offer
 * DTO carries no service-item id, so the item number is shown (copyable), not linked.
 */
export function MyOffersTab({ url }: { url: MarketplaceUrl }) {
  const { t } = useTranslation('marketplace')
  const { pick } = useLang()
  const queryClient = useQueryClient()
  const { state, set, reset } = url

  const status = (MarketplaceOfferStatusValues as readonly string[]).includes(state.status) ? (state.status as MarketplaceOfferStatus) : undefined
  const params: OfferListParams = { status, page: state.page, pageSize: state.pageSize }
  const query = useQuery({
    queryKey: marketplaceKeys.offers(params),
    queryFn: ({ signal }) => marketplaceApi.offers(params, signal),
    ...listQueryOptions,
  })

  const prefetchNext = () => {
    const next = { ...params, page: state.page + 1 }
    void queryClient.prefetchQuery({ queryKey: marketplaceKeys.offers(next), queryFn: ({ signal }) => marketplaceApi.offers(next, signal) })
  }

  const columns = useMemo<ColumnDef<ProviderOfferResponse, unknown>[]>(
    () => [
      {
        id: 'number',
        header: t('columns.number'),
        meta: { alwaysVisible: true, cardHidden: true },
        cell: ({ row: { original: o } }) => <EntityLink kind="marketplace" id={o.requestId} label={o.requestNumber} mono />,
      },
      {
        id: 'service',
        header: t('columns.service'),
        meta: { cardTitle: true },
        cell: ({ row: { original: o } }) => (
          <div className="flex min-w-0 max-w-[18rem] flex-col gap-0.5">
            <span className="truncate font-medium">{pick(o.serviceNameAr, o.serviceNameEn)}</span>
            <span className="ltr-nums font-mono text-xs text-muted-foreground md:hidden">{o.requestNumber}</span>
          </div>
        ),
      },
      {
        id: 'amount',
        header: t('columns.amount'),
        meta: { align: 'end' },
        cell: ({ row: { original: o } }) => (
          <span className="flex flex-col items-end gap-0.5">
            <Money value={o.amount} className="font-medium" />
            {o.estimatedDurationMinutes ? <Duration minutes={o.estimatedDurationMinutes} className="text-xs text-muted-foreground" /> : null}
          </span>
        ),
      },
      { id: 'status', header: t('columns.status'), cell: ({ row: { original: o } }) => <StatusBadge enum="MarketplaceOfferStatus" value={o.status} /> },
      {
        id: 'tender',
        header: t('columns.tender'),
        meta: { defaultHidden: true },
        cell: ({ row: { original: o } }) => <StatusBadge enum="MarketplaceRequestStatus" value={o.requestStatus} dot={false} />,
      },
      {
        id: 'item',
        header: t('columns.item'),
        cell: ({ row: { original: o } }) =>
          o.status === 'Accepted' ? (
            <span className="flex flex-col items-start gap-1">
              <HumanNumber value={o.itemNumber} />
              <StatusBadge enum="ServiceItemStatus" value={o.itemStatus} />
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      { id: 'executor', header: t('columns.executor'), cell: ({ row: { original: o } }) => <span className="text-sm">{o.executorName ?? '—'}</span> },
      {
        id: 'completedAt',
        header: t('columns.completedAt'),
        cell: ({ row: { original: o } }) => <DateTime value={o.completedAt} mode="date" className="text-xs" />,
      },
      {
        id: 'settlement',
        header: t('columns.settlement'),
        cell: ({ row: { original: o } }) => <HumanNumber value={o.settlementNumber} />,
      },
      {
        id: 'submittedAt',
        header: t('columns.submittedAt'),
        meta: { cardHidden: true },
        cell: ({ row: { original: o } }) => <DateTime value={o.submittedAt} className="text-xs text-muted-foreground" />,
      },
    ],
    [t, pick],
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-surface px-3 py-2 text-sm">
        <span className="text-muted-foreground">{t('wonHint')}</span>
        <Button asChild variant="outline" size="sm">
          <Link to="/incoming">
            <Inbox /> {t('openIncoming')}
          </Link>
        </Button>
      </div>
      <DataTable
        id="marketplace-offers"
        columns={columns}
        query={query}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={(page) => set({ page })}
        onPageSizeChange={(pageSize) => set({ pageSize })}
        getRowId={(o) => o.id}
        rowHref={(o) => `/marketplace/${o.requestId}`}
        onRowHover={(o) => void prefetchTender(queryClient, o.requestId)}
        onPrefetchNext={prefetchNext}
        filtered={!!status}
        onClearFilters={() => reset(['tab'])}
        emptyTitle={status ? undefined : t('emptyOffers')}
        toolbar={<EnumFilter enumName="MarketplaceOfferStatus" value={status ?? ''} onChange={(v) => set({ status: v })} label={t('columns.status')} />}
      />
    </div>
  )
}
