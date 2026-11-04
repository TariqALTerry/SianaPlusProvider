import { useQuery } from '@tanstack/react-query'
import { FileText, FileX, MessageSquareWarning, ShieldAlert, ShieldCheck, Star, StarOff, TimerOff, UserX, X, Zap, type LucideIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { QualitySignalKindValues, type QualityGrade, type QualitySignal, type QualitySignalKind, type QualityTechnicianRow } from '@/api/types'
import { DateTime } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, ErrorState } from '@/components/States'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useLang } from '@/hooks/useLang'
import { useUrlState } from '@/hooks/useUrlState'
import { enumLabel, enumTone } from '@/i18n/enums'
import { formatDuration, formatMoney, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { toneDot } from '@/components/ui/badge'
import { insightKeys, insightsApi, type TrackingParams } from './api'
import { reportHref, resolvePeriod, type PerfPeriod } from './logic'
import { PeriodFilter } from './PeriodFilter'
import { TechnicianFilter } from './TechnicianFilter'
import { mainReason, signalMeasure, QUALITY_GOOD, QUALITY_WATCH, QUALITY_WEIGHTS, qualityComponents, type QualityComponent, type QualityComponentKey } from './trackingLogic'
import { HelpPopover, ServiceLink } from './TrackingParts'
import './trackingI18n'

const schema = { period: '30', from: '', to: '', executorId: '', kind: '' }

const KIND_ICON: Record<QualitySignalKind, LucideIcon> = {
  FastCompletion: Zap,
  QuotationRejected: FileX,
  AssignmentDeclined: UserX,
  AssignmentTimedOut: TimerOff,
  Dispute: MessageSquareWarning,
  LowRating: StarOff,
  WarrantyClaim: ShieldAlert,
}

const GRADE_ORDER: readonly QualityGrade[] = ['Risk', 'Watch', 'Good', 'InsufficientData']

/**
 * `/team/quality`: the period's quality signals per technician, worst first, with the parts of the score so the
 * reason is plain, and the feed of the events behind them. Picking a technician filters both (`executorId`).
 */
export function QualityPage() {
  const { t } = useTranslation('tracking')
  const { state, set } = useUrlState(schema)
  const { period, range, ready } = resolvePeriod(state)
  const params: TrackingParams = { from: range.from, to: range.to, executorId: state.executorId || undefined }
  const query = useQuery({ queryKey: insightKeys.quality(params), queryFn: ({ signal }) => insightsApi.quality(params, signal), enabled: ready })
  const toggleTechnician = (id: string) => set({ executorId: id === state.executorId ? '' : id })

  return (
    <>
      <PageHeader
        title={t('quality.title')}
        description={t('quality.subtitle')}
        meta={
          <HelpPopover label={t('quality.formulaTitle')}>
            <FormulaHelp />
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
        <div className="grid gap-4 xl:grid-cols-5" aria-busy>
          <div className="space-y-3 xl:col-span-3">
            <Skeleton className="h-10" />
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
          <Skeleton className="h-96 xl:col-span-2" />
        </div>
      ) : query.isError ? (
        <Card>
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </Card>
      ) : query.data.technicians.length === 0 && query.data.signals.length === 0 ? (
        <Card>
          <EmptyState icon={<ShieldCheck className="size-5" />} title={state.executorId ? t('quality.emptyTechnician') : t('quality.empty')} description={t('quality.emptyHint')} />
        </Card>
      ) : (
        <div className={cn('grid items-start gap-4 transition-opacity xl:grid-cols-5', query.isFetching && 'opacity-70')}>
          <section className="space-y-3 xl:col-span-3" aria-label={t('quality.technicians')}>
            <GradeSummary rows={query.data.technicians} />
            {query.data.technicians.length === 0 ? (
              <Card>
                <EmptyState title={t('quality.noTechnicians')} />
              </Card>
            ) : (
              query.data.technicians.map((r) => (
                <TechnicianCard
                  key={r.executorId}
                  row={r}
                  selected={r.executorId === state.executorId}
                  onSelect={() => toggleTechnician(r.executorId)}
                  period={period}
                  range={range}
                />
              ))
            )}
          </section>
          <Signals
            signals={query.data.signals}
            kind={state.kind}
            onKind={(kind) => set({ kind })}
            onTechnician={toggleTechnician}
            selectedTechnician={state.executorId}
            className="xl:sticky xl:top-20 xl:col-span-2"
          />
        </div>
      )}
    </>
  )
}

