import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Info } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import type { ExecutorPerformance } from '@/api/types'
import { DateRangeFilter } from '@/components/Filters'
import { Money } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, ErrorState } from '@/components/States'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tooltip } from '@/components/ui/menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { useLang } from '@/hooks/useLang'
import { useUrlState } from '@/hooks/useUrlState'
import { formatDuration, formatNumber, formatPercent, riyadhDateToIso } from '@/lib/format'
import { cn } from '@/lib/utils'
import { insightKeys, insightsApi } from './api'
import { perfFlags, PERF_PERIODS, presetRange, sortPerformance, type Flag, type PerfPeriod, type PerfSortKey } from './logic'
import './i18n'

const schema = { period: '30', from: '', to: '' }

/** `/team/performance` (PROVIDER-PLATFORM-PHASE2-PROMPT §4): who to reward and who needs training. */
export function TeamPerformancePage() {
  const { t } = useTranslation('insights')
  const { state, set } = useUrlState(schema)
  const period: PerfPeriod = (PERF_PERIODS as readonly string[]).includes(state.period) ? (state.period as PerfPeriod) : '30'
  const range = useMemo(() => (period === 'custom' ? { from: state.from, to: state.to } : presetRange(Number(period))), [period, state.from, state.to])
  const params = { from: riyadhDateToIso(range.from, 'start') ?? undefined, to: riyadhDateToIso(range.to, 'end') ?? undefined }
  const ready = period !== 'custom' || (!!range.from && !!range.to)
  const query = useQuery({ queryKey: insightKeys.performance(params), queryFn: ({ signal }) => insightsApi.teamPerformance(params, signal), enabled: ready })

  return (
    <>
      <PageHeader title={t('perf.title')} description={t('perf.subtitle')} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="tablist" className="flex flex-wrap gap-1">
          {PERF_PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={period === p}
              onClick={() => set(p === 'custom' ? { period: p, from: range.from, to: range.to } : { period: p, from: '', to: '' })}
              className={cn('rounded-full border px-3 py-1 text-xs', period === p ? 'border-primary bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')}
            >
              {t(`perf.period.${p}`)}
            </button>
          ))}
        </div>
        {period === 'custom' && <DateRangeFilter from={state.from} to={state.to} onChange={(r) => set(r)} />}
        {range.from && range.to && <span className="tabular text-xs text-muted-foreground">{t('perf.range', { from: range.from, to: range.to })}</span>}
      </div>

      {!ready ? null : query.isPending ? (
        <Skeleton className="h-72" />
      ) : query.isError ? (
        <Card>
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </Card>
      ) : !query.data.executors.length ? (
        <Card>
          <EmptyState title={t('perf.empty')} />
        </Card>
      ) : (
        <PerformanceTable rows={query.data.executors} />
      )}
    </>
  )
}

const COLUMNS: Array<{ key: PerfSortKey; label: string; hint?: string; numeric: boolean }> = [
  { key: 'fullName', label: 'perf.technician', numeric: false },
  { key: 'completed', label: 'perf.completed', numeric: true },
  { key: 'averageRating', label: 'perf.rating', numeric: true },
  { key: 'onTimeRate', label: 'perf.onTime', hint: 'perf.onTimeHint', numeric: true },
  { key: 'acceptanceRate', label: 'perf.acceptance', hint: 'perf.acceptanceHint', numeric: true },
  { key: 'averageWorkMinutes', label: 'perf.workTime', hint: 'perf.workTimeHint', numeric: true },
  { key: 'warrantyClaims', label: 'perf.warranty', numeric: true },
  { key: 'disputes', label: 'perf.disputes', numeric: true },
  { key: 'cancelledAfterAssignment', label: 'perf.cancelled', numeric: true },
  { key: 'revenue', label: 'perf.revenue', hint: 'perf.revenueHint', numeric: true },
]

const flagClass = (f: Flag) => (f === 'danger' ? 'font-semibold text-tone-danger' : f === 'attention' ? 'font-semibold text-tone-attention' : undefined)

