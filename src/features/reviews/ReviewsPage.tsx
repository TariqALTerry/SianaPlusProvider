import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from '@/components/DataTable'
import { EntityLink } from '@/components/EntityLink'
import { DateTime } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { Stars } from '@/components/Stars'
import { Select } from '@/components/ui/input'
import { listQueryOptions } from '@/api/queryClient'
import type { ReviewResponse } from '@/api/types'
import { useLang } from '@/hooks/useLang'
import { paginationDefaults, useUrlState } from '@/hooks/useUrlState'
import './i18n'
import { reviewKeys, reviewsApi, type ReviewListParams } from './api'
import { RatingSummary } from './components/RatingSummary'

const schema = { ...paginationDefaults, executorId: '' }

/** `/reviews` (§8.11, read-only): rating summary, technician leaderboard, published reviews. */
export function ReviewsPage() {
  const { t } = useTranslation('reviews')
  const { pick } = useLang()
  const queryClient = useQueryClient()
  const { state, set, reset } = useUrlState(schema)

  const summary = useQuery({ queryKey: reviewKeys.summary(), queryFn: ({ signal }) => reviewsApi.summary(signal) })

  const params: ReviewListParams = { executorId: state.executorId || undefined, page: state.page, pageSize: state.pageSize }
  const query = useQuery({
    queryKey: reviewKeys.list(params),
    queryFn: ({ signal }) => reviewsApi.list(params, signal),
    ...listQueryOptions,
  })

  const prefetchNext = () => {
    const next = { ...params, page: state.page + 1 }
    void queryClient.prefetchQuery({ queryKey: reviewKeys.list(next), queryFn: ({ signal }) => reviewsApi.list(next, signal) })
  }

  const executors = summary.data?.executors ?? []
  // A technician picked from a link may have no published reviews (absent from the summary): keep it selectable.
  const selectedMissing = !!state.executorId && !executors.some((e) => e.executorId === state.executorId)

  const columns = useMemo<ColumnDef<ReviewResponse, unknown>[]>(
    () => [
      {
        id: 'service',
        header: t('columns.service'),
        meta: { alwaysVisible: true, cardTitle: true },
        cell: ({ row: { original: r } }) => (
          <div className="flex min-w-0 max-w-[16rem] flex-col gap-0.5">
            <span className="truncate font-medium">{pick(r.serviceNameAr, r.serviceNameEn)}</span>
            <EntityLink kind="workItem" id={r.serviceItemId} label={r.itemNumber} mono className="text-xs" />
          </div>
        ),
      },
      { id: 'serviceRating', header: t('columns.serviceRating'), cell: ({ row: { original: r } }) => <Stars value={r.serviceRating} /> },
      { id: 'executorRating', header: t('columns.executorRating'), cell: ({ row: { original: r } }) => <Stars value={r.executorRating} /> },
      {
        id: 'comment',
        header: t('columns.comment'),
        cell: ({ row: { original: r } }) =>
          r.comment ? (
            <p dir="auto" className="max-w-[24rem] whitespace-pre-line text-sm leading-relaxed md:line-clamp-3">
              {r.comment}
            </p>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      { id: 'executor', header: t('columns.executor'), cell: ({ row: { original: r } }) => <span className="text-sm">{r.executorName ?? '—'}</span> },
      { id: 'customer', header: t('columns.customer'), cell: ({ row: { original: r } }) => <span className="text-sm">{r.customerName ?? '—'}</span> },
      { id: 'date', header: t('columns.date'), cell: ({ row: { original: r } }) => <DateTime value={r.createdAt} className="text-xs text-muted-foreground" /> },
    ],
    [t, pick],
  )

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />

      <div className="mb-4">
        <RatingSummary query={summary} selectedExecutorId={state.executorId} onSelectExecutor={(executorId) => set({ executorId })} />
      </div>

      <DataTable
        id="reviews"
        columns={columns}
        query={query}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={(page) => set({ page })}
        onPageSizeChange={(pageSize) => set({ pageSize })}
        getRowId={(r) => r.id}
        onPrefetchNext={prefetchNext}
        rowClassName={(r) => (r.serviceRating <= 2 ? 'bg-tone-danger-soft/30' : undefined)}
        filtered={!!state.executorId}
        onClearFilters={() => reset()}
        emptyTitle={state.executorId ? undefined : t('empty')}
        toolbar={
          <Select
            value={state.executorId}
            onChange={(e) => set({ executorId: e.target.value })}
            className="h-8 w-auto min-w-[11rem] text-xs"
            aria-label={t('filters.executor')}
          >
            <option value="">
              {t('filters.executor')}: {t('filters.allExecutors')}
            </option>
            {selectedMissing && <option value={state.executorId}>{t('filters.executor')}: …</option>}
            {executors.map((e) => (
              <option key={e.executorId} value={e.executorId}>
                {e.fullName || '—'}
              </option>
            ))}
          </Select>
        }
      />
    </>
  )
}
