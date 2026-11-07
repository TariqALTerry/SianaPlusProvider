import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertTriangle, ClipboardPlus, ScanLine, Search } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { listQueryOptions } from '@/api/queryClient'
import type { CounterItemSummaryResponse } from '@/api/types'
import { DataTable } from '@/components/DataTable'
import { QuickTabs } from '@/components/Filters'
import { DateTime, Money } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useBranchScope } from '@/features/branches/scope'
import { usePollingInterval } from '@/hooks/usePageVisible'
import { useUrlState } from '@/hooks/useUrlState'
import { useLang } from '@/hooks/useLang'
import { enumLabel } from '@/i18n/enums'
import { formatSaudiMobile } from '@/lib/phone'
import { cn } from '@/lib/utils'
import { counterApi, counterKeys, type CounterListParams } from './api'
import { GateBanner } from './components/GateBanner'
import { ScanDialog } from './components/ScanDialog'
import { useCounterGate } from './hooks'
import { balanceState, COUNTER_TABS, parseCounterTab, tabCount, tabEnum } from './logic'
import './i18n'

const schema = { tab: 'received', search: '', page: 1, pageSize: 25 }

/**
 * `/counter` (phase 2): the counter's home. Two big actions (new intake, find / scan), the gate when new intakes are
 * closed, and the devices by tab with their counts. Scoped by the branch switcher; polled every 60 s.
 */
