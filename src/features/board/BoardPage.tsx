import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Inbox, ListChecks, RefreshCw, Star, UserX } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState, PageSkeleton } from '@/components/States'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Tooltip } from '@/components/ui/menu'
import type { ProviderWorkBoardResponse, ScheduledItemResponse } from '@/api/types'
import { useLang } from '@/hooks/useLang'
import { usePollingInterval } from '@/hooks/usePageVisible'
import { enumLabel, enumTone, type Tone } from '@/i18n/enums'
import { formatNumber, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { boardQueryOptions } from '@/features/work/api'
import { Avatar, LoadBar } from '@/features/work/components/widgets'
import './i18n'
import { ExecutorItemsSheet } from './components/ExecutorItemsSheet'
import { blockPosition, boardLanes, boardWindow, nowPosition, type BoardWindow } from './logic'

const blockTone: Record<Tone, string> = {
  neutral: 'border-tone-neutral/40 bg-tone-neutral-soft text-tone-neutral',
  info: 'border-tone-info/40 bg-tone-info-soft text-tone-info',
  waiting: 'border-tone-waiting/40 bg-tone-waiting-soft text-tone-waiting',
  active: 'border-tone-active/40 bg-tone-active-soft text-tone-active',
  attention: 'border-tone-attention/40 bg-tone-attention-soft text-tone-attention',
  success: 'border-tone-success/40 bg-tone-success-soft text-tone-success',
  danger: 'border-tone-danger/40 bg-tone-danger-soft text-tone-danger',
  muted: 'border-tone-muted/40 bg-tone-muted-soft text-tone-muted',
}

/** `/board` (§8.6): today's timeline per technician and the team's load, polled every 60 s. */
export function BoardPage() {
  const { t } = useTranslation('board')
  const { lang } = useLang()
  const interval = usePollingInterval(60_000)
  const [params, setParams] = useSearchParams()
  const query = useQuery({ ...boardQueryOptions, refetchInterval: interval, refetchOnWindowFocus: true })

  if (query.isPending) return <PageSkeleton />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  const board = query.data

  // `?executor=<id>` opens that technician's items drawer (shareable, survives Back).
  const openId = params.get('executor')
  const openExecutor = board.executors.find((e) => e.executorId === openId) ?? null
  const setOpen = (id: string | null) => {
    const next = new URLSearchParams(params)
    if (id) next.set('executor', id)
    else next.delete('executor')
    setParams(next, { replace: !id })
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <RefreshCw className={query.isFetching ? 'size-3 animate-spin' : 'size-3'} aria-hidden />
            {t('generatedAt', { time: formatTime(board.generatedAt) })}
          </span>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat to="/incoming" icon={Inbox} label={t('kpi.incoming')} value={formatNumber(board.incomingCount, lang)} highlight={board.incomingCount > 0} />
        <Stat
          to="/work?tab=inProgress"
          icon={ListChecks}
          label={t('kpi.active')}
          value={formatNumber(board.activeItems, lang)}
          extra={<LoadBar used={board.activeItems} total={board.capacity} />}
        />
        <Stat icon={CalendarDays} label={t('kpi.today')} value={formatNumber(board.todaySchedule.length, lang)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
        <TodayTimeline board={board} />
        <ExecutorsPanel board={board} onOpen={(id) => setOpen(id)} />
      </div>

      <ExecutorItemsSheet executor={openExecutor} onClose={() => setOpen(null)} />
    </>
  )
}

function Stat({
  to,
  icon: Icon,
  label,
  value,
  extra,
  highlight,
}: {
  to?: string
  icon: typeof Inbox
  label: string
  value: string
  extra?: ReactNode
  highlight?: boolean
}) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className={cn('size-4', highlight ? 'text-tone-waiting' : 'text-primary')} aria-hidden /> {label}
      </span>
      <span className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <span className="tabular text-2xl font-bold">{value}</span>
        {extra}
      </span>
    </>
  )
  const cls = cn('flex flex-col rounded-xl border bg-surface p-4 shadow-sm', highlight && 'border-tone-waiting/50 bg-tone-waiting-soft', to && 'transition-colors hover:border-primary/40')
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

/** Ticks once a minute so the "now" line moves. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}

function TodayTimeline({ board }: { board: ProviderWorkBoardResponse }) {
  const { t } = useTranslation('board')
  const now = useNow()
  const items = board.todaySchedule
  const w = boardWindow(items)
  const lanes = boardLanes(board.executors, items)
  const hours = Array.from({ length: w.endHour - w.startHour + 1 }, (_, i) => w.startHour + i)
  const nowAt = nowPosition(w, now)
  const at = (h: number) => ((h - w.startHour) / (w.endHour - w.startHour)) * 100

  return (
    <Card className="min-w-0">
      <CardHeader title={t('timeline.title')} />
      <CardBody className="p-0">
        {items.length === 0 && <p className="border-b px-4 py-3 text-sm text-muted-foreground">{t('timeline.empty')}</p>}
        <div className="overflow-x-auto">
          <div className="min-w-[44rem]">
            {/* Hour axis */}
            <div className="flex border-b">
              <div className="w-40 shrink-0" />
              <div className="relative h-7 flex-1">
                {hours.map((h) => (
                  <span key={h} className="tabular ltr-nums absolute top-1.5 -translate-x-1/2 text-[0.6875rem] text-muted-foreground rtl:translate-x-1/2" style={{ insetInlineStart: `${at(h)}%` }}>
                    {String(h).padStart(2, '0')}:00
                  </span>
                ))}
              </div>
            </div>
            <ul>
              {lanes.map((lane) => (
                <li key={lane.key} className={cn('flex border-b last:border-b-0', !lane.executor && lane.key === 'unassigned' && 'bg-tone-waiting-soft/40')}>
                  <div className="flex w-40 shrink-0 items-center gap-2 border-e px-3 py-2">
                    {lane.key === 'unassigned' ? (
                      <>
                        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-tone-waiting-soft text-tone-waiting" aria-hidden>
                          <UserX className="size-3.5" />
                        </span>
                        <span className="truncate text-sm font-medium">{t('timeline.unassigned')}</span>
                      </>
                    ) : (
                      <>
                        <Avatar name={lane.name} className="size-7 text-[0.625rem]" muted={lane.executor ? !lane.executor.isActive : false} />
                        <span className="truncate text-sm">{lane.name}</span>
                      </>
                    )}
                  </div>
                  <Track window={w} items={lane.items} hours={hours} at={at} nowAt={nowAt} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function Track({ window: w, items, hours, at, nowAt }: { window: BoardWindow; items: ScheduledItemResponse[]; hours: number[]; at: (h: number) => number; nowAt: number | null }) {
  const { t } = useTranslation('board')
  const { lang, pick } = useLang()
  return (
    <div className="relative min-h-12 flex-1">
      {hours.map((h) => (
        <span key={h} className="absolute inset-y-0 w-px bg-border/70" style={{ insetInlineStart: `${at(h)}%` }} aria-hidden />
      ))}
      {nowAt !== null && <span className="absolute inset-y-0 z-10 w-0.5 bg-destructive/70" style={{ insetInlineStart: `${nowAt}%` }} title={t('timeline.now')} aria-hidden />}
      {items.map((item) => {
        const pos = blockPosition(item, w)
        if (!pos) return null
        const service = pick(item.serviceNameAr, item.serviceNameEn)
        const time = `${formatTime(item.scheduledStart)}${item.scheduledEnd ? `–${formatTime(item.scheduledEnd)}` : ''}`
        return (
          <Tooltip
            key={item.id}
            content={
              <span className="block space-y-0.5">
                <span className="block font-medium">{service}</span>
                <span className="block">{enumLabel('ServiceItemStatus', item.status, lang)}</span>
                <span className="ltr-nums block">{time}</span>
                {(item.district || item.city) && <span className="block">{[item.district, item.city].filter(Boolean).join('، ')}</span>}
              </span>
            }
          >
            <Link
              to={`/work/${item.id}`}
              className={cn('absolute inset-y-1.5 z-20 overflow-hidden rounded-md border px-1.5 py-0.5 text-[0.6875rem] leading-tight hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring', blockTone[enumTone('ServiceItemStatus', item.status)])}
              style={{ insetInlineStart: `${pos.start}%`, width: `${pos.width}%` }}
              aria-label={`${service} — ${time}`}
            >
              <span className="block truncate font-medium">{service}</span>
              <span className="tabular ltr-nums block truncate opacity-80">{time}</span>
            </Link>
          </Tooltip>
        )
      })}
    </div>
  )
}

function ExecutorsPanel({ board, onOpen }: { board: ProviderWorkBoardResponse; onOpen: (id: string) => void }) {
  const { t } = useTranslation('board')
  const { lang } = useLang()
  const executors = [...board.executors].sort((a, b) => Number(b.isActive) - Number(a.isActive))
  return (
    <Card className="min-w-0">
      <CardHeader
        title={t('executors.title')}
        actions={
          <Button asChild variant="link" size="xs">
            <Link to="/team">{t('executors.manageTeam')}</Link>
          </Button>
        }
      />
      {executors.length === 0 ? (
        <CardBody>
          <p className="py-6 text-center text-sm text-muted-foreground">{t('executors.empty')}</p>
        </CardBody>
      ) : (
        <ul className="max-h-[32rem] divide-y overflow-y-auto">
          {executors.map((e) => (
            <li key={e.executorId} className={cn('flex items-center gap-3 px-4 py-3', !e.isActive && 'opacity-60')}>
              <Avatar name={e.fullName} muted={!e.isActive} />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{e.fullName}</span>
                  {!e.isActive && <Badge tone="muted">{t('executors.inactive')}</Badge>}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <StatusBadge enum="ExecutorAvailability" value={e.availability} />
                  <LoadBar used={e.activeJobs} total={e.maxConcurrentJobs} />
                  {e.averageRating > 0 && (
                    <span className="tabular inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden />
                      {formatNumber(e.averageRating, lang, 1)}
                    </span>
                  )}
                </div>
              </div>
              <Button variant="outline" size="xs" onClick={() => onOpen(e.executorId)}>
                {t('executors.items')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
