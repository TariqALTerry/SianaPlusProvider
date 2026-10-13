import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Inbox, ListChecks, RefreshCw, Star, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useProvider } from '@/app/provider'
import { ErrorState } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toneDot } from '@/components/ui/badge'
import { StatusBadge } from '@/components/StatusBadge'
import { useLang } from '@/hooks/useLang'
import { usePollingInterval } from '@/hooks/usePageVisible'
import { enumLabel, enumTone } from '@/i18n/enums'
import { formatNumber, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { boardQueryOptions } from '@/features/work/api'
import { loadRatio } from '@/features/work/logic'
import './i18n'
import { homeApi, homeKeys } from './api'
import { activeDistribution, workHrefForStatus } from './logic'

/** `/` once the organization is Approved/Trial (§8.2). The shell's banner covers trial/operational state. */
export function HomePage() {
  const { t } = useTranslation('home')
  const { lang, pick, isRtl } = useLang()
  const { org } = useProvider()
  const interval = usePollingInterval(60_000)
  const Forward = isRtl ? ArrowLeft : ArrowRight

  const dashboard = useQuery({
    queryKey: homeKeys.dashboard(),
    queryFn: ({ signal }) => homeApi.dashboard(signal),
    refetchInterval: interval,
    refetchOnWindowFocus: true,
  })
  const board = useQuery({ ...boardQueryOptions, refetchInterval: interval })

  const d = dashboard.data
  const segments = d ? activeDistribution(d.itemsByStatus) : []
  const today = board.data?.todaySchedule ?? []

  return (
    <div className="space-y-4">
      <section className="hero-gradient relative overflow-hidden rounded-2xl p-5 text-white shadow-sm sm:p-6">
        <div className="brand-pattern pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold sm:text-2xl">{t('greeting', { name: org.displayName })}</h1>
            <p className="mt-1 text-sm text-white/75">{t('subtitle')}</p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            {d ? <p className="text-sm font-medium">{t('pendingCta', { count: d.pendingAssignments })}</p> : <Skeleton className="h-4 w-40 bg-white/20" />}
            <Button asChild size="sm" className="bg-brand-yellow text-brand-deep hover:bg-brand-yellow/90">
              <Link to="/incoming">
                <Inbox /> {t('openIncoming')} <Forward />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {dashboard.isError ? (
        <Card>
          <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <Kpi to="/incoming" icon={Inbox} label={t('kpi.pending')} loading={!d} highlight={!!d && d.pendingAssignments > 0}>
            <BigNum value={d?.pendingAssignments} />
          </Kpi>
          <Kpi to="/work?tab=inProgress" icon={ListChecks} label={t('kpi.active')} loading={!d}>
            {d && (
              <>
                <BigNum value={d.activeItems} />
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="meter" aria-valuemin={0} aria-valuemax={d.capacity} aria-valuenow={d.activeItems} aria-label={t('kpi.active')}>
                    <div
                      className={cn('h-full rounded-full', d.activeItems >= d.capacity ? 'bg-tone-danger' : loadRatio(d.activeItems, d.capacity) > 0.75 ? 'bg-tone-waiting' : 'bg-brand-teal')}
                      style={{ width: `${loadRatio(d.activeItems, d.capacity) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{d.capacity > 0 ? t('kpi.activeOf', { capacity: formatNumber(d.capacity, lang) }) : t('kpi.noCapacity')}</p>
                </div>
              </>
            )}
          </Kpi>
          <Kpi to="/board" icon={CalendarDays} label={t('kpi.today')} loading={!d}>
            <BigNum value={d?.todayScheduledItems} />
          </Kpi>
          <Kpi to="/team" icon={Users} label={t('kpi.executors')} loading={!d}>
            <BigNum value={d?.activeExecutors} />
          </Kpi>
          <Kpi to="/reviews" icon={Star} label={t('kpi.rating')} loading={!d}>
            {d && (
              <>
                <p className="flex items-center gap-1 text-2xl font-bold">
                  <Star className="size-5 fill-amber-400 text-amber-400" aria-hidden />
                  <span className="tabular">{d.ratingsCount > 0 ? formatNumber(d.averageRating, lang, 1) : '—'}</span>
                </p>
                <p className="text-xs text-muted-foreground">{d.ratingsCount > 0 ? t('kpi.ratingsCount', { count: d.ratingsCount }) : t('kpi.noRatings')}</p>
              </>
            )}
          </Kpi>
          <Kpi to="/work?tab=finished" icon={CheckCircle2} label={t('kpi.completed')} loading={!d}>
            <BigNum value={d?.completedItemsCount} />
          </Kpi>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title={t('distribution.title')}
            description={t('distribution.hint')}
            actions={
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <RefreshCw className={dashboard.isFetching ? 'size-3 animate-spin' : 'size-3'} aria-hidden /> {t('live')}
              </span>
            }
          />
          <CardBody>
            {!d ? (
              <Skeleton className="h-16" />
            ) : segments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t('distribution.empty')}</p>
            ) : (
              <>
                <div className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full">
                  {segments.map((s) => (
                    <Link
                      key={s.status}
                      to={workHrefForStatus(s.status)}
                      title={`${enumLabel('ServiceItemStatus', s.status, lang)}: ${s.count}`}
                      aria-label={`${enumLabel('ServiceItemStatus', s.status, lang)}: ${s.count}`}
                      className={cn('h-full min-w-[6px] transition-opacity hover:opacity-80', toneDot[enumTone('ServiceItemStatus', s.status)])}
                      style={{ flexGrow: s.count, flexBasis: 0 }}
                    />
                  ))}
                </div>
                <ul className="mt-4 grid gap-1 sm:grid-cols-2">
                  {segments.map((s) => (
                    <li key={s.status}>
                      <Link to={workHrefForStatus(s.status)} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className={cn('size-2.5 shrink-0 rounded-full', toneDot[enumTone('ServiceItemStatus', s.status)])} aria-hidden />
                          <span className="truncate">{enumLabel('ServiceItemStatus', s.status, lang)}</span>
                        </span>
                        <span className="tabular font-medium">{formatNumber(s.count, lang)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title={t('today.title')}
            actions={
              <Button asChild variant="link" size="xs">
                <Link to="/board">{t('today.viewBoard')}</Link>
              </Button>
            }
          />
          <CardBody className="p-0">
            {board.isPending ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : board.isError ? (
              <ErrorState error={board.error} onRetry={() => void board.refetch()} compact />
            ) : today.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('today.empty')}</p>
            ) : (
              <ul className="max-h-96 divide-y overflow-y-auto">
                {today.map((s) => (
                  <li key={s.id}>
                    <Link to={`/work/${s.id}`} className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/50">
                      <span className="tabular ltr-nums w-12 shrink-0 pt-0.5 text-sm font-semibold">{formatTime(s.scheduledStart)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{pick(s.serviceNameAr, s.serviceNameEn)}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {s.executor?.fullName ?? t('today.unassigned')}
                          {(s.district || s.city) && ` · ${s.district ?? s.city}`}
                        </span>
                      </span>
                      <StatusBadge enum="ServiceItemStatus" value={s.status} className="hidden shrink-0 sm:inline-flex" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function BigNum({ value }: { value: number | undefined }) {
  const { lang } = useLang()
  return <p className="tabular text-2xl font-bold">{value === undefined ? '—' : formatNumber(value, lang)}</p>
}

function Kpi({
  to,
  icon: Icon,
  label,
  loading,
  highlight,
  children,
}: {
  to: string
  icon: typeof Inbox
  label: string
  loading: boolean
  highlight?: boolean
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      className={cn(
        'flex flex-col rounded-xl border bg-surface p-4 shadow-sm transition-colors hover:border-primary/40',
        highlight && 'border-tone-waiting/50 bg-tone-waiting-soft',
      )}
    >
      <span className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className={cn('size-4 shrink-0', highlight ? 'text-tone-waiting' : 'text-primary')} aria-hidden />
        {label}
      </span>
      {loading ? <Skeleton className="h-8 w-16" /> : children}
    </Link>
  )
}
