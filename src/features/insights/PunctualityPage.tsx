import { useBranchParam } from '@/features/branches/scope'
import { useQuery } from '@tanstack/react-query'
import { AlarmClock, CalendarCheck2, Clock, Gauge, Hourglass, Timer, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { LateVisit, PunctualityReportResponse, PunctualityStats, PunctualityTechnicianRow } from '@/api/types'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, ErrorState } from '@/components/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { useLang } from '@/hooks/useLang'
import { useUrlState } from '@/hooks/useUrlState'
import { formatDuration, formatNumber, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { insightKeys, insightsApi, type TrackingParams } from './api'
import { reportHref, resolvePeriod } from './logic'
import { OnTimeTrend } from './OnTimeTrend'
import { PeriodFilter } from './PeriodFilter'
import { TechnicianFilter } from './TechnicianFilter'
import { arrivalText, compareMetric, percentagePoints, previousRange, sortRows, visitWindow, type Better, type Delta } from './trackingLogic'
import { DeltaChip, HelpPopover, KpiTile, ServiceLink, SortTh } from './TrackingParts'
import './trackingI18n'

const schema = { period: '30', from: '', to: '', executorId: '' }

/**
 * `/team/punctuality`: do technicians arrive inside the visit window? On time = the first arrival no later than
 * the window's end, over every arrival in the period (team performance counts completed services only).
 * The previous period of equal length is a second call of the same endpoint, for the change on each tile.
 */
export function PunctualityPage() {
  const { t } = useTranslation('tracking')
  const { state, set } = useUrlState(schema)
  const { period, range, ready } = resolvePeriod(state)
  const executorId = state.executorId || undefined
  const branchId = useBranchParam()
  const params: TrackingParams = { from: range.from, to: range.to, executorId, branchId }
  const prevRange = previousRange(range)
  const prevParams: TrackingParams = { ...prevRange, executorId, branchId }

  const query = useQuery({ queryKey: insightKeys.punctuality(params), queryFn: ({ signal }) => insightsApi.punctuality(params, signal), enabled: ready })
  // The comparison runs alongside; its failure only hides the change chips.
  const previous = useQuery({ queryKey: insightKeys.punctuality(prevParams), queryFn: ({ signal }) => insightsApi.punctuality(prevParams, signal), enabled: ready })

  return (
    <>
      <PageHeader
        title={t('punct.title')}
        description={t('punct.subtitle')}
        meta={
          <HelpPopover label={t('punct.howCounted')}>
            <p className="font-medium">{t('punct.howCounted')}</p>
            <p>{t('punct.definition')}</p>
            <p className="text-muted-foreground">{t('punct.vsPerformance')}</p>
          </HelpPopover>
        }
      />
      <PeriodFilter period={period} range={range} custom={{ from: state.from, to: state.to }} onChange={set}>
        <TechnicianFilter value={state.executorId} onChange={(id) => set({ executorId: id })} />
        {state.executorId && (
          <Button size="xs" variant="ghost" onClick={() => set({ executorId: '' })}>
            <X /> {t('clearTechnician')}
          </Button>
        )}
      </PeriodFilter>

      {!ready ? null : query.isPending ? (
        <PunctualitySkeleton />
      ) : query.isError ? (
        <Card>
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </Card>
      ) : query.data.totals.visits === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarCheck2 className="size-5" />}
            title={state.executorId ? t('punct.emptyTechnician') : t('punct.empty')}
            description={t('punct.emptyHint')}
          />
        </Card>
      ) : (
        <div className={cn('space-y-4 transition-opacity', query.isFetching && !query.isPending && 'opacity-70')}>
          <Tiles current={query.data.totals} previous={previous.data?.totals ?? null} prevRange={prevRange} />
          <div className="grid gap-4 xl:grid-cols-5">
            <Card className="xl:col-span-3">
              <CardHeader title={t('punct.trendTitle')} description={t('punct.trendHint')} />
              <CardBody>
                <OnTimeTrend weeks={query.data.weeks} />
              </CardBody>
            </Card>
            <WorstLate report={query.data} className="xl:col-span-2" />
          </div>
          <Technicians
            rows={query.data.technicians}
            selected={state.executorId}
            onSelect={(id) => set({ executorId: id === state.executorId ? '' : id })}
            reportLink={(id) => reportHref(id, period, range)}
          />
          <LateVisits visits={query.data.lateVisits} totalLate={query.data.totals.late} />
        </div>
      )}
    </>
  )
}

function PunctualitySkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[6.5rem]" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        <Skeleton className="h-64 xl:col-span-3" />
        <Skeleton className="h-64 xl:col-span-2" />
      </div>
      <Skeleton className="h-56" />
    </div>
  )
}

// ── Tiles ────────────────────────────────────────────────────────────────────

function Tiles({ current: c, previous: p, prevRange }: { current: PunctualityStats; previous: PunctualityStats | null; prevRange: { from: string; to: string } }) {
  const { t } = useTranslation('tracking')
  const { lang } = useLang()
  const num = (v: number) => formatNumber(v, lang)
  const dur = (v: number | null) => formatDuration(v, lang)

  /** The chip: the change in the metric's unit, and a sentence naming the previous value. */
  const chip = (cur: number | null, prev: number | null | undefined, better: Better, show: (d: Delta) => string, prevText: string) => {
    // Nothing to compare with when the previous period had no visits: its zeros are not a baseline.
    const d = p && p.visits > 0 ? compareMetric(cur, prev, better) : null
    if (!d) return null
    const sign = d.direction === 'up' ? '+' : d.direction === 'down' ? '−' : ''
    return <DeltaChip delta={d} text={d.direction === 'same' ? t('delta.same') : `${sign}${show(d)}`} label={t('delta.previous', { value: prevText })} />
  }
  const lateShare = c.visits ? c.late / c.visits : null

  return (
    <section aria-label={t('punct.summary')} className="space-y-1.5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiTile
          className="col-span-2 md:col-span-1"
          icon={<Gauge />}
          label={t('punct.onTimeRate')}
          value={formatPercent(c.onTimeRate, lang, 0)}
          sub={t('punct.ofVisits', { onTime: num(c.onTime), visits: num(c.visits) })}
          delta={chip(c.onTimeRate, p?.onTimeRate, 'higher', (d) => t('delta.points', { value: percentagePoints(d.diff) }), formatPercent(p?.onTimeRate, lang, 0))}
        />
        <KpiTile
          icon={<AlarmClock />}
          label={t('punct.late')}
          value={num(c.late)}
          sub={lateShare === null ? undefined : t('punct.share', { value: formatPercent(lateShare, lang, 0) })}
          delta={chip(c.late, p?.late, 'lower', (d) => num(Math.abs(d.diff)), num(p?.late ?? 0))}
        />
        <KpiTile
          icon={<Clock />}
          label={t('punct.early')}
          value={num(c.early)}
          sub={t('punct.earlyHint')}
          delta={chip(c.early, p?.early, 'neutral', (d) => num(Math.abs(d.diff)), num(p?.early ?? 0))}
        />
        <KpiTile
          icon={<Hourglass />}
          label={t('punct.avgLate')}
          value={dur(c.averageLateMinutes)}
          sub={t('punct.avgLateHint')}
          delta={chip(c.averageLateMinutes, p?.averageLateMinutes, 'lower', (d) => dur(Math.abs(d.diff)), dur(p?.averageLateMinutes ?? null))}
        />
        <KpiTile
          icon={<Timer />}
          label={t('punct.p90Late')}
          value={dur(c.p90LateMinutes)}
          sub={t('punct.p90Hint')}
          delta={chip(c.p90LateMinutes, p?.p90LateMinutes, 'lower', (d) => dur(Math.abs(d.diff)), dur(p?.p90LateMinutes ?? null))}
        />
      </div>
      <p className="tabular text-xs text-muted-foreground">
        {p
          ? p.visits
            ? t('delta.vs', { from: prevRange.from, to: prevRange.to })
            : t('delta.noPrevious', { from: prevRange.from, to: prevRange.to })
          : null}
      </p>
    </section>
  )
}

// ── Who is late the most ─────────────────────────────────────────────────────

