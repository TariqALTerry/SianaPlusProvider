import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Gavel, ShieldAlert, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from '@/components/DataTable'
import { DateRangeFilter, FilterChips, QuickTabs, SearchInput, type FilterChip } from '@/components/Filters'
import { DateTime } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Select } from '@/components/ui/input'
import { Tooltip } from '@/components/ui/menu'
import { LOOKUP_STALE_TIME, listQueryOptions } from '@/api/queryClient'
import type { ServiceItemProviderView } from '@/api/types'
import { useLang } from '@/hooks/useLang'
import { paginationDefaults, useUrlState } from '@/hooks/useUrlState'
import { enumLabel } from '@/i18n/enums'
import { formatDateTime, formatTime, riyadhDateToIso } from '@/lib/format'
import './i18n'
import { boardQueryOptions, prefetchWorkItem, workApi, workKeys, type WorkListParams } from './api'
import { statusesFor, WORK_TABS } from './logic'
import { CoverageBadge, NetInline } from './components/widgets'

/**
 * URL schema of the work list. Other pages link into it:
 * `/work?status=Scheduled` (home distribution bar), `/work?executorId=…` (board), `/work?tab=…`.
 */
const schema = {
  ...paginationDefaults,
  tab: 'all',
  status: [] as string[],
  executorId: '',
  from: '',
  to: '',
  search: '',
}

const SEARCH_MAX = 200