function FormulaHelp() {
  const { t } = useTranslation('tracking')
  const { lang } = useLang()
  const keys = Object.keys(QUALITY_WEIGHTS) as QualityComponentKey[]
  return (
    <>
      <p className="font-medium">{t('quality.formulaTitle')}</p>
      <p>{t('quality.formulaIntro')}</p>
      <ul className="space-y-0.5 text-xs">
        {keys.map((k) => (
          <li key={k} className="flex justify-between gap-3">
            <span>{t(`quality.part.${k}`)}</span>
            <span className="tabular text-muted-foreground">× {formatNumber(QUALITY_WEIGHTS[k], lang, 2)}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">{t('quality.formulaRates')}</p>
      <ul className="space-y-1 text-xs">
        <li className="flex items-center gap-2">
          <StatusBadge enum="QualityGrade" value="Good" /> {t('quality.gradeGood', { min: QUALITY_GOOD })}
        </li>
        <li className="flex items-center gap-2">
          <StatusBadge enum="QualityGrade" value="Watch" /> {t('quality.gradeWatch', { min: QUALITY_WATCH, max: QUALITY_GOOD - 1 })}
        </li>
        <li className="flex items-center gap-2">
          <StatusBadge enum="QualityGrade" value="Risk" /> {t('quality.gradeRisk', { max: QUALITY_WATCH })}
        </li>
        <li className="flex items-center gap-2">
          <StatusBadge enum="QualityGrade" value="InsufficientData" /> {t('quality.gradeInsufficient')}
        </li>
      </ul>
    </>
  )
}

/** How many technicians in each grade, worst first: the page's headline. */
function GradeSummary({ rows }: { rows: readonly QualityTechnicianRow[] }) {
  const { t } = useTranslation('tracking')
  const { lang } = useLang()
  const counts = useMemo(() => {
    const m = new Map<QualityGrade, number>()
    for (const r of rows) m.set(r.grade, (m.get(r.grade) ?? 0) + 1)
    return m
  }, [rows])
  if (!rows.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" aria-label={t('quality.summary')}>
      {GRADE_ORDER.filter((g) => counts.get(g)).map((g) => (
        <span key={g} className="inline-flex items-center gap-1.5 rounded-full border bg-surface px-3 py-1">
          <span className={cn('size-2 rounded-full', toneDot[enumTone('QualityGrade', g)])} aria-hidden />
          <span className="tabular font-semibold">{formatNumber(counts.get(g) ?? 0, lang)}</span>
          <span className="text-muted-foreground">{enumLabel('QualityGrade', g, lang)}</span>
        </span>
      ))}
    </div>
  )
}

const meterClass: Record<QualityGrade, string> = {
  Good: 'bg-tone-success',
  Watch: 'bg-tone-attention',
  Risk: 'bg-tone-danger',
  InsufficientData: 'bg-tone-muted',
}

const meterTrack: Record<QualityGrade, string> = {
  Good: 'bg-tone-success-soft',
  Watch: 'bg-tone-attention-soft',
  Risk: 'bg-tone-danger-soft',
  InsufficientData: 'bg-muted',
}

function TechnicianCard({
  row: r,
  selected,
  onSelect,
  period,
  range,
}: {
  row: QualityTechnicianRow
  selected: boolean
  onSelect: () => void
  period: PerfPeriod
  range: { from: string; to: string }
}) {
  const { t } = useTranslation('tracking')
  const { lang } = useLang()
  const parts = qualityComponents(r)
  const reason = r.grade === 'InsufficientData' ? null : mainReason(parts)
  return (
    <Card className={cn('overflow-hidden', selected && 'border-primary ring-1 ring-primary/30')} data-executor={r.executorId}>
      <div className="flex items-start justify-between gap-3 px-4 pt-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            className="max-w-full truncate text-start font-semibold hover:text-primary hover:underline"
            title={selected ? t('quality.showAll') : t('quality.filterBy', { name: r.fullName })}
          >
            {r.fullName}
          </button>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>{t('quality.completed', { count: r.completed })}</span>
            {r.averageRating !== null && (
              <span className="inline-flex items-center gap-1">
                <Star className="size-3 fill-current text-brand-yellow" aria-hidden />
                <span className="tabular">{formatNumber(r.averageRating, lang, 1)}</span>
                <span>({t('quality.ratings', { count: r.ratingsCount })})</span>
              </span>
            )}
            <Link to={reportHref(r.executorId, period, range)} className="inline-flex items-center gap-1 text-primary hover:underline">
              <FileText className="size-3" aria-hidden /> {t('report')}
            </Link>
          </div>
        </div>
        <div className="shrink-0 text-end">
          <div className="text-2xl font-semibold leading-none">
            {r.score === null ? '—' : formatNumber(r.score, lang)}
            {r.score !== null && <span className="text-xs font-normal text-muted-foreground"> / {formatNumber(100, lang)}</span>}
          </div>
          <StatusBadge enum="QualityGrade" value={r.grade} className="mt-1" />
        </div>
      </div>
      {/* Thin meter: the fill carries the grade, the track is a lighter step of the same tone. */}
      <div className="px-4 pt-2">
        <div className={cn('h-1.5 overflow-hidden rounded-full', meterTrack[r.grade])} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={r.score ?? undefined} aria-label={t('quality.score')}>
          {r.score !== null && <div className={cn('h-full rounded-full', meterClass[r.grade])} style={{ width: `${Math.max(2, r.score)}%` }} />}
        </div>
      </div>
      <div className="px-4 pb-3 pt-2">
        {r.grade === 'InsufficientData' && <p className="mb-2 text-xs text-muted-foreground">{t('quality.insufficientHint')}</p>}
        {reason && (
          <p className="mb-2 text-xs">
            <span className="text-muted-foreground">{t('quality.mainReason')}</span> <span className="font-medium">{t(`quality.part.${reason.key}`)}</span>
          </p>
        )}
        <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {parts.map((c) => (
            <Part key={c.key} part={c} main={reason?.key === c.key} scored={r.grade !== 'InsufficientData'} />
          ))}
        </ul>
      </div>
    </Card>
  )
}

/**
 * One part of the score: how many of how many, and the points it costs. Parts that cost nothing stay quiet;
 * without a grade there is no score to take points from, so only the counts show.
 */
function Part({ part: c, main, scored }: { part: QualityComponent; main: boolean; scored: boolean }) {
  const { t } = useTranslation('tracking')
  const { lang } = useLang()
  const costs = scored && c.points >= 0.5
  return (
    <li
      className={cn(
        'rounded-md border px-2.5 py-1.5 text-xs',
        main ? 'border-tone-danger/40 bg-tone-danger-soft' : costs ? 'bg-tone-attention-soft/50' : 'bg-muted/30 text-muted-foreground',
      )}
    >
      <div className="truncate" title={t(`quality.part.${c.key}`)}>
        {t(`quality.part.${c.key}`)}
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <span className={cn('tabular', costs && 'font-semibold text-foreground')}>
          {c.of === 0 ? t('quality.none') : t(`quality.of.${c.key}`, { count: c.count, of: formatNumber(c.of, lang) })}
        </span>
        {costs && <span className={cn('tabular shrink-0 font-semibold', main ? 'text-tone-danger' : 'text-tone-attention')}>{t('quality.points', { value: `\u2066−${formatNumber(Math.round(c.points), lang)}\u2069` })}</span>}
      </div>
    </li>
  )
}

function Signals({
  signals,
  kind,
  onKind,
  onTechnician,
  selectedTechnician,
  className,
}: {
  signals: readonly QualitySignal[]
  kind: string
  onKind: (kind: string) => void
  onTechnician: (executorId: string) => void
  selectedTechnician: string
  className?: string
}) {
  const { t } = useTranslation('tracking')
  const { lang } = useLang()
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of signals) m.set(s.kind, (m.get(s.kind) ?? 0) + 1)
    return m
  }, [signals])
  const active = kind && counts.has(kind) ? kind : ''
  const shown = active ? signals.filter((s) => s.kind === active) : signals
  const kinds = QualitySignalKindValues.filter((k) => counts.has(k))

  return (
    <Card className={className}>
      <CardHeader title={t('quality.signals')} description={signals.length >= 100 ? t('quality.signalsCapped') : t('quality.signalsHint')} />
      {kinds.length > 1 && (
        <div className="flex flex-wrap gap-1 border-b px-4 py-2" role="group" aria-label={t('quality.filterKind')}>
          <KindChip active={!active} onClick={() => onKind('')} label={t('quality.allKinds')} count={signals.length} />
          {kinds.map((k) => (
            <KindChip key={k} active={active === k} onClick={() => onKind(active === k ? '' : k)} label={enumLabel('QualitySignalKind', k, lang)} count={counts.get(k) ?? 0} />
          ))}
        </div>
      )}
      {shown.length === 0 ? (
        <EmptyState icon={<ShieldCheck className="size-5" />} title={t('quality.noSignals')} />
      ) : (
        <ol className="max-h-[70vh] divide-y overflow-y-auto [scrollbar-width:thin]">
          {shown.map((s, i) => (
            <SignalRow key={`${s.serviceItemId}-${s.kind}-${s.at}-${i}`} signal={s} onTechnician={onTechnician} selectedTechnician={selectedTechnician} />
          ))}
        </ol>
      )}
    </Card>
  )
}

function KindChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  const { lang } = useLang()
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs', active ? 'border-primary bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')}
    >
      {label}
      <span className={cn('tabular', !active && 'text-muted-foreground')}>{formatNumber(count, lang)}</span>
    </button>
  )
}

const iconTone = {
  danger: 'bg-tone-danger-soft text-tone-danger',
  attention: 'bg-tone-attention-soft text-tone-attention',
  waiting: 'bg-tone-waiting-soft text-tone-waiting',
} as const

function SignalRow({ signal: s, onTechnician, selectedTechnician }: { signal: QualitySignal; onTechnician: (id: string) => void; selectedTechnician: string }) {
  const { t } = useTranslation('tracking')
  const { lang } = useLang()
  const Icon = KIND_ICON[s.kind] ?? ShieldAlert
  const tone = enumTone('QualitySignalKind', s.kind)
  return (
    <li className="flex gap-3 px-4 py-3">
      <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full', iconTone[tone as keyof typeof iconTone] ?? 'bg-muted text-muted-foreground')} aria-hidden>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5 text-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span className="font-medium">{enumLabel('QualitySignalKind', s.kind, lang)}</span>
          <DateTime value={s.at} className="text-xs text-muted-foreground" />
        </div>
        {!selectedTechnician && (
          <button type="button" className="text-xs text-muted-foreground hover:text-primary hover:underline" onClick={() => onTechnician(s.executorId)}>
            {t('quality.by', { name: s.executorName })}
          </button>
        )}
        <ServiceLink item={s} className="text-xs" />
        <Measure signal={s} />
        {s.detail && (
          <p dir="auto" className="rounded bg-muted/50 px-2 py-1 text-xs text-foreground/80">
            {s.detail}
          </p>
        )}
      </div>
    </li>
  )
}

/** The number behind a signal, when the server measured one: minutes worked, the rating, the quote's total. */
function Measure({ signal }: { signal: QualitySignal }) {
  const { t } = useTranslation('tracking')
  const { lang } = useLang()
  const m = signalMeasure(signal)
  if (!m) return null
  const text =
    m.type === 'fast'
      ? m.limit === null
        ? t('quality.measure.fastOnly', { worked: formatDuration(m.minutes, lang) })
        : t('quality.measure.fast', { worked: formatDuration(m.minutes, lang), limit: formatDuration(m.limit, lang) })
      : m.type === 'rating'
        ? t('quality.measure.rating', { rating: formatNumber(m.rating, lang) })
        : t('quality.measure.quote', { amount: formatMoney(m.amount, lang) })
  return <p className="tabular text-xs font-medium text-foreground/90">{text}</p>
}
