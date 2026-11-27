import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, MapPinOff, Navigation, Route as RouteIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { LazyMap } from '@/components/map/LazyMap'
import { EmptyState, ErrorState } from '@/components/States'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useLang } from '@/hooks/useLang'
import { formatDuration, formatNumber, formatTime, nowRiyadh } from '@/lib/format'
import { cn } from '@/lib/utils'
import { teamApi, teamKeys } from '../api'
import { lateCount, routeLegs, routePins } from '../route'

/** «مسار اليوم» on a technician's page: the day's visits in the shortest order, on a map and as a list. Read only. */
export function RouteCard({ executorId }: { executorId: string }) {
  const { t } = useTranslation('team')
  const { lang, pick } = useLang()
  const [date, setDate] = useState(() => nowRiyadh().format('YYYY-MM-DD'))
  const query = useQuery({ queryKey: teamKeys.route(executorId, date), queryFn: ({ signal }) => teamApi.route(executorId, date, signal) })
  const r = query.data
  const late = r ? lateCount(r) : 0

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <RouteIcon className="size-4 text-muted-foreground" /> {t('route.title')}
          </span>
        }
        description={t('route.hint')}
        actions={<Input type="date" className="w-40" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label={t('route.title')} />}
      />
      <CardBody>
        {query.isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : r!.stops.length === 0 ? (
          <EmptyState icon={<RouteIcon className="size-5" />} title={t('route.empty')} />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <Badge tone="info">
                <Navigation className="size-3" /> {t(`route.start.${r!.startSource}`, { defaultValue: r!.startSource })}
              </Badge>
              <span className="tabular font-medium">{t('route.total', { km: formatNumber(r!.totalKm, lang, 1), minutes: formatDuration(r!.totalDriveMinutes, lang) })}</span>
              {r!.savedKm > 0 && <Badge tone="success">{t('route.saved', { km: formatNumber(r!.savedKm, lang, 1) })}</Badge>}
              {late > 0 && (
                <Badge tone="danger">
                  <AlertTriangle className="size-3" /> {t('route.lateRisk', { count: late })}
                </Badge>
              )}
              {r!.withoutLocation > 0 && (
                <Badge tone="muted">
                  <MapPinOff className="size-3" /> {t('route.noPin', { count: r!.withoutLocation })}
                </Badge>
              )}
            </div>
            <div className="grid gap-4 lg:grid-cols-5">
              <LazyMap
                className="h-72 lg:col-span-2"
                fitOnce
                markers={[
                  ...(r!.startLatitude != null && r!.startLongitude != null
                    ? [{ id: 'start', lat: r!.startLatitude, lng: r!.startLongitude, variant: 'executor' as const, color: 'hsl(var(--tone-info))' }]
                    : []),
                  ...routePins(r!).map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, text: p.text, color: p.lateRisk ? 'hsl(var(--tone-danger))' : 'hsl(var(--primary))' })),
                ]}
                lines={routeLegs(r!)}
              />
              <div className="overflow-x-auto lg:col-span-3">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th className="px-2 py-2 text-start font-normal">{t('route.col.order')}</th>
                      <th className="px-2 py-2 text-start font-normal">{t('route.col.service')}</th>
                      <th className="px-2 py-2 text-start font-normal">{t('route.col.window')}</th>
                      <th className="px-2 py-2 text-start font-normal">{t('route.col.arrival')}</th>
                      <th className="px-2 py-2 text-start font-normal">{t('route.col.drive')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r!.stops.map((s) => (
                      <tr key={s.serviceItemId} className={cn('border-b last:border-0', s.lateRisk && 'bg-tone-danger-soft/50')}>
                        <td className="px-2 py-2">
                          <span className={cn('flex size-6 items-center justify-center rounded-full text-xs font-semibold text-white', s.lateRisk ? 'bg-tone-danger' : 'bg-primary')}>{s.order}</span>
                        </td>
                        <td className="px-2 py-2">
                          <Link to={`/work/${s.serviceItemId}`} className="font-medium hover:underline">
                            {pick(s.serviceNameAr, s.serviceNameEn)}
                          </Link>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{s.district ?? s.city ?? '—'}</span>
                            <StatusBadge enum="ServiceItemStatus" value={s.status} />
                          </div>
                        </td>
                        <td className="tabular px-2 py-2 whitespace-nowrap text-xs" dir="ltr">
                          {s.windowStart ? `${formatTime(s.windowStart)}–${formatTime(s.windowEnd)}` : '—'}
                        </td>
                        <td className="tabular px-2 py-2 whitespace-nowrap">
                          <span dir="ltr">{s.estimatedArrival ? formatTime(s.estimatedArrival) : '—'}</span>
                          {s.lateRisk && <div className="text-xs font-medium text-tone-danger">{t('route.late')}</div>}
                        </td>
                        <td className="tabular px-2 py-2 whitespace-nowrap text-xs text-muted-foreground">
                          {s.driveKm != null ? t('route.km', { km: formatNumber(s.driveKm, lang, 1) }) : '—'}
                          {s.driveMinutes != null && <div>{formatDuration(s.driveMinutes, lang)}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  )
}