/** `/work` (§8.4): the organization's items, server-paged, filtered in the URL. */
export function WorkPage() {
  const { t } = useTranslation('work')
  const { lang, pick } = useLang()
  const queryClient = useQueryClient()
  const { state, set, reset, active } = useUrlState(schema)

  const filters: WorkListParams = {
    status: statusesFor(state.tab, state.status),
    executorId: state.executorId || undefined,
    scheduledFrom: riyadhDateToIso(state.from, 'start'),
    scheduledTo: riyadhDateToIso(state.to, 'end'),
    search: state.search.slice(0, SEARCH_MAX),
  }
  const params: WorkListParams = { ...filters, page: state.page, pageSize: state.pageSize }

  const query = useQuery({
    queryKey: workKeys.list(params),
    queryFn: ({ signal }) => workApi.list(params, signal),
    ...listQueryOptions,
  })

  // The technician filter reads the board's executor list (every executor of the organization).
  const board = useQuery({ ...boardQueryOptions, staleTime: LOOKUP_STALE_TIME })
  const executors = useMemo(() => [...(board.data?.executors ?? [])].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.fullName.localeCompare(b.fullName)), [board.data])
  const executorName = executors.find((e) => e.executorId === state.executorId)?.fullName

  const prefetchNext = () => {
    const next = { ...params, page: state.page + 1 }
    void queryClient.prefetchQuery({ queryKey: workKeys.list(next), queryFn: ({ signal }) => workApi.list(next, signal) })
  }

  const columns = useMemo<ColumnDef<ServiceItemProviderView, unknown>[]>(
    () => [
      {
        id: 'item',
        header: t('columns.item'),
        meta: { alwaysVisible: true, cardTitle: true },
        cell: ({ row: { original: r } }) => (
          <div className="min-w-0 max-w-[18rem]">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-medium">{pick(r.serviceNameAr, r.serviceNameEn)}</span>
              {r.hasDispute && (
                <Tooltip content={t('icons.dispute')}>
                  <ShieldAlert className="size-3.5 shrink-0 text-tone-danger" aria-label={t('icons.dispute')} />
                </Tooltip>
              )}
              {r.isMarketplace && (
                <Tooltip content={t('icons.marketplace')}>
                  <Gavel className="size-3.5 shrink-0 text-tone-info" aria-label={t('icons.marketplace')} />
                </Tooltip>
              )}
              {r.executorAssignmentDelegated && (
                <Tooltip content={t('icons.delegated')}>
                  <Sparkles className="size-3.5 shrink-0 text-tone-active" aria-label={t('icons.delegated')} />
                </Tooltip>
              )}
              {r.isSubscriptionCovered && <CoverageBadge />}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 text-xs font-normal text-muted-foreground">
              {r.itemNumber && <span className="ltr-nums font-mono">{r.itemNumber}</span>}
              {(r.issueNameAr || r.issueNameEn) && <span className="truncate">{pick(r.issueNameAr, r.issueNameEn)}</span>}
            </div>
          </div>
        ),
      },
      { id: 'status', header: t('columns.status'), cell: ({ row: { original: r } }) => <StatusBadge enum="ServiceItemStatus" value={r.status} /> },
      {
        id: 'technician',
        header: t('columns.technician'),
        cell: ({ row: { original: r } }) => (r.executor ? <span className="text-sm">{r.executor.fullName}</span> : <span className="text-xs text-muted-foreground">{t('noTechnician')}</span>),
      },
      {
        id: 'area',
        header: t('columns.area'),
        cell: ({ row: { original: r } }) => <span className="text-xs">{[r.address.district, r.address.city].filter(Boolean).join('، ') || '—'}</span>,
      },
      {
        id: 'scheduled',
        header: t('columns.scheduled'),
        cell: ({ row: { original: r } }) =>
          r.scheduledStart ? (
            <span className="tabular ltr-nums whitespace-nowrap text-xs">
              {formatDateTime(r.scheduledStart, lang)}
              {r.scheduledEnd && <span className="text-muted-foreground"> – {formatTime(r.scheduledEnd)}</span>}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'net',
        header: t('columns.net'),
        meta: { align: 'end' },
        cell: ({ row: { original: r } }) => (
          <NetInline netAmount={r.netAmount} finalAmount={r.finalAmount} commissionRate={r.commissionRate} coverage={r.isSubscriptionCovered ? r : null} hideLabel />
        ),
      },
      {
        id: 'updated',
        header: t('columns.updated'),
        meta: { cardHidden: true },
        cell: ({ row: { original: r } }) => <DateTime value={r.updatedAt ?? r.createdAt} className="text-xs text-muted-foreground" />,
      },
    ],
    [t, pick, lang],
  )

  const chips: FilterChip[] = [
    ...(state.status.length
      ? [{ key: 'status', label: `${t('filters.status')}: ${state.status.map((s) => enumLabel('ServiceItemStatus', s, lang)).join('، ')}`, onRemove: () => set({ status: [] }) }]
      : []),
    ...(state.executorId ? [{ key: 'executor', label: `${t('filters.technician')}: ${executorName ?? '…'}`, onRemove: () => set({ executorId: '' }) }] : []),
    ...(state.from || state.to ? [{ key: 'scheduled', label: `${t('filters.scheduled')}: ${state.from || '…'} – ${state.to || '…'}`, onRemove: () => set({ from: '', to: '' }) }] : []),
    ...(state.search ? [{ key: 'search', label: `“${state.search}”`, onRemove: () => set({ search: '' }) }] : []),
  ]

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />

      <QuickTabs
        className="mb-3"
        value={state.status.length ? '' : state.tab}
        onChange={(tab) => set({ tab, status: [] })}
        tabs={WORK_TABS.map((key) => ({ key, label: t(`tabs.${key}`) }))}
      />

      <div className="mb-3">
        <FilterChips chips={chips} onClear={() => reset(['tab'])} />
      </div>

      <DataTable
        id="work"
        columns={columns}
        query={query}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={(page) => set({ page })}
        onPageSizeChange={(pageSize) => set({ pageSize })}
        getRowId={(r) => r.id}
        rowHref={(r) => `/work/${r.id}`}
        onRowHover={(r) => void prefetchWorkItem(queryClient, r.id)}
        onPrefetchNext={prefetchNext}
        rowClassName={(r) => (r.status === 'Rejected' || r.hasDispute ? 'bg-tone-danger-soft/40' : undefined)}
        filtered={active.some((k) => k !== 'tab')}
        onClearFilters={() => reset(['tab'])}
        toolbar={
          <>
            <SearchInput value={state.search} onChange={(search) => set({ search: search.slice(0, SEARCH_MAX) })} placeholder={t('filters.search')} className="sm:w-72" />
            <Select
              value={state.executorId}
              onChange={(e) => set({ executorId: e.target.value })}
              className="h-8 w-auto min-w-[10rem] text-xs"
              aria-label={t('filters.technician')}
            >
              <option value="">{t('filters.allTechnicians')}</option>
              {executors.map((e) => (
                <option key={e.executorId} value={e.executorId}>
                  {e.fullName}
                  {e.isActive ? '' : ` ${t('filters.inactive')}`}
                </option>
              ))}
              {state.executorId && !executorName && <option value={state.executorId}>…</option>}
            </Select>
            <DateRangeFilter from={state.from} to={state.to} onChange={(r) => set(r)} label={t('filters.scheduled')} />
          </>
        }
      />
    </>
  )
}