/** The technicians with the most late arrivals: who to talk to first. */
function WorstLate({ report, className }: { report: PunctualityReportResponse; className?: string }) {
  const { t } = useTranslation('tracking')
  const { lang } = useLang()
  const top = sortRows(
    report.technicians.filter((r) => r.late > 0),
    'late',
    'desc',
  ).slice(0, 5)
  const max = top[0]?.late ?? 0
  return (
    <Card className={className}>
      <CardHeader title={t('punct.mostLate')} description={t('punct.mostLateHint')} />
      <CardBody>
        {top.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('punct.noLate')}</p>
        ) : (
          <ul className="space-y-3">
            {top.map((r) => (
              <li key={r.executorId}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium">{r.fullName}</span>
                  <span className="tabular shrink-0 text-xs text-muted-foreground">
                    {t('punct.lateOf', { late: formatNumber(r.late, lang), visits: formatNumber(r.visits, lang) })}
                  </span>
                </div>
                {/* A bar per technician (one series, one colour), anchored at the start, 4 px rounded at the end. */}
                <div className="mt-1 h-2 rounded-e bg-muted/60" aria-hidden>
                  <div className="h-2 rounded-e bg-tone-danger/80" style={{ width: `${Math.max(4, (r.late / max) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}

// ── Technicians ──────────────────────────────────────────────────────────────

type TechSortKey = 'fullName' | 'visits' | 'onTimeRate' | 'late' | 'early' | 'averageLateMinutes' | 'p90LateMinutes' | 'worstLateMinutes'

const TECH_COLUMNS: Array<{ key: TechSortKey; label: string; numeric?: boolean }> = [
  { key: 'fullName', label: 'punct.technician' },
  { key: 'visits', label: 'punct.visits', numeric: true },
  { key: 'onTimeRate', label: 'punct.onTimeRate', numeric: true },
  { key: 'late', label: 'punct.late', numeric: true },
  { key: 'early', label: 'punct.early', numeric: true },
  { key: 'averageLateMinutes', label: 'punct.avgLate', numeric: true },
  { key: 'p90LateMinutes', label: 'punct.p90Late', numeric: true },
  { key: 'worstLateMinutes', label: 'punct.worstLate', numeric: true },
]

/** Under 80 % on time is red, as on the performance page. */
const rateClass = (rate: number | null) => (rate !== null && rate < 0.8 ? 'font-semibold text-tone-danger' : undefined)

function Technicians({
  rows,
  selected,
  onSelect,
  reportLink,
}: {
  rows: readonly PunctualityTechnicianRow[]
  selected: string
  onSelect: (executorId: string) => void
  reportLink: (executorId: string) => string
}) {
  const { t } = useTranslation('tracking')
  const { lang } = useLang()
  // Worst first: the lowest on-time rate opens the list.
  const [sort, setSort] = useState<{ key: TechSortKey; dir: 'asc' | 'desc' }>({ key: 'onTimeRate', dir: 'asc' })
  const sorted = useMemo(() => sortRows(rows, sort.key, sort.dir, new Intl.Collator(lang)), [rows, sort, lang])
  const onSort = (key: TechSortKey) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 'desc' ? 'asc' : 'desc') : key === 'fullName' ? 'asc' : 'desc' }))
  const pct = (v: number | null) => formatPercent(v, lang, 0)
  const dur = (v: number | null) => formatDuration(v, lang)

  return (
    <Card>
      <CardHeader title={t('punct.technicians')} description={selected ? t('punct.techniciansFiltered') : t('punct.techniciansHint')} />
      {rows.length === 0 ? (
        <EmptyState title={t('punct.empty')} />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <THead>
                <Tr>
                  {TECH_COLUMNS.map((c) => (
                    <SortTh key={c.key} column={c.key} label={t(c.label)} sort={sort} onSort={onSort} numeric={c.numeric} />
                  ))}
                </Tr>
              </THead>
              <TBody>
                {sorted.map((r) => (
                  <Tr
                    key={r.executorId}
                    className={cn('cursor-pointer hover:bg-muted/40', r.executorId === selected && 'bg-primary-soft/60')}
                    onClick={() => onSelect(r.executorId)}
                    aria-selected={r.executorId === selected}
                  >
                    <Td>
                      <button type="button" className="text-start font-medium hover:text-primary hover:underline" onClick={(e) => (e.stopPropagation(), onSelect(r.executorId))}>
                        {r.fullName}
                      </button>
                      <div>
                        <Link to={reportLink(r.executorId)} onClick={(e) => e.stopPropagation()} className="text-xs text-primary hover:underline">
                          {t('report')}
                        </Link>
                      </div>
                    </Td>
                    <Td className="tabular text-end">{formatNumber(r.visits, lang)}</Td>
                    <Td className={cn('tabular text-end', rateClass(r.onTimeRate))}>{pct(r.onTimeRate)}</Td>
                    <Td className={cn('tabular text-end', r.late > 0 && 'font-medium')}>{formatNumber(r.late, lang)}</Td>
                    <Td className="tabular text-end">{formatNumber(r.early, lang)}</Td>
                    <Td className="tabular text-end text-xs">{dur(r.averageLateMinutes)}</Td>
                    <Td className="tabular text-end text-xs">{dur(r.p90LateMinutes)}</Td>
                    <Td className="tabular text-end text-xs">{dur(r.worstLateMinutes)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
          <ul className="divide-y md:hidden">
            {sorted.map((r) => (
              <li key={r.executorId} className={cn(r.executorId === selected && 'bg-primary-soft/60')}>
                <button type="button" className="block w-full px-4 py-3 text-start" onClick={() => onSelect(r.executorId)} aria-pressed={r.executorId === selected}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate font-medium">{r.fullName}</span>
                    <span className={cn('tabular text-lg font-semibold', rateClass(r.onTimeRate))}>{pct(r.onTimeRate)}</span>
                  </div>
                  <div className="tabular mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{t('punct.lateOf', { late: formatNumber(r.late, lang), visits: formatNumber(r.visits, lang) })}</span>
                    {r.early > 0 && <span>{t('punct.earlyCount', { count: r.early })}</span>}
                    {r.averageLateMinutes !== null && <span>{t('punct.avgLateShort', { value: dur(r.averageLateMinutes) })}</span>}
                    {r.worstLateMinutes !== null && <span>{t('punct.worstShort', { value: dur(r.worstLateMinutes) })}</span>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}

// ── Late visits ──────────────────────────────────────────────────────────────

function LateVisits({ visits, totalLate }: { visits: readonly LateVisit[]; totalLate: number }) {
  const { t } = useTranslation('tracking')
  const { lang } = useLang()
  const windowText = (w: ReturnType<typeof visitWindow>) => (w.range ? <span className="ltr-nums">{w.range}</span> : t('punct.until', { time: w.end }))
  const lateBadge = (v: LateVisit) => (
    <Badge tone={v.lateMinutes >= 60 ? 'danger' : 'attention'} className="tabular">
      {t('punct.lateBy', { value: formatDuration(v.lateMinutes, lang) })}
    </Badge>
  )
  return (
    <Card>
      <CardHeader
        title={t('punct.lateVisits')}
        description={visits.length < totalLate ? t('punct.lateVisitsCapped', { shown: visits.length, total: totalLate }) : t('punct.lateVisitsHint')}
      />
      {visits.length === 0 ? (
        <EmptyState icon={<CalendarCheck2 className="size-5" />} title={t('punct.noLate')} />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <THead>
                <Tr>
                  <Th>{t('punct.service')}</Th>
                  <Th>{t('punct.technician')}</Th>
                  <Th>{t('punct.window')}</Th>
                  <Th>{t('punct.arrived')}</Th>
                  <Th className="text-end">{t('punct.lateMinutes')}</Th>
                </Tr>
              </THead>
              <TBody>
                {visits.map((v) => {
                  const w = visitWindow(v.scheduledStart, v.scheduledEnd)
                  return (
                    <Tr key={`${v.serviceItemId}-${v.arrivedAt}`}>
                      <Td className="max-w-[18rem]">
                        <ServiceLink item={v} />
                      </Td>
                      <Td className="text-sm">{v.executorName}</Td>
                      <Td className="tabular whitespace-nowrap text-xs">
                        <div className="text-muted-foreground">{w.date}</div>
                        <div>{windowText(w)}</div>
                      </Td>
                      <Td className="tabular whitespace-nowrap text-xs">
                        <span className="ltr-nums font-medium text-tone-danger">{arrivalText(v.arrivedAt, w.date)}</span>
                      </Td>
                      <Td className="text-end">{lateBadge(v)}</Td>
                    </Tr>
                  )
                })}
              </TBody>
            </Table>
          </div>
          <ul className="divide-y md:hidden">
            {visits.map((v) => {
              const w = visitWindow(v.scheduledStart, v.scheduledEnd)
              return (
                <li key={`${v.serviceItemId}-${v.arrivedAt}`} className="space-y-1.5 px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <ServiceLink item={v} />
                    <span className="shrink-0">{lateBadge(v)}</span>
                  </div>
                  <dl className="tabular grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-xs">
                    <dt className="text-muted-foreground">{t('punct.technician')}</dt>
                    <dd>{v.executorName}</dd>
                    <dt className="text-muted-foreground">{t('punct.window')}</dt>
                    <dd>
                      {w.date} · {windowText(w)}
                    </dd>
                    <dt className="text-muted-foreground">{t('punct.arrived')}</dt>
                    <dd className="ltr-nums font-medium text-tone-danger">{arrivalText(v.arrivedAt, w.date)}</dd>
                  </dl>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Card>
  )
}
