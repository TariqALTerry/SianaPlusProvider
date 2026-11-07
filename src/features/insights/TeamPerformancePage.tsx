import { useBranchParam } from '@/features/branches/scope'
import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, FileText, Info } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import type { ExecutorPerformance } from '@/api/types'
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
import { perfFlags, reportHref, resolvePeriod, sortPerformance, type Flag, type PerfPeriod, type PerfSortKey } from './logic'
import { PeriodFilter } from './PeriodFilter'
import { TechnicianFilter } from './TechnicianFilter'
import './i18n'

const schema = { period: '30', from: '', to: '', executorId: '' }

/** `/team/performance` (PROVIDER-PLATFORM-PHASE2-PROMPT §4): who to reward and who needs training. */
export function TeamPerformancePage() {
  const { t } = useTranslation('insights')
  const { state, set } = useUrlState(schema)
  const { period, range, ready } = resolvePeriod(state)
  const branchId = useBranchParam()
  const params = { from: riyadhDateToIso(range.from, 'start') ?? undefined, to: riyadhDateToIso(range.to, 'end') ?? undefined, executorId: state.executorId || undefined, branchId }
  const query = useQuery({ queryKey: insightKeys.performance(params), queryFn: ({ signal }) => insightsApi.teamPerformance(params, signal), enabled: ready })

  return (
    <>
      <PageHeader title={t('perf.title')} description={t('perf.subtitle')} />
      <PeriodFilter period={period} range={range} custom={{ from: state.from, to: state.to }} onChange={set}>
        <TechnicianFilter value={state.executorId} onChange={(executorId) => set({ executorId })} />
      </PeriodFilter>

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
        <PerformanceTable rows={query.data.executors} period={period} range={range} />
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
  { key: 'assignmentsTimedOut', label: 'perf.timedOut', hint: 'perf.timedOutHint', numeric: true },
  { key: 'quotationRejectionRate', label: 'perf.quotesRejected', hint: 'perf.quotesRejectedHint', numeric: true },
  { key: 'averageWorkMinutes', label: 'perf.workTime', hint: 'perf.workTimeHint', numeric: true },
  { key: 'warrantyClaims', label: 'perf.warranty', numeric: true },
  { key: 'disputes', label: 'perf.disputes', numeric: true },
  { key: 'cancelledAfterAssignment', label: 'perf.cancelled', numeric: true },
  { key: 'revenue', label: 'perf.revenue', hint: 'perf.revenueHint', numeric: true },
]

const flagClass = (f: Flag) => (f === 'danger' ? 'font-semibold text-tone-danger' : f === 'attention' ? 'font-semibold text-tone-attention' : undefined)

function PerformanceTable({ rows, period, range }: { rows: ExecutorPerformance[]; period: PerfPeriod; range: { from: string; to: string } }) {
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
                  {/* Here, not in a last column: the wide table scrolls that one out of view. */}
                  <div>
                    <Link
                      to={reportHref(p.executorId, period, range)}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-primary hover:underline"
                    >
                      <FileText className="size-3" aria-hidden /> {t('perf.report')}
                    </Link>
                  </div>
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
                    <div className="text-[0.6875rem] text-muted-foreground">
                      {t('perf.offered', { rejected: p.assignmentsRejected, timedOut: p.assignmentsTimedOut, offered: p.assignmentsOffered })}
                    </div>
                  )}
                </Td>
                <Td className={cn('tabular text-end', flagClass(f.timedOut))}>{formatNumber(p.assignmentsTimedOut, lang)}</Td>
                <Td className="text-end">
                  {p.quotationsSent === 0 ? (
                    <span className="tabular text-muted-foreground">—</span>
                  ) : (
                    <>
                      <span className={cn('tabular', flagClass(f.quotations))}>
                        {t('perf.quotesRejectedOf', { rejected: formatNumber(p.quotationsRejected, lang), sent: formatNumber(p.quotationsSent, lang) })}
                      </span>
                      <div className={cn('text-[0.6875rem]', f.quotations ? flagClass(f.quotations) : 'text-muted-foreground')}>{pct(p.quotationRejectionRate)}</div>
                    </>
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
