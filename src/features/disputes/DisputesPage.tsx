import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from '@/components/DataTable'
import { EntityLink, HumanNumber } from '@/components/EntityLink'
import { QuickTabs } from '@/components/Filters'
import { DateTime, Money } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { listQueryOptions } from '@/api/queryClient'
import { DisputeStatusValues, type DisputeResponse, type DisputeStatus } from '@/api/types'
import { useLang } from '@/hooks/useLang'
import { paginationDefaults, useUrlState } from '@/hooks/useUrlState'
import { enumLabel } from '@/i18n/enums'
import './i18n'
import { disputeKeys, disputesApi, prefetchDispute, type DisputeListParams } from './api'
import { DisputeNote } from './components/DisputeNote'

const schema = { ...paginationDefaults, status: '' }

/** Open first, closed last. */
const TAB_ORDER: DisputeStatus[] = ['Open', 'UnderReview', 'Escalated', 'Resolved', 'Rejected']

/** `/disputes` (§8.12, read-only). */
export function DisputesPage() {
  const { t } = useTranslation('disputes')
  const { lang, pick } = useLang()
  const queryClient = useQueryClient()
  const { state, set, reset, active } = useUrlState(schema)

  const status = (DisputeStatusValues as readonly string[]).includes(state.status) ? (state.status as DisputeStatus) : undefined
  const params: DisputeListParams = { status, page: state.page, pageSize: state.pageSize }
  const query = useQuery({
    queryKey: disputeKeys.list(params),
    queryFn: ({ signal }) => disputesApi.list(params, signal),
    ...listQueryOptions,
  })

  const prefetchNext = () => {
    const next = { ...params, page: state.page + 1 }
    void queryClient.prefetchQuery({ queryKey: disputeKeys.list(next), queryFn: ({ signal }) => disputesApi.list(next, signal) })
  }

  const columns = useMemo<ColumnDef<DisputeResponse, unknown>[]>(
    () => [
      {
        id: 'number',
        header: t('columns.number'),
        meta: { alwaysVisible: true, cardHidden: true },
        cell: ({ row: { original: d } }) => <EntityLink kind="dispute" id={d.id} label={d.disputeNumber} mono />,
      },
      {
        id: 'subject',
        header: t('columns.subject'),
        meta: { cardTitle: true },
        cell: ({ row: { original: d } }) => (
          <div className="flex min-w-0 max-w-[20rem] flex-col gap-0.5">
            <span dir="auto" className="truncate font-medium">
              {d.subject}
            </span>
            <span className="ltr-nums font-mono text-xs text-muted-foreground md:hidden">{d.disputeNumber}</span>
          </div>
        ),
      },
      {
        id: 'service',
        header: t('columns.service'),
        cell: ({ row: { original: d } }) => (
          <div className="flex min-w-0 max-w-[16rem] flex-col items-start gap-0.5">
            <span className="truncate text-sm">{d.serviceNameAr || d.serviceNameEn ? pick(d.serviceNameAr, d.serviceNameEn) : '—'}</span>
            {d.serviceItemId ? (
              <EntityLink kind="workItem" id={d.serviceItemId} label={d.itemNumber} mono className="text-xs" />
            ) : (
              d.orderNumber && <span className="ltr-nums font-mono text-xs text-muted-foreground">{d.orderNumber}</span>
            )}
          </div>
        ),
      },
      { id: 'status', header: t('columns.status'), cell: ({ row: { original: d } }) => <StatusBadge enum="DisputeStatus" value={d.status} /> },
      {
        id: 'resolution',
        header: t('columns.resolution'),
        cell: ({ row: { original: d } }) =>
          d.resolutionType === 'None' ? <span className="text-muted-foreground">—</span> : <StatusBadge enum="DisputeResolutionType" value={d.resolutionType} dot={false} />,
      },
      {
        id: 'refund',
        header: t('columns.refund'),
        meta: { align: 'end' },
        cell: ({ row: { original: d } }) => (d.refundAmount ? <Money value={d.refundAmount} /> : <span className="text-muted-foreground">—</span>),
      },
      {
        id: 'order',
        header: t('columns.order'),
        meta: { defaultHidden: true },
        cell: ({ row: { original: d } }) => <HumanNumber value={d.orderNumber} />,
      },
      { id: 'createdAt', header: t('columns.createdAt'), cell: ({ row: { original: d } }) => <DateTime value={d.createdAt} className="text-xs text-muted-foreground" /> },
      {
        id: 'resolvedAt',
        header: t('columns.resolvedAt'),
        meta: { defaultHidden: true },
        cell: ({ row: { original: d } }) => <DateTime value={d.resolvedAt} mode="date" className="text-xs" />,
      },
    ],
    [t, pick],
  )

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <DisputeNote className="mb-4" />

      <QuickTabs
        className="mb-3"
        value={status ?? 'all'}
        onChange={(key) => set({ status: key === 'all' ? '' : key })}
        tabs={[{ key: 'all', label: t('tabs.all') }, ...TAB_ORDER.map((s) => ({ key: s, label: enumLabel('DisputeStatus', s, lang) }))]}
      />

      <DataTable
        id="disputes"
        columns={columns}
        query={query}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={(page) => set({ page })}
        onPageSizeChange={(pageSize) => set({ pageSize })}
        getRowId={(d) => d.id}
        rowHref={(d) => `/disputes/${d.id}`}
        onRowHover={(d) => void prefetchDispute(queryClient, d.id)}
        onPrefetchNext={prefetchNext}
        filtered={active.length > 0}
        onClearFilters={() => reset()}
        emptyTitle={active.length > 0 ? undefined : t('empty')}
      />
    </>
  )
}
