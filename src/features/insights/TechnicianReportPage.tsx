import { useQuery } from '@tanstack/react-query'
import { Download, Printer } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useParams } from 'react-router'
import type { TechnicianDayCount, TechnicianReportItem, TechnicianReportResponse, TechnicianReportTotals } from '@/api/types'
import { DateTime, Duration, Money } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/States'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Tooltip } from '@/components/ui/menu'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { useUrlState } from '@/hooks/useUrlState'
import { saveBlob } from '@/lib/download'
import { formatMoney, formatNumber, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { insightKeys, insightsApi } from './api'
import { dailyBars, reportPdfName, resolvePeriod } from './logic'
import { PeriodFilter } from './PeriodFilter'
import './i18n'

const schema = { period: '30', from: '', to: '' }

/**
 * `/team/:executorId/report`: one technician's work over whole Riyadh days, on screen, as a PDF
 * from the server, or printed from here. The server answers `ReportRangeInvalid` and
 * `ReportRangeTooLong` (over a year), and `ErrorState` shows its message.
 */
export function TechnicianReportPage() {
  const { executorId = '' } = useParams()
  const { search } = useLocation()
  const { t } = useTranslation('insights')
  const { state, set } = useUrlState(schema)
  const { period, range, ready } = resolvePeriod(state)
  const params = { from: range.from, to: range.to }

  const query = useQuery({
    queryKey: insightKeys.report(executorId, params),
    queryFn: ({ signal }) => insightsApi.technicianReport(executorId, params, signal),
    enabled: ready,
  })
  const report = query.data

  const pdf = useAction({
    mutationFn: (r: TechnicianReportResponse) => insightsApi.technicianReportPdf(executorId, { from: r.from, to: r.to }),
    onSuccess: (blob, r) => saveBlob(blob, reportPdfName(r.executorName, r.from, r.to)),
    errorToast: true,
  })

  return (
    <>
      <PageHeader
        className="print:[&_a]:hidden"
        back={{ to: `/team/performance${search}`, label: t('perf.title') }}
        title={report ? t('report.titleOf', { name: report.executorName }) : t('report.title')}
        description={report ? `${report.organizationName} · ${t('perf.range', { from: report.from, to: report.to })}` : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button size="sm" variant="outline" disabled={!report} onClick={() => window.print()}>
              <Printer /> {t('report.print')}
            </Button>
            <Button size="sm" disabled={!report} loading={pdf.isPending} onClick={() => report && pdf.mutate(report)}>
              <Download /> {t('report.download')}
            </Button>
          </div>
        }
      />
      <PeriodFilter period={period} range={range} custom={{ from: state.from, to: state.to }} onChange={set} />

      {!ready ? null : query.isPending ? (
        <PageSkeleton />
      ) : query.isError ? (
        <Card>
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </Card>
      ) : (
        <ReportBody report={query.data} />
      )}
    </>
  )
}

function ReportBody({ report }: { report: TechnicianReportResponse }) {
  const { t } = useTranslation('insights')
  const { pick } = useLang()
  return (
    <div className="space-y-4">
      <Totals totals={report.totals} previous={report.previous} />
      <Indicators report={report} />
      <Card className="break-inside-avoid">
        <CardHeader title={t('report.daily')} />
        <CardBody>
          <DailyChart days={report.daily} completed={report.totals.completed} />
        </CardBody>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2 print:grid-cols-2">
        <CountList title={t('report.services')} rows={report.services.map((s) => ({ key: s.serviceNameAr, label: pick(s.serviceNameAr, s.serviceNameEn), count: s.count }))} />
        <CountList
          title={t('report.areas')}
          rows={report.areas.map((a) => {
            const label = [a.district, a.city].filter(Boolean).join('، ') || '—'
            return { key: label, label, count: a.count }
          })}
        />
      </div>
      <Jobs items={report.items} total={report.itemsTotal} />
      <p className="text-xs text-muted-foreground">
        {t('report.generatedAt')} <DateTime value={report.generatedAt} mode="absolute" />
      </p>
    </div>
  )
}

function Tile({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="break-inside-avoid rounded-lg border bg-surface p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="tabular mt-1 text-lg font-semibold">{value}</div>
      {sub && <div className="text-[0.6875rem] text-muted-foreground">{sub}</div>}
    </div>
  )
}

function Totals({ totals, previous }: { totals: TechnicianReportTotals; previous: TechnicianReportTotals }) {
  const { t } = useTranslation('insights')
  const { lang } = useLang()
  const count = (key: 'received' | 'completed' | 'notCompleted' | 'cancelled' | 'rejected' | 'timedOut') => (
    <Tile key={key} label={t(`report.totals.${key}`)} value={formatNumber(totals[key], lang)} sub={t('report.previous', { value: formatNumber(previous[key], lang) })} />
  )
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
      {count('received')}
      {count('completed')}
      {/* What the technician holds now has no previous period: the server counts it whatever the dates. */}
      <Tile label={t('report.totals.inProgress')} value={formatNumber(totals.inProgress, lang)} sub={t('report.nowHint')} />
      {totals.totalValue !== null && (
        <Tile
          label={t('report.totals.totalValue')}
          value={<Money value={totals.totalValue} />}
          sub={t('report.previous', { value: formatMoney(previous.totalValue, lang) })}
        />
      )}
      {count('notCompleted')}
      {count('cancelled')}
      {count('rejected')}
      {count('timedOut')}
    </div>
  )
}