function PerformanceTable({ rows }: { rows: ExecutorPerformance[] }) {
  const { t } = useTranslation('insights')
  const { lang } = useLang()
  const navigate = useNavigate()
  const [sort, setSort] = useState<{ key: PerfSortKey; dir: 'asc' | 'desc' }>({ key: 'completed', dir: 'desc' })
  const sorted = useMemo(() => sortPerformance(rows, sort.key, sort.dir, new Intl.Collator(lang)), [rows, sort, lang])
  const pct = (v: number | null) => (v === null ? '—' : formatPercent(v, lang, 0))

  return (
    <Card className="overflow-x-auto">
      <Table>
        <THead>
          <Tr>
            {COLUMNS.map((c) => {
              const active = sort.key === c.key
              const Arrow = sort.dir === 'asc' ? ArrowUp : ArrowDown
              return (
                <Th key={c.key} className={cn(c.numeric && 'text-end')} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <span className={cn('inline-flex items-center gap-1', c.numeric && 'flex-row-reverse')}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key && s.dir === 'desc' ? 'asc' : 'desc' }))}
                      aria-label={t('perf.sortBy', { column: t(c.label) })}
                    >
                      {t(c.label)}
                      {active && <Arrow className="size-3" />}
                    </button>
                    {c.hint && (
                      <Tooltip content={t(c.hint)}>
                        <Info className="size-3 cursor-help text-muted-foreground" aria-label={t(c.hint)} />
                      </Tooltip>
                    )}
                  </span>
                </Th>
              )
            })}
          </Tr>
        </THead>
        <TBody>
          {sorted.map((p) => {
            const f = perfFlags(p)
            return (
              <Tr key={p.executorId} className="cursor-pointer" onClick={() => navigate(`/team/${p.executorId}`)} data-executor={p.executorId}>
                <Td>
                  <span className="font-medium">{p.fullName}</span>
                  {!p.isActive && (
                    <Badge tone="muted" className="ms-2">
                      {t('perf.inactive')}
                    </Badge>
                  )}
                </Td>
                <Td className="tabular text-end">{formatNumber(p.completed, lang)}</Td>
                <Td className="text-end">
                  <span className={cn('tabular', flagClass(f.rating))}>{p.averageRating === null ? '—' : formatNumber(p.averageRating, lang, 1)}</span>
                  {p.ratingsCount > 0 && <div className="text-[0.6875rem] text-muted-foreground">{t('perf.ratings', { count: p.ratingsCount })}</div>}
                </Td>
                <Td className="text-end">
                  <span className={cn('tabular', flagClass(f.onTime))}>{pct(p.onTimeRate)}</span>
                  {p.scheduledArrivals > 0 && <div className="text-[0.6875rem] text-muted-foreground">{t('perf.arrivals', { count: p.scheduledArrivals })}</div>}
                </Td>
                <Td className="text-end">
                  <span className="tabular">{pct(p.acceptanceRate)}</span>
                  {p.assignmentsOffered > 0 && (
                    <div className="text-[0.6875rem] text-muted-foreground">{t('perf.offered', { rejected: p.assignmentsRejected, offered: p.assignmentsOffered })}</div>
                  )}
                </Td>
                <Td className="tabular text-end text-xs">{p.averageWorkMinutes === null ? '—' : formatDuration(p.averageWorkMinutes, lang)}</Td>
                <Td className={cn('tabular text-end', flagClass(f.warranty))}>{formatNumber(p.warrantyClaims, lang)}</Td>
                <Td className="tabular text-end">{formatNumber(p.disputes, lang)}</Td>
                <Td className="tabular text-end">{formatNumber(p.cancelledAfterAssignment, lang)}</Td>
                <Td className="text-end">
                  <Money value={p.revenue} />
                </Td>
              </Tr>
            )
          })}
        </TBody>
      </Table>
    </Card>
  )
}
