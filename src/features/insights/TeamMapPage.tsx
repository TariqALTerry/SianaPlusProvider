import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, MapPinOff } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import type { TeamMapExecutor, TeamMapJob, TeamMapResponse } from '@/api/types'
import { LazyMap, type MapLine, type MapMarker } from '@/components/map/LazyMap'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { ErrorState } from '@/components/States'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useLang } from '@/hooks/useLang'
import { usePollingInterval } from '@/hooks/usePageVisible'
import { formatRelative, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { insightKeys, insightsApi } from './api'
import { availabilityColor, initialOf, JOB_COLORS, jobColor } from './logic'
import './i18n'

const BASE_COLOR = 'hsl(174 72% 28%)'

/**
 * `/team/map` (PROVIDER-PLATFORM-PHASE2-PROMPT §6): technicians where they are, today's / active jobs,
 * a line from each technician to the current job, late jobs in red. Polls every 30 s while visible.
 */
export function TeamMapPage() {
  const { t } = useTranslation('insights')
  const interval = usePollingInterval(30_000)
  const query = useQuery({ queryKey: insightKeys.map, queryFn: ({ signal }) => insightsApi.teamMap(signal), refetchInterval: interval, staleTime: 15_000 })

  return (
    <>
      <PageHeader title={t('map.title')} description={t('map.subtitle')} />
      {query.isPending ? (
        <Skeleton className="h-[32rem]" />
      ) : query.isError ? (
        <Card>
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </Card>
      ) : (
        <MapBody data={query.data} />
      )}
    </>
  )
}

function MapBody({ data }: { data: TeamMapResponse }) {
  const { t } = useTranslation('insights')
  const { lang, pick } = useLang()
  const navigate = useNavigate()
  const [highlight, setHighlight] = useState<string | null>(null)

  const { markers, lines, focus } = useMemo(() => {
    const markers: MapMarker[] = []
    const lines: MapLine[] = []
    if (data.baseLatitude !== null && data.baseLongitude !== null) {
      markers.push({ id: 'base', lat: data.baseLatitude, lng: data.baseLongitude, color: BASE_COLOR, text: '⌂', label: t('map.base') })
    }
    const jobById = new Map(data.jobs.map((j) => [j.serviceItemId, j]))
    for (const j of data.jobs) {
      if (j.latitude === null || j.longitude === null) continue
      markers.push({
        id: `job-${j.serviceItemId}`,
        lat: j.latitude,
        lng: j.longitude,
        color: jobColor(j),
        highlighted: highlight === j.serviceItemId,
        label: `${j.itemNumber ?? ''} · ${pick(j.serviceNameAr, j.serviceNameEn)}${j.isLate ? ` · ${t('map.late')}` : ''}${j.executorName ? '' : ` · ${t('map.unassigned')}`}`,
        onClick: () => navigate(`/work/${j.serviceItemId}`),
      })
    }
    for (const e of data.executors) {
      if (e.latitude === null || e.longitude === null) continue
      const job = e.currentJobId ? jobById.get(e.currentJobId) : undefined
      markers.push({
        id: `exec-${e.executorId}`,
        lat: e.latitude,
        lng: e.longitude,
        text: initialOf(e.fullName),
        color: availabilityColor(e.availability, e.isOffNow),
        faded: e.locationStale,
        highlighted: highlight === e.executorId,
        label: executorTooltip(e, job, t, lang, pick),
      })
      if (job && job.latitude !== null && job.longitude !== null) {
        lines.push({ id: `line-${e.executorId}`, from: [e.latitude, e.longitude], to: [job.latitude, job.longitude], color: job.isLate ? JOB_COLORS.late : undefined })
      }
    }
    const h = highlight ? markers.find((m) => m.id === `exec-${highlight}` || m.id === `job-${highlight}`) : undefined
    return { markers, lines, focus: h ? { lat: h.lat, lng: h.lng } : null }
  }, [data, highlight, t, lang, pick, navigate])

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-2">
        <LazyMap className="h-[32rem]" markers={markers} lines={lines} focus={focus} zoom={11} />
        <Legend />
        <p className="text-xs text-muted-foreground">{t('map.updated', { time: formatTime(data.generatedAt) })}</p>
      </div>
      <div className="space-y-4">
        <Card>
          <CardHeader title={t('map.technicians')} />
          {data.executors.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">{t('map.noTechnicians')}</p>
          ) : (
            <ul className="divide-y">
              {data.executors.map((e) => (
                <ExecutorRow key={e.executorId} e={e} job={data.jobs.find((j) => j.serviceItemId === e.currentJobId)} active={highlight === e.executorId} onFocus={() => setHighlight(e.executorId)} />
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title={t('map.jobs')} />
          {data.jobs.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">{t('map.noJobs')}</p>
          ) : (
            <ul className="divide-y">
              {data.jobs.map((j) => (
                <JobRow key={j.serviceItemId} j={j} active={highlight === j.serviceItemId} onFocus={() => setHighlight(j.serviceItemId)} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

function executorTooltip(
  e: TeamMapExecutor,
  job: TeamMapJob | undefined,
  t: (k: string, o?: Record<string, unknown>) => string,
  lang: string,
  pick: (ar?: string | null, en?: string | null) => string,
): string {
  const parts = [e.fullName, t('map.activeJobs', { count: e.activeJobs })]
  if (job) parts.push(`${t('map.currentJob')}: ${job.itemNumber ?? pick(job.serviceNameAr, job.serviceNameEn)}`)
  if (e.etaMinutes !== null) parts.push(t('map.eta', { minutes: e.etaMinutes }))
  if (e.locationStale && e.locationAt) parts.push(t('map.lastSeen', { time: formatRelative(e.locationAt, lang) }))
  return parts.join(' · ')
}

function ExecutorRow({ e, job, active, onFocus }: { e: TeamMapExecutor; job: TeamMapJob | undefined; active: boolean; onFocus: () => void }) {
  const { t } = useTranslation('insights')
  const { lang, pick } = useLang()
  const hasLocation = e.latitude !== null && e.longitude !== null
  return (
    <li>
      <button type="button" onClick={onFocus} disabled={!hasLocation} className={cn('flex w-full items-start gap-3 px-4 py-2.5 text-start hover:bg-muted/60 disabled:cursor-default', active && 'bg-primary-soft/40')}>
        <span
          className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white', e.locationStale && 'opacity-50')}
          style={{ background: availabilityColor(e.availability, e.isOffNow) }}
          aria-hidden
        >
          {initialOf(e.fullName)}
        </span>
        <span className="min-w-0 flex-1 text-sm">
          <span className="flex flex-wrap items-center gap-1.5 font-medium">
            {e.fullName}
            {e.isOffNow ? <Badge tone="muted">{t('map.offNow')}</Badge> : <StatusBadge enum="ExecutorAvailability" value={e.availability} />}
          </span>
          <span className="block text-xs text-muted-foreground">
            {t('map.activeJobs', { count: e.activeJobs })}
            {job && ` · ${job.itemNumber ?? pick(job.serviceNameAr, job.serviceNameEn)}`}
          </span>
          {e.etaMinutes !== null && (
            <span className="block text-xs text-tone-info" title={t('map.etaHint')}>
              {t('map.eta', { minutes: e.etaMinutes })}
            </span>
          )}
          {!hasLocation ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPinOff className="size-3" /> {t('map.noLocation')}
            </span>
          ) : e.locationStale && e.locationAt ? (
            <span className="block text-xs text-muted-foreground">{t('map.lastSeen', { time: formatRelative(e.locationAt, lang) })}</span>
          ) : null}
        </span>
      </button>
    </li>
  )
}

function JobRow({ j, active, onFocus }: { j: TeamMapJob; active: boolean; onFocus: () => void }) {
  const { t } = useTranslation('insights')
  const { pick } = useLang()
  return (
    <li className={cn('flex items-start gap-2 px-4 py-2.5 text-sm', active && 'bg-primary-soft/40')}>
      <button type="button" onClick={onFocus} disabled={j.latitude === null} className="mt-1 size-3 shrink-0 rounded-full disabled:opacity-40" style={{ background: jobColor(j) }} aria-label={pick(j.serviceNameAr, j.serviceNameEn)} />
      <div className="min-w-0 flex-1">
        <Link to={`/work/${j.serviceItemId}`} className="font-medium hover:underline">
          {pick(j.serviceNameAr, j.serviceNameEn)}
        </Link>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {j.itemNumber && (
            <span dir="ltr" className="font-mono">
              {j.itemNumber}
            </span>
          )}
          {j.district && <span>· {j.district}</span>}
          {j.scheduledStart && <span className="tabular">· {formatTime(j.scheduledStart)}</span>}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <StatusBadge enum="ServiceItemStatus" value={j.status} />
          {j.isLate && (
            <Badge tone="danger">
              <AlertTriangle className="size-3" /> {t('map.late')}
            </Badge>
          )}
          {j.executorName ? <span className="text-xs">{j.executorName}</span> : <Badge tone="info">{t('map.unassigned')}</Badge>}
        </div>
      </div>
    </li>
  )
}

function Legend() {
  const { t } = useTranslation('insights')
  const items = [
    { color: availabilityColor('Available', false), label: t('map.legend.available'), round: true },
    { color: availabilityColor('Busy', false), label: t('map.legend.busy'), round: true },
    { color: availabilityColor('Offline', true), label: t('map.legend.off'), round: true },
    { color: JOB_COLORS.normal, label: t('map.legend.job') },
    { color: JOB_COLORS.late, label: t('map.legend.late') },
    { color: JOB_COLORS.unassigned, label: t('map.legend.unassigned') },
  ]
  return (
    <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className={cn('size-2.5', i.round ? 'rounded-full ring-1 ring-white' : 'rounded-full opacity-80')} style={{ background: i.color }} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  )
}
