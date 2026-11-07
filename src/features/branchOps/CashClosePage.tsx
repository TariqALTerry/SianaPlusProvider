import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertTriangle, Lock, LockOpen, Vault } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { detailQueryOptions, listQueryOptions } from '@/api/queryClient'
import type { CashClosePreviewResponse, CashCloseResponse } from '@/api/types'
import { DataTable } from '@/components/DataTable'
import { DateRangeFilter, QuickTabs } from '@/components/Filters'
import { DateTime, Money } from '@/components/Format'
import { KeyValue } from '@/components/KeyValue'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/States'
import { EnumText, StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { useRoleKind } from '@/features/auth/authStore'
import { BranchSelect } from '@/features/branches/BranchSelect'
import { useBranchScope } from '@/features/branches/scope'
import { useUrlState } from '@/hooks/useUrlState'
import { useLang } from '@/hooks/useLang'
import { formatDate, nowRiyadh } from '@/lib/format'
import { branchOpsApi, branchOpsKeys, type CashHistoryParams } from './api'
import { CloseCashDialog, DifferenceText, ReopenCashDialog } from './components/CashDialogs'
import { isFutureDate } from './logic'
import './i18n'

const schema = { tab: 'day', branch: '', date: '', from: '', to: '', page: 1, pageSize: 25 }

/**
 * `/counter/cash-close` (phase 5 §7): one branch's day. The expected cash, card and transfer come from the counter
 * payments recorded at the branch that day (Riyadh); the staff count the drawer and close; the owner may reopen.
 */
export function CashClosePage() {
  const { t } = useTranslation('branchOps')
  const { state, set } = useUrlState(schema)
  const scope = useBranchScope()
  const today = nowRiyadh().format('YYYY-MM-DD')
  const branchId = scope.selected?.id ?? (state.branch || null)
  const branchName = scope.selected?.name ?? scope.branches.find((b) => b.id === branchId)?.name

  return (
    <>
      <PageHeader title={t('cash.title')} description={branchName ? `${branchName} · ${t('cash.description')}` : t('cash.description')} />

      {scope.mode === 'none' ? (
        <EmptyState icon={<Vault className="size-5" />} title={t('cash.noBranch')} />
      ) : (
        <>
          {!scope.selected && (
            <Card className="mb-4">
              <CardBody>
                <Field label={t('cash.pickBranch')} htmlFor="cash-branch" hint={t('cash.pickBranchHint')}>
                  <BranchSelect id="cash-branch" value={branchId} onChange={(b) => set({ branch: b ?? '' })} emptyLabel={t('cash.pickBranch')} className="h-11 max-w-sm" />
                </Field>
              </CardBody>
            </Card>
          )}
          {branchId && (
            <>
              <QuickTabs
                className="mb-4"
                value={state.tab === 'history' ? 'history' : 'day'}
                onChange={(tab) => set({ tab })}
                tabs={[
                  { key: 'day', label: t('cash.tabDay') },
                  { key: 'history', label: t('cash.tabHistory') },
                ]}
              />
              {state.tab === 'history' ? (
                <History branchId={branchId} from={state.from} to={state.to} page={state.page} pageSize={state.pageSize} set={set} />
              ) : (
                <Day branchId={branchId} date={state.date && !isFutureDate(state.date, today) ? state.date : ''} today={today} onDate={(date) => set({ date: date === today ? '' : date })} />
              )}
            </>
          )}
        </>
      )}
    </>
  )
}

function Day({ branchId, date, today, onDate }: { branchId: string; date: string; today: string; onDate: (date: string) => void }) {
  const { t } = useTranslation('branchOps')
  const query = useQuery({
    queryKey: branchOpsKeys.cashPreview(branchId, date || null),
    queryFn: ({ signal }) => branchOpsApi.cashPreview(branchId, date || null, signal),
    ...detailQueryOptions,
  })
  return (
    <div className="space-y-4">
      <Field label={t('cash.date')} htmlFor="cash-date" className="max-w-xs">
        <Input id="cash-date" type="date" dir="ltr" className="h-11" max={today} value={date || today} onChange={(e) => e.target.value && onDate(e.target.value)} />
      </Field>
      {query.isPending ? <PageSkeleton /> : query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <Preview preview={query.data} />}
    </div>
  )
}

function Preview({ preview: p }: { preview: CashClosePreviewResponse }) {
  const { t } = useTranslation('branchOps')
  const role = useRoleKind()
  const [dialog, setDialog] = useState<'close' | 'reopen' | null>(null)
  const close = p.close
  const isClosed = close?.status === 'Closed'
  const tiles = [
    { label: t('cash.cash'), value: p.expected.cash, strong: true },
    { label: t('cash.card'), value: p.expected.card },
    { label: t('cash.bankTransfer'), value: p.expected.bankTransfer },
    { label: t('cash.total'), value: p.expected.total },
  ]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={t('cash.expected')}
          description={t('cash.paymentsCount', { count: p.expected.paymentsCount })}
          actions={close ? <StatusBadge enum="CashCloseStatus" value={close.status} /> : <Badge tone="waiting">{t('cash.open')}</Badge>}
        />
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {tiles.map((tile) => (
              <div key={tile.label} className={tile.strong ? 'rounded-xl border border-primary/30 bg-primary-soft p-3' : 'rounded-xl border bg-muted/30 p-3'}>
                <p className="text-xs text-muted-foreground">{tile.label}</p>
                <Money value={tile.value} className="text-xl font-bold" />
              </div>
            ))}
          </div>

          {p.changedSinceClose && (
            <p className="flex items-center gap-2 rounded-lg border border-tone-attention/30 bg-tone-attention-soft px-3 py-2 text-sm text-tone-attention" role="status">
              <AlertTriangle className="size-4 shrink-0" aria-hidden /> {t('cash.changedSinceClose')}
            </p>
          )}

          {close && (
            <KeyValue
              columns={3}
              items={[
                { label: t('cash.counted'), value: <Money value={close.countedCash} className="font-semibold" /> },
                { label: t('cash.difference'), value: <DifferenceText value={close.difference} /> },
                { label: t('cash.expectedCash'), value: <Money value={close.expected.cash} /> },
                { label: t('cash.closedBy'), value: close.closedByName },
                { label: t('cash.closedAt'), value: <DateTime value={close.closedAt} mode="absolute" /> },
                { label: t('cash.note'), value: close.note, hidden: !close.note },
                { label: t('cash.reopenedBy'), value: close.reopenedByName, hidden: !close.reopenedAt },
                { label: t('cash.reopenReason'), value: close.reopenReason, wide: true, hidden: !close.reopenReason },
                { label: t('cash.reopened'), value: t('cash.reopenInfo', { count: close.reopenCount }), hidden: close.reopenCount === 0 },
              ]}
            />
          )}

          <div className="flex flex-wrap gap-2">
            {p.canClose && (
              <Button size="lg" className="h-14 text-base" onClick={() => setDialog('close')}>
                <Lock /> {t('cash.close')}
              </Button>
            )}
            {isClosed && p.canReopen && role === 'owner' && (
              <Button size="lg" variant="outline" className="h-14 text-base" onClick={() => setDialog('reopen')}>
                <LockOpen /> {t('cash.reopen')}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      <Payments preview={p} />

      <CloseCashDialog preview={p} open={dialog === 'close'} onOpenChange={(o) => !o && setDialog(null)} />
      {close && <ReopenCashDialog close={close} open={dialog === 'reopen'} onOpenChange={(o) => !o && setDialog(null)} />}
    </div>
  )
}

function Payments({ preview: p }: { preview: CashClosePreviewResponse }) {
  const { t } = useTranslation('branchOps')
  return (
    <Card>
      <CardHeader title={t('cash.payments')} />
      <CardBody className="p-0">
        {p.payments.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{t('cash.noPayments')}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <Tr>
                  <Th>{t('cash.payment.item')}</Th>
                  <Th>{t('cash.payment.method')}</Th>
                  <Th className="hidden sm:table-cell">{t('cash.payment.kind')}</Th>
                  <Th className="hidden md:table-cell">{t('cash.payment.by')}</Th>
                  <Th className="hidden sm:table-cell">{t('cash.payment.at')}</Th>
                  <Th className="text-end">{t('cash.payment.amount')}</Th>
                </Tr>
              </THead>
              <TBody>
                {p.payments.map((row) => (
                  <Tr key={row.paymentId}>
                    <Td>
                      {row.serviceItemId ? (
                        <Link to={`/counter/items/${row.serviceItemId}`} className="font-mono text-sm text-primary hover:underline">
                          <bdi className="ltr-nums">{row.intakeNumber ?? row.itemNumber}</bdi>
                        </Link>
                      ) : (
                        <bdi className="ltr-nums font-mono text-sm">{row.paymentNumber}</bdi>
                      )}
                      {row.reference && <span className="block text-xs text-muted-foreground">{row.reference}</span>}
                    </Td>
                    <Td className="text-sm">
                      <EnumText enum="PaymentMethod" value={row.method} />
                    </Td>
                    <Td className="hidden text-sm sm:table-cell">{row.kind ? <EnumText enum="CounterPaymentKind" value={row.kind} /> : '—'}</Td>
                    <Td className="hidden text-sm md:table-cell">{row.collectedByName ?? '—'}</Td>
                    <Td className="hidden sm:table-cell">
                      <DateTime value={row.paidAt} mode="absolute" className="text-xs" />
                    </Td>
                    <Td className="text-end">
                      <Money value={row.amount} className="font-semibold" />
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function History({
  branchId,
  from,
  to,
  page,
  pageSize,
  set,
}: {
  branchId: string
  from: string
  to: string
  page: number
  pageSize: number
  set: (patch: { from?: string; to?: string; page?: number; pageSize?: number }) => void
}) {
  const { t } = useTranslation('branchOps')
  const { lang } = useLang()
  const params: CashHistoryParams = { branchId, from: from || undefined, to: to || undefined, page, pageSize }
  const list = useQuery({ queryKey: branchOpsKeys.cashHistory(params), queryFn: ({ signal }) => branchOpsApi.cashHistory(params, signal), ...listQueryOptions })

  const columns = useMemo<ColumnDef<CashCloseResponse, unknown>[]>(
    () => [
      {
        id: 'date',
        header: t('cash.col.date'),
        meta: { alwaysVisible: true, cardTitle: true },
        cell: ({ row: { original: r } }) => <span className="tabular font-medium">{formatDate(r.businessDate, lang)}</span>,
      },
      {
        id: 'expected',
        header: t('cash.col.expected'),
        meta: { align: 'end' },
        cell: ({ row: { original: r } }) => <Money value={r.expected.cash} />,
      },
      {
        id: 'counted',
        header: t('cash.col.counted'),
        meta: { align: 'end' },
        cell: ({ row: { original: r } }) => <Money value={r.countedCash} />,
      },
      {
        id: 'difference',
        header: t('cash.col.difference'),
        meta: { align: 'end' },
        cell: ({ row: { original: r } }) => <DifferenceText value={r.difference} />,
      },
      {
        id: 'status',
        header: t('cash.col.status'),
        cell: ({ row: { original: r } }) => (
          <span className="flex flex-wrap items-center gap-1">
            <StatusBadge enum="CashCloseStatus" value={r.status} />
            {r.reopenCount > 0 && <span className="text-xs text-muted-foreground">{t('cash.reopenInfo', { count: r.reopenCount })}</span>}
          </span>
        ),
      },
      {
        id: 'closedBy',
        header: t('cash.col.closedBy'),
        meta: { cardHidden: true },
        cell: ({ row: { original: r } }) => (
          <span className="text-sm">
            {r.closedByName ?? '—'} · <DateTime value={r.closedAt} className="text-xs text-muted-foreground" />
          </span>
        ),
      },
    ],
    [t, lang],
  )

  return (
    <DataTable
      id="cash-close-history"
      columns={columns}
      query={list}
      page={page}
      pageSize={pageSize}
      onPageChange={(p) => set({ page: p })}
      onPageSizeChange={(s) => set({ pageSize: s })}
      getRowId={(r) => r.id}
      filtered={!!from || !!to}
      onClearFilters={() => set({ from: '', to: '' })}
      emptyTitle={t('cash.historyEmpty')}
      toolbar={<DateRangeFilter from={from} to={to} onChange={(range) => set(range)} />}
    />
  )
}
