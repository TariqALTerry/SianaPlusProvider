import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from '@/components/DataTable'
import { EntityLink } from '@/components/EntityLink'
import { SearchInput } from '@/components/Filters'
import { DateTime, Money, Num } from '@/components/Format'
import { StatusBadge } from '@/components/StatusBadge'
import { listQueryOptions } from '@/api/queryClient'
import type { ProviderMarketplaceRequestResponse } from '@/api/types'
import { useLang } from '@/hooks/useLang'
import { formatDateTime } from '@/lib/format'
import '../i18n'
import { marketplaceApi, marketplaceKeys, prefetchTender, type TenderListParams } from '../api'
import type { MarketplaceUrl } from '../urlState'
import { Countdown } from './Countdown'

/** Open tenders the organization qualifies for (`GET …/requests?search=&page=`). */
export function OpenTendersTab({ url }: { url: MarketplaceUrl }) {
  const { t } = useTranslation('marketplace')
  const { pick, lang } = useLang()
  const queryClient = useQueryClient()
  const { state, set, reset } = url

  const params: TenderListParams = { search: state.search || undefined, page: state.page, pageSize: state.pageSize }
  const query = useQuery({
    queryKey: marketplaceKeys.requests(params),
    queryFn: ({ signal }) => marketplaceApi.requests(params, signal),
    ...listQueryOptions,
  })

  const prefetchNext = () => {
    const next = { ...params, page: state.page + 1 }
    void queryClient.prefetchQuery({ queryKey: marketplaceKeys.requests(next), queryFn: ({ signal }) => marketplaceApi.requests(next, signal) })
  }

  const columns = useMemo<ColumnDef<ProviderMarketplaceRequestResponse, unknown>[]>(
    () => [
      {
        id: 'number',
        header: t('columns.number'),
        meta: { alwaysVisible: true, cardHidden: true },
        cell: ({ row: { original: r } }) => <EntityLink kind="marketplace" id={r.id} label={r.requestNumber} mono />,
      },
      {
        id: 'service',
        header: t('columns.service'),
        meta: { cardTitle: true },
        cell: ({ row: { original: r } }) => (
          <div className="flex min-w-0 max-w-[20rem] flex-col gap-0.5">
            <span className="truncate font-medium">{pick(r.serviceNameAr, r.serviceNameEn)}</span>
            <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span className="ltr-nums font-mono md:hidden">{r.requestNumber}</span>
              <span className="truncate">{pick(r.category.nameAr, r.category.nameEn)}</span>
              <StatusBadge enum="ExecutionMode" value={r.executionMode} dot={false} />
            </span>
            {r.publicDescription && <span className="line-clamp-2 text-xs text-muted-foreground">{r.publicDescription}</span>}
          </div>
        ),
      },
      {
        id: 'location',
        header: t('columns.location'),
        cell: ({ row: { original: r } }) => <span className="text-sm">{[r.city, r.district].filter(Boolean).join(' · ') || '—'}</span>,
      },
      {
        id: 'window',
        header: t('columns.window'),
        cell: ({ row: { original: r } }) =>
          r.preferredStart || r.preferredEnd ? (
            <span className="tabular whitespace-nowrap text-xs">
              {formatDateTime(r.preferredStart, lang)}
              {r.preferredEnd && ` – ${formatDateTime(r.preferredEnd, lang)}`}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      { id: 'closes', header: t('columns.closes'), cell: ({ row: { original: r } }) => <Countdown closesAt={r.closesAt} /> },
      { id: 'offers', header: t('columns.offers'), meta: { align: 'end' }, cell: ({ row: { original: r } }) => <Num value={r.offersCount} /> },
      {
        id: 'myOffer',
        header: t('columns.myOffer'),
        cell: ({ row: { original: r } }) =>
          r.myOffer ? (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <StatusBadge enum="MarketplaceOfferStatus" value={r.myOffer.status} />
              <Money value={r.myOffer.amount} className="text-xs text-muted-foreground" />
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">{t('noOffer')}</span>
          ),
      },
      {
        id: 'published',
        header: t('columns.published'),
        meta: { defaultHidden: true, cardHidden: true },
        cell: ({ row: { original: r } }) => <DateTime value={r.publishedAt} className="text-xs text-muted-foreground" />,
      },
    ],
    [t, pick, lang],
  )

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t('eligibleHint')}</p>
      <DataTable
        id="marketplace-open"
        columns={columns}
        query={query}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={(page) => set({ page })}
        onPageSizeChange={(pageSize) => set({ pageSize })}
        getRowId={(r) => r.id}
        rowHref={(r) => `/marketplace/${r.id}`}
        onRowHover={(r) => void prefetchTender(queryClient, r.id)}
        onPrefetchNext={prefetchNext}
        filtered={!!state.search}
        onClearFilters={() => reset(['tab'])}
        emptyTitle={state.search ? undefined : t('emptyOpen')}
        toolbar={<SearchInput value={state.search} onChange={(search) => set({ search })} placeholder={t('search')} className="sm:w-72" />}
      />
    </div>
  )
}
