import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Info } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from '@/components/DataTable'
import { EntityLink } from '@/components/EntityLink'
import { ExportCsvButton } from '@/components/ExportCsvButton'
import { EnumFilter, QuickTabs } from '@/components/Filters'
import { DateTime, Money, Num } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { listQueryOptions } from '@/api/queryClient'
import {
  SettlementPartyTypeValues,
  SettlementStatusValues,
  type SettlementPartyType,
  type SettlementResponse,
  type SettlementStatus,
} from '@/api/types'
import { useLang } from '@/hooks/useLang'
import { paginationDefaults, useUrlState } from '@/hooks/useUrlState'
import { formatDate } from '@/lib/format'
import './i18n'
import { prefetchSettlement, settlementKeys, settlementsApi, type SettlementListParams } from './api'
import { SummaryTiles } from './components/SummaryTiles'
import { settlementCsvColumns } from './csv'

const schema = { ...paginationDefaults, status: '', partyType: '' }

const TAB_ORDER: SettlementStatus[] = ['Pending', 'Approved', 'OnHold', 'Paid']

/** `/settlements` (§8.10, read-only): money tiles, then the organization's settlements. */
export function SettlementsPage() {
  const { t } = useTranslation('settlements')
  const { lang } = useLang()
  const queryClient = useQueryClient()
  const { state, set, reset, active } = useUrlState(schema)

  const status = (SettlementStatusValues as readonly string[]).includes(state.status) ? (state.status as SettlementStatus) : undefined
  const partyType = (SettlementPartyTypeValues as readonly string[]).includes(state.partyType) ? (state.partyType as SettlementPartyType) : undefined
  const filters: SettlementListParams = { status, partyType }
  const params: SettlementListParams = { ...filters, page: state.page, pageSize: state.pageSize }

  const query = useQuery({
    queryKey: settlementKeys.list(params),
    queryFn: ({ signal }) => settlementsApi.list(params, signal),
    ...listQueryOptions,
  })

  const prefetchNext = () => {
    const next = { ...params, page: state.page + 1 }
    void queryClient.prefetchQuery({ queryKey: settlementKeys.list(next), queryFn: ({ signal }) => settlementsApi.list(next, signal) })
  }

  const columns = useMemo<ColumnDef<SettlementResponse, unknown>[]>(
    () => [
      {
        id: 'number',
        header: t('columns.number'),
        meta: { alwaysVisible: true, cardTitle: true },
        cell: ({ row: { original: r } }) => <EntityLink kind="settlement" id={r.id} label={r.settlementNumber} copy={r.settlementNumber} mono />,
      },
      {
        id: 'party',
        header: t('columns.party'),
        cell: ({ row: { original: r } }) => (
          <span className="flex flex-col items-start gap-0.5 md:items-start">
            <StatusBadge enum="SettlementPartyType" value={r.partyType} dot={false} />
            {r.executorName && <span className="max-w-[10rem] truncate text-xs text-muted-foreground">{r.executorName}</span>}
          </span>
        ),
      },
      {
        id: 'period',
        header: t('columns.period'),
        cell: ({ row: { original: r } }) => (
          <span className="tabular whitespace-nowrap text-xs">
            {formatDate(r.periodStart, lang)} – {formatDate(r.periodEnd, lang)}
          </span>
        ),
      },
      { id: 'lines', header: t('columns.lines'), meta: { align: 'end' }, cell: ({ row: { original: r } }) => <Num value={r.linesCount} /> },
      { id: 'gross', header: t('columns.gross'), meta: { align: 'end' }, cell: ({ row: { original: r } }) => <Money value={r.grossAmount} /> },
      {
        id: 'commission',
        header: t('columns.commission'),
        meta: { align: 'end' },
        cell: ({ row: { original: r } }) => <Money value={r.commissionAmount} className="text-muted-foreground" />,
      },
      { id: 'net', header: t('columns.net'), meta: { align: 'end' }, cell: ({ row: { original: r } }) => <Money value={r.netAmount} className="font-semibold" /> },
      { id: 'status', header: t('columns.status'), cell: ({ row: { original: r } }) => <StatusBadge enum="SettlementStatus" value={r.status} /> },
      {
        id: 'paidAt',
        header: t('columns.paidAt'),
        cell: ({ row: { original: r } }) => <DateTime value={r.paidAt} mode="date" className="text-xs" />,
      },
      {
        id: 'reference',
        header: t('columns.reference'),
        meta: { defaultHidden: true },
        cell: ({ row: { original: r } }) => <span className="ltr-nums font-mono text-xs">{r.paymentReference ?? '—'}</span>,
      },
      {
        id: 'createdAt',
        header: t('columns.createdAt'),
        meta: { cardHidden: true },
        cell: ({ row: { original: r } }) => <DateTime value={r.createdAt} className="text-xs text-muted-foreground" />,
      },
    ],
    [t, lang],
  )

  const csvColumns = useMemo(() => settlementCsvColumns((k) => t(k), lang), [t, lang])

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <ExportCsvButton
            filename="settlements"
            fetchPage={(page, pageSize, signal) => settlementsApi.list({ ...filters, page, pageSize }, signal)}
            columns={csvColumns}
          />
        }
      />

      <div className="mb-4 space-y-3">
        <SummaryTiles />
        <p className="flex items-start gap-2 rounded-md border border-tone-waiting/20 bg-tone-waiting-soft px-3 py-2 text-sm text-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-tone-waiting" aria-hidden />
          {t('note')}
        </p>
      </div>

      <QuickTabs
        className="mb-3"
        value={status ?? 'all'}
        onChange={(key) => set({ status: key === 'all' ? '' : key })}
        tabs={[{ key: 'all', label: t('tabs.all') }, ...TAB_ORDER.map((s) => ({ key: s, label: t(`tabs.${s}`) }))]}
      />

      <DataTable
        id="settlements"
        columns={columns}
        query={query}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={(page) => set({ page })}
        onPageSizeChange={(pageSize) => set({ pageSize })}
        getRowId={(r) => r.id}
        rowHref={(r) => `/settlements/${r.id}`}
        onRowHover={(r) => void prefetchSettlement(queryClient, r.id)}
        onPrefetchNext={prefetchNext}
        rowClassName={(r) => (r.status === 'OnHold' ? 'bg-tone-attention-soft/30' : undefined)}
        filtered={active.length > 0}
        onClearFilters={() => reset()}
        emptyTitle={active.length > 0 ? undefined : t('empty')}
        toolbar={<EnumFilter enumName="SettlementPartyType" value={partyType ?? ''} onChange={(v) => set({ partyType: v })} label={t('filters.partyType')} />}
      />
    </>
  )
}