export function CounterPage() {
  const { t } = useTranslation('counter')
  const { lang, pick } = useLang()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { state, set } = useUrlState(schema)
  const tab = parseCounterTab(state.tab)
  const scope = useBranchScope()
  const gate = useCounterGate()
  const interval = usePollingInterval(60_000)
  const [scanOpen, setScanOpen] = useState(false)
  const [draft, setDraft] = useState(state.search)
  const branchId = scope.branchId
  const allBranches = !scope.selected

  const counts = useQuery({ queryKey: counterKeys.counts(branchId), queryFn: ({ signal }) => counterApi.counts(branchId, signal), refetchInterval: interval, enabled: scope.mode !== 'loading' })
  const params: CounterListParams = { branchId, tab, search: state.search || undefined, page: state.page, pageSize: state.pageSize }
  const list = useQuery({
    queryKey: counterKeys.list(params),
    queryFn: ({ signal }) => counterApi.list(params, signal),
    ...listQueryOptions,
    refetchInterval: interval,
    enabled: scope.mode !== 'loading',
  })

  // A scan or a search for one exact receipt opens it; several matches show the list (all tabs).
  const find = async (term: string) => {
    setScanOpen(false)
    setDraft(term)
    const probe: CounterListParams = { branchId, tab: 'all', search: term, page: 1, pageSize: 2 }
    try {
      const res = await queryClient.fetchQuery({ queryKey: counterKeys.list(probe), queryFn: ({ signal }) => counterApi.list(probe, signal) })
      if (res.items.length === 1) {
        navigate(`/counter/items/${res.items[0]!.serviceItemId}`)
        return
      }
    } catch {
      // The list below shows the error.
    }
    set({ tab: 'all', search: term })
  }

  const submitSearch = (e: FormEvent) => {
    e.preventDefault()
    const term = draft.trim()
    if (term) void find(term)
    else set({ search: '' })
  }

  const columns = useMemo<ColumnDef<CounterItemSummaryResponse, unknown>[]>(
    () => [
      {
        id: 'intake',
        header: t('col.intake'),
        meta: { alwaysVisible: true, cardTitle: true },
        cell: ({ row: { original: r } }) => (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <bdi className="ltr-nums font-mono text-sm font-semibold">{r.intakeNumber ?? r.itemNumber}</bdi>
              {!r.isComplete && <Badge tone="attention">{t('incompleteBadge')}</Badge>}
              {r.awaitingCustomer && <Badge tone="attention">{t('awaitingCall')}</Badge>}
              {r.isReady && !r.handedOverAt && <Badge tone="success">{t('ready')}</Badge>}
              {r.isLate && <Badge tone="danger">{t('late')}</Badge>}
            </div>
            <div className="truncate text-xs text-muted-foreground">{pick(r.serviceNameAr, r.serviceNameEn)}</div>
          </div>
        ),
      },
      {
        id: 'customer',
        header: t('col.customer'),
        cell: ({ row: { original: r } }) => (
          <div className="min-w-0">
            <div className="truncate text-sm">{r.customerName}</div>
            {r.customerPhone && <bdi className="ltr-nums font-latin text-xs text-muted-foreground">{formatSaudiMobile(r.customerPhone)}</bdi>}
          </div>
        ),
      },
      {
        id: 'device',
        header: t('col.device'),
        cell: ({ row: { original: r } }) => (
          <div className="min-w-0 text-sm">
            <div className="truncate">{[r.deviceName, r.brand, r.model].filter(Boolean).join(' · ') || '—'}</div>
            {r.imei && <bdi className="ltr-nums font-mono text-[0.6875rem] text-muted-foreground">{r.imei}</bdi>}
          </div>
        ),
      },
      {
        id: 'status',
        header: t('col.status'),
        cell: ({ row: { original: r } }) => (
          <div className="flex flex-col items-start gap-1">
            <StatusBadge enum="ServiceItemStatus" value={r.status} />
            {r.repairOutcome && <StatusBadge enum="RepairOutcome" value={r.repairOutcome} dot={false} />}
          </div>
        ),
      },
      {
        id: 'technician',
        header: t('col.technician'),
        meta: { cardHidden: true },
        cell: ({ row: { original: r } }) => <span className="text-sm">{r.executorName ?? <span className="text-xs text-muted-foreground">{t('item.unassigned')}</span>}</span>,
      },
      {
        id: 'promised',
        header: t('col.promised'),
        cell: ({ row: { original: r } }) => (r.promisedReadyAt ? <DateTime value={r.promisedReadyAt} mode="absolute" className={cn('text-xs', r.isLate && 'text-tone-danger')} /> : <span className="text-muted-foreground">—</span>),
      },
      {
        id: 'balance',
        header: t('col.balance'),
        meta: { align: 'end' },
        cell: ({ row: { original: r } }) => {
          const s = balanceState(r.balance)
          return <Money value={r.balance} className={cn('font-semibold', s === 'due' && 'text-tone-danger', s === 'credit' && 'text-tone-info')} />
        },
      },
      ...(allBranches
        ? [
            {
              id: 'branch',
              header: t('col.branch'),
              meta: { cardHidden: true },
              cell: ({ row: { original: r } }) => <span className="text-xs">{r.branchName ?? '—'}</span>,
            } satisfies ColumnDef<CounterItemSummaryResponse, unknown>,
          ]
        : []),
      {
        id: 'received',
        header: t('col.received'),
        meta: { cardHidden: true },
        cell: ({ row: { original: r } }) => <DateTime value={r.receivedAt} className="text-xs text-muted-foreground" />,
      },
    ],
    [t, pick, allBranches],
  )

  const incomplete = counts.data?.incomplete ?? 0
  const canIntake = gate.open && !gate.loading

  return (
    <>
      <PageHeader title={t('title')} description={scope.selected ? `${t('branch')}: ${scope.selected.name}` : t('description')} />

      {!gate.loading && !gate.open && <GateBanner reason={gate.reason} className="mb-4" />}

      <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {canIntake ? (
          <Link
            to="/counter/new"
            className="hero-gradient group relative flex min-h-[7.5rem] items-center gap-4 overflow-hidden rounded-2xl p-5 text-white shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:-translate-y-0.5"
          >
            <span className="brand-pattern absolute inset-0 opacity-80" aria-hidden />
            <span className="relative flex size-14 shrink-0 items-center justify-center rounded-xl bg-brand-yellow text-brand-deep">
              <ClipboardPlus className="size-7" aria-hidden />
            </span>
            <span className="relative">
              <span className="block text-xl font-semibold">{t('newIntake')}</span>
              <span className="block text-sm text-white/85">{t('newIntakeHint')}</span>
            </span>
          </Link>
        ) : (
          <div className="flex min-h-[7.5rem] items-center gap-4 rounded-2xl border border-dashed bg-muted/40 p-5 text-muted-foreground" aria-disabled>
            <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted">
              <ClipboardPlus className="size-7" aria-hidden />
            </span>
            <span>
              <span className="block text-xl font-semibold">{t('newIntake')}</span>
              <span className="block text-sm">{gate.loading ? t('common:common.loading') : t(`gate.${gate.open ? 'existing' : gate.reason}`)}</span>
            </span>
          </div>
        )}

        <div className="flex flex-col justify-center gap-3 rounded-2xl border bg-surface p-4 shadow-sm">
          <p className="text-sm font-semibold">
            {t('find')} <span className="font-normal text-muted-foreground">— {t('findHint')}</span>
          </p>
          <form onSubmit={submitSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('findPlaceholder')}
                aria-label={t('find')}
                className="h-12 ps-10 text-base"
                autoComplete="off"
              />
            </div>
            <Button type="submit" size="lg" className="h-12" aria-label={t('common:actions.search')}>
              <Search />
            </Button>
            <Button size="lg" variant="outline" className="h-12" onClick={() => setScanOpen(true)}>
              <ScanLine /> <span className="hidden sm:inline">{t('scan')}</span>
            </Button>
          </form>
        </div>
      </div>

      {incomplete > 0 && (
        <p className="mb-3 flex items-center gap-2 rounded-lg border border-tone-attention/30 bg-tone-attention-soft px-3 py-2 text-sm text-tone-attention" role="status">
          <AlertTriangle className="size-4 shrink-0" aria-hidden /> {t('incomplete', { count: incomplete })}
        </p>
      )}
      {allBranches && scope.mode === 'all' && <p className="mb-2 text-xs text-muted-foreground">{t('allBranchesNote')}</p>}

      <QuickTabs
        className="mb-3"
        value={tab}
        onChange={(next) => set({ tab: next })}
        tabs={COUNTER_TABS.map((key) => ({ key, label: enumLabel('CounterTab', tabEnum(key), lang), count: tabCount(key, counts.data) }))}
      />

      <DataTable
        id="counter"
        columns={columns}
        query={list}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={(page) => set({ page })}
        onPageSizeChange={(pageSize) => set({ pageSize })}
        getRowId={(r) => r.serviceItemId}
        rowHref={(r) => `/counter/items/${r.serviceItemId}`}
        rowClassName={(r) => (r.isLate ? 'bg-tone-danger-soft/30' : !r.isComplete ? 'bg-tone-attention-soft/30' : undefined)}
        filtered={!!state.search}
        onClearFilters={() => {
          setDraft('')
          set({ search: '' })
        }}
        emptyTitle={state.search ? t('emptySearch', { q: state.search }) : t('empty')}
      />

      <ScanDialog open={scanOpen} onOpenChange={setScanOpen} onResult={(term) => void find(term)} />
    </>
  )
}