function Indicators({ report: { indicators: i } }: { report: TechnicianReportResponse }) {
  const { t } = useTranslation('insights')
  const { lang } = useLang()
  const pct = (v: number | null) => formatPercent(v, lang, 0)
  return (
    <Card className="break-inside-avoid">
      <CardHeader title={t('report.indicators')} />
      <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 print:grid-cols-5">
        <Tile label={t('report.completionRate')} value={pct(i.completionRate)} />
        <Tile label={t('perf.acceptance')} value={pct(i.acceptanceRate)} />
        <Tile label={t('perf.onTime')} value={pct(i.onTimeRate)} />
        <Tile
          label={t('perf.rating')}
          value={i.averageRating === null ? '—' : formatNumber(i.averageRating, lang, 1)}
          sub={i.ratingsCount > 0 ? t('perf.ratings', { count: i.ratingsCount }) : undefined}
        />
        <Tile label={t('perf.workTime')} value={<Duration minutes={i.averageWorkMinutes} />} />
      </CardBody>
    </Card>
  )
}

/** One series, so no legend: the card title names it. Plain bars, since Recharts stays on the home page. */
function DailyChart({ days, completed }: { days: readonly TechnicianDayCount[]; completed: number }) {
  const { t } = useTranslation('insights')
  const { lang } = useLang()
  const { max, bars } = dailyBars(days)
  if (max === 0) return <p className="text-sm text-muted-foreground">{t('report.noCompleted')}</p>
  return (
    <figure className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1">
      <div className="tabular flex h-40 flex-col justify-between text-end text-[0.6875rem] text-muted-foreground" aria-hidden>
        <span>{formatNumber(max, lang)}</span>
        <span>{formatNumber(0, lang)}</span>
      </div>
      <div
        role="img"
        aria-label={t('report.chartLabel', { completed, days: days.length, max })}
        className={cn('flex h-40 items-end border-b [print-color-adjust:exact]', bars.length > 62 ? 'gap-px' : 'gap-0.5')}
      >
        {bars.map((b) => (
          <Tooltip key={b.date} content={t('report.chartTip', { date: b.date, count: b.completed })}>
            <div className="flex h-full min-w-0 flex-1 items-end hover:bg-muted/60">
              {b.completed > 0 && <div className="w-full rounded-t-[4px] bg-primary" style={{ height: `${b.height}%` }} />}
            </div>
          </Tooltip>
        ))}
      </div>
      <div className="tabular col-start-2 flex justify-between text-[0.6875rem] text-muted-foreground" aria-hidden>
        <span>{bars[0]?.date}</span>
        <span>{bars[bars.length - 1]?.date}</span>
      </div>
    </figure>
  )
}

