import type { UseQueryResult } from '@tanstack/react-query'
import { AlertTriangle, ClipboardList, HeartPulse, Lightbulb } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DateTime } from '@/components/Format'
import { KeyValue } from '@/components/KeyValue'
import { EmptyState, ErrorState } from '@/components/States'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogDescription, DialogHeader, DialogTitle, SheetContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { HomeInspectionCheckResponse, HomeInspectionResponse, ServiceItemProviderView } from '@/api/types'
import { useLang } from '@/hooks/useLang'
import { cn } from '@/lib/utils'
import { inspectionProgress, inspectionScoreTone, inspectionSuggestions, isInspectionNotRequired, showsInspectionWarning } from '../logic'
import '../i18n'

type InspectionQuery = UseQueryResult<HomeInspectionResponse>

/** Whether the item has a report to open: covered, and not refused as "not a health check". */
function hasReport(query: InspectionQuery): boolean {
  return query.isSuccess || (query.isError && !isInspectionNotRequired(query.error))
}

const scoreClass = { success: 'bg-tone-success-soft text-tone-success', waiting: 'bg-tone-waiting-soft text-tone-waiting', danger: 'bg-tone-danger-soft text-tone-danger' } as const

/** "تقرير صحة بيتك" in the page header, with where the report stands. */
export function HomeInspectionButton({ query, onOpen }: { query: InspectionQuery; onOpen: () => void }) {
  const { t } = useTranslation('work')
  if (!hasReport(query)) return null
  const report = query.data
  return (
    <Button size="sm" variant="outline" onClick={onOpen}>
      <HeartPulse /> {t('inspection.open')}
      {report?.status === 'Submitted' && report.score !== null && (
        <span className={cn('tabular rounded-full px-1.5 text-xs font-semibold', scoreClass[inspectionScoreTone(report.score)])}>{report.score}</span>
      )}
      {report?.status === 'Draft' && <span className="size-1.5 rounded-full bg-tone-active" aria-hidden />}
    </Button>
  )
}

/** For the supervisor: the technician cannot finish this visit until the report is sent. */
export function InspectionWarning({ item, query, onOpen }: { item: ServiceItemProviderView; query: InspectionQuery; onOpen: () => void }) {
  const { t } = useTranslation('work')
  const report = query.data
  if (!report || !showsInspectionWarning(item.status, report.status)) return null
  const progress = inspectionProgress(report.checks)
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-tone-attention/30 bg-tone-attention-soft px-3 py-2 text-sm text-tone-attention" role="status">
      <AlertTriangle className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        {t('inspection.required')}
        {report.status === 'Draft' && <span className="ms-1">{t('inspection.requiredDraft', progress)}</span>}
      </span>
      <Button size="xs" variant="outline" onClick={onOpen}>
        {t('inspection.view')}
      </Button>
    </div>
  )
}

export function HomeInspectionSheet({ query, open, onOpenChange }: { query: InspectionQuery; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('work')
  const { pick } = useLang()
  const report = query.data
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SheetContent size="lg">
        <DialogHeader>
          <DialogTitle>{t('inspection.title')}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {report ? (
                <>
                  {[report.itemNumber, pick(report.serviceNameAr, report.serviceNameEn)].filter(Boolean).join(' · ')}
                  {(report.addressLabel || report.district) && <span>— {[report.addressLabel, report.district].filter(Boolean).join('، ')}</span>}
                  {report.status && <StatusBadge enum="HomeInspectionStatus" value={report.status} />}
                </>
              ) : (
                <span />
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {query.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-20" />
              <Skeleton className="h-40" />
            </div>
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
          ) : (
            <ReportBody report={query.data} />
          )}
        </DialogBody>
      </SheetContent>
    </Dialog>
  )
}

function ReportBody({ report }: { report: HomeInspectionResponse }) {
  const { t } = useTranslation('work')
  const meta = (
    <KeyValue
      items={[
        { label: t('inspection.inspector'), value: report.inspectorName },
        report.submittedAt
          ? { label: t('inspection.submittedAt'), value: <DateTime value={report.submittedAt} mode="absolute" /> }
          : { label: t('inspection.updatedAt'), value: report.updatedAt ? <DateTime value={report.updatedAt} mode="absolute" /> : null, hidden: !report.updatedAt },
      ]}
    />
  )

  if (report.status === null) {
    return (
      <>
        <EmptyState icon={<ClipboardList className="size-5" />} title={t('inspection.notStarted')} description={t('inspection.notStartedHint')} />
        {meta}
      </>
    )
  }

  if (report.status === 'Draft') {
    const { done, total } = inspectionProgress(report.checks)
    return (
      <>
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <span
              className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
              aria-label={t('inspection.draft')}
            >
              <span className="block h-full rounded-full bg-tone-active" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
            </span>
            <span className="tabular shrink-0 text-sm text-muted-foreground">{t('inspection.progress', { done, total })}</span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t('inspection.notStartedHint')}</p>
        </div>
        {meta}
      </>
    )
  }

  return (
    <>
      <ScoreSummary report={report} />
      {meta}
      {report.summary && (
        <div>
          <p className="text-xs text-muted-foreground">{t('inspection.summary')}</p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm">{report.summary}</p>
        </div>
      )}
      <Suggestions checks={report.checks} />
      <Areas report={report} />
    </>
  )
}

function ScoreSummary({ report }: { report: HomeInspectionResponse }) {
  const { t } = useTranslation('work')
  const score = report.score
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border p-4">
      {score !== null && (
        <div className={cn('flex size-20 shrink-0 flex-col items-center justify-center rounded-full', scoreClass[inspectionScoreTone(score)])}>
          <span className="tabular text-2xl font-bold leading-none">{score}</span>
          <span className="mt-1 text-[0.6875rem]">{t('inspection.score')}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Badge tone="success" dot>
          {t('inspection.counts.good')} <span className="tabular">{report.goodCount}</span>
        </Badge>
        <Badge tone="waiting" dot>
          {t('inspection.counts.needsAttention')} <span className="tabular">{report.needsAttentionCount}</span>
        </Badge>
        <Badge tone="danger" dot>
          {t('inspection.counts.urgent')} <span className="tabular">{report.urgentCount}</span>
        </Badge>
      </div>
    </div>
  )
}

/** "مقترحات للعميل": read only — there is no ordering on the customer's behalf. */
function Suggestions({ checks }: { checks: HomeInspectionCheckResponse[] }) {
  const { t } = useTranslation('work')
  const { pick } = useLang()
  const rows = inspectionSuggestions(checks)
  if (!rows.length) return null
  return (
    <section aria-labelledby="inspection-suggestions" className="rounded-xl border border-tone-waiting/30 bg-tone-waiting-soft/40 p-4">
      <h3 id="inspection-suggestions" className="flex items-center gap-1.5 text-sm font-semibold">
        <Lightbulb className="size-4 text-tone-waiting" aria-hidden /> {t('inspection.suggestions')}
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{t('inspection.suggestionsHint')}</p>
      <ul className="mt-3 space-y-2">
        {rows.map((c) => (
          <li key={c.key} className="flex flex-wrap items-start justify-between gap-2 text-sm">
            <span className="min-w-0">
              <span className="font-medium">{pick(c.labelAr, c.labelEn)}</span>
              {c.recommendedServiceId && (c.recommendedServiceNameAr || c.recommendedServiceNameEn) && (
                <span className="block text-xs text-muted-foreground">
                  {t('inspection.recommended', { name: pick(c.recommendedServiceNameAr, c.recommendedServiceNameEn) })}
                </span>
              )}
            </span>
            <StatusBadge enum="HomeInspectionResult" value={c.result} className="shrink-0" />
          </li>
        ))}
      </ul>
    </section>
  )
}

function Areas({ report }: { report: HomeInspectionResponse }) {
  const { t } = useTranslation('work')
  const { pick } = useLang()
  const known = new Set(report.areas.map((a) => a.key))
  const groups = report.areas.map((a) => ({ key: a.key, name: pick(a.nameAr, a.nameEn), checks: report.checks.filter((c) => c.areaKey === a.key) }))
  const orphans = report.checks.filter((c) => !known.has(c.areaKey))
  if (orphans.length) groups.push({ key: '', name: '—', checks: orphans })
  return (
    <div className="space-y-4">
      {groups
        .filter((g) => g.checks.length)
        .map((g) => (
          <section key={g.key} aria-label={g.name}>
            <h3 className="mb-2 text-sm font-semibold">{g.name}</h3>
            <ul className="divide-y rounded-md border">
              {g.checks.map((c) => (
                <li key={c.key} className="px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 text-sm">{pick(c.labelAr, c.labelEn)}</span>
                    {c.result ? (
                      <StatusBadge enum="HomeInspectionResult" value={c.result} className="shrink-0" />
                    ) : (
                      <span className="shrink-0 text-xs text-muted-foreground">{t('inspection.notAnswered')}</span>
                    )}
                  </div>
                  {c.note && <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/60 px-2 py-1 text-xs text-muted-foreground">{c.note}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  )
}