function CountList({ title, rows }: { title: string; rows: Array<{ key: string; label: string; count: number }> }) {
  const { t } = useTranslation('insights')
  const { lang } = useLang()
  return (
    <Card className="break-inside-avoid">
      <CardHeader title={title} />
      <CardBody>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('report.noCompleted')}</p>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.key} className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
                <span className="min-w-0">{r.label}</span>
                <span className="tabular font-medium">{formatNumber(r.count, lang)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}

function Jobs({ items, total }: { items: readonly TechnicianReportItem[]; total: number }) {
  const { t } = useTranslation('insights')
  const { pick } = useLang()
  const service = (j: TechnicianReportItem) => (
    <>
      <Link to={`/work/${j.id}`} className="font-medium hover:text-primary hover:underline">
        {pick(j.serviceNameAr, j.serviceNameEn)}
      </Link>
      <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
        {j.itemNumber && <span className="ltr-nums font-mono">{j.itemNumber}</span>}
        {(j.issueNameAr || j.issueNameEn) && <span>{pick(j.issueNameAr, j.issueNameEn)}</span>}
      </div>
      {j.completionNotes && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{j.completionNotes}</p>}
    </>
  )
  const area = (j: TechnicianReportItem) => [j.district, j.city].filter(Boolean).join('، ') || '—'
  const finished = (j: TechnicianReportItem) => j.completedAt ?? j.cancelledAt

  return (
    <Card>
      <CardHeader
        title={t('report.jobs')}
        description={items.length < total ? t('report.jobsCapped', { shown: items.length, total }) : t('report.jobsCount', { count: total })}
      />
      {items.length === 0 ? (
        <EmptyState title={t('report.noJobs')} />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block print:block">
            <Table>
              <THead>
                <Tr>
                  <Th>{t('report.cols.service')}</Th>
                  <Th>{t('report.cols.area')}</Th>
                  <Th>{t('report.cols.assignedAt')}</Th>
                  <Th>{t('report.cols.finishedAt')}</Th>
                  <Th>{t('report.cols.outcome')}</Th>
                  <Th className="text-end">{t('report.cols.amount')}</Th>
                </Tr>
              </THead>
              <TBody>
                {items.map((j) => (
                  <Tr key={j.id} className="break-inside-avoid">
                    <Td className="max-w-[20rem]">{service(j)}</Td>
                    <Td className="text-xs">{area(j)}</Td>
                    <Td>
                      <DateTime value={j.assignedAt} mode="absolute" className="text-xs" />
                    </Td>
                    <Td>
                      <DateTime value={finished(j)} mode="absolute" className="text-xs" />
                    </Td>
                    <Td>
                      <StatusBadge enum="TechnicianJobOutcome" value={j.outcome} />
                    </Td>
                    <Td className="text-end">
                      <Money value={j.amount} />
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
          <ul className="divide-y md:hidden print:hidden">
            {items.map((j) => (
              <li key={j.id} className="space-y-1.5 px-4 py-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">{service(j)}</div>
                  <StatusBadge enum="TechnicianJobOutcome" value={j.outcome} className="shrink-0" />
                </div>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-xs">
                  <dt className="text-muted-foreground">{t('report.cols.area')}</dt>
                  <dd>{area(j)}</dd>
                  <dt className="text-muted-foreground">{t('report.cols.assignedAt')}</dt>
                  <dd>
                    <DateTime value={j.assignedAt} mode="absolute" />
                  </dd>
                  <dt className="text-muted-foreground">{t('report.cols.finishedAt')}</dt>
                  <dd>
                    <DateTime value={finished(j)} mode="absolute" />
                  </dd>
                  <dt className="text-muted-foreground">{t('report.cols.amount')}</dt>
                  <dd>
                    <Money value={j.amount} />
                  </dd>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}
