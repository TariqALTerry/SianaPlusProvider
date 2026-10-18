import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CalendarPlus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import type { ExecutorScheduleResponse, ExecutorTimeOffReason, TimeOffResponse } from '@/api/types'
import { ExecutorTimeOffReasonValues } from '@/api/types'
import { toApiError } from '@/api/http'
import { ActionDialog, ConfirmDialog } from '@/components/ActionDialog'
import { DateTime, Money } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { PhoneText } from '@/components/PhoneText'
import { StatusBadge } from '@/components/StatusBadge'
import { EmptyState, ErrorState, InlineError } from '@/components/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Switch } from '@/components/ui/checkbox'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Field, Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { insightKeys, insightsApi } from '@/features/insights/api'
import { perfFlags, presetRange } from '@/features/insights/logic'
import '@/features/insights/i18n'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { enumLabel } from '@/i18n/enums'
import { formatDuration, formatNumber, formatPercent, riyadhDateToIso, riyadhInputToIso } from '@/lib/format'
import { cn } from '@/lib/utils'
import { teamApi, teamKeys } from './api'
import { RoleBadges } from './components/Bits'
import { RolesCard } from './components/RolesCard'
import { defaultWeek, invalidDays, toEntries, toRows, type DayRow } from './schedule'
import './i18n'

/**
 * `/team/:executorId` (PROVIDER-PLATFORM-PHASE2-PROMPT §4, §5): the technician's numbers as cards and
 * their schedule — weekly working hours (Riyadh time) and time off.
 */
export function ExecutorPage() {
  const { t } = useTranslation('team')
  const { executorId = '' } = useParams()
  const executor = useQuery({ queryKey: teamKeys.executor(executorId), queryFn: ({ signal }) => teamApi.executor(executorId, signal) })
  const schedule = useQuery({ queryKey: teamKeys.schedule(executorId), queryFn: ({ signal }) => teamApi.schedule(executorId, signal) })
  const e = executor.data

  if (executor.isError && toApiError(executor.error).status === 404) {
    return (
      <>
        <PageHeader title={t('executorPage.notFound')} back={{ to: '/team', label: t('executorPage.back') }} />
        <Card>
          <EmptyState title={t('executorPage.notFound')} />
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        back={{ to: '/team', label: t('executorPage.back') }}
        title={
          e ? (
            <span className="flex flex-wrap items-center gap-2">
              {e.fullName}
              <StatusBadge enum="ExecutorAvailability" value={e.availability} />
              <RoleBadges canRepair={e.canRepair} canDeliver={e.canDeliver} />
              {schedule.data?.isOffNow && <Badge tone="muted">{t('schedule.offNow')}</Badge>}
            </span>
          ) : (
            <Skeleton className="h-7 w-48" />
          )
        }
        meta={e ? <PhoneText phone={e.phone} /> : undefined}
      />
      {executor.isError && <ErrorState error={executor.error} onRetry={() => void executor.refetch()} />}
      <div className="space-y-4">
        {e && <RolesCard executor={e} />}
        <PerformanceCards executorId={executorId} />
        <ScheduleSection executorId={executorId} query={schedule} />
      </div>
    </>
  )
}

function PerformanceCards({ executorId }: { executorId: string }) {
  const { t } = useTranslation('insights')
  const { t: tt } = useTranslation('team')
  const { lang } = useLang()
  const range = useMemo(() => presetRange(30), [])
  const params = { from: riyadhDateToIso(range.from, 'start') ?? undefined, to: riyadhDateToIso(range.to, 'end') ?? undefined }
  const query = useQuery({ queryKey: insightKeys.performance(params), queryFn: ({ signal }) => insightsApi.teamPerformance(params, signal) })
  const p = query.data?.executors.find((x) => x.executorId === executorId)
  const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : formatPercent(v, lang, 0))

  return (
    <Card>
      <CardHeader
        title={tt('executorPage.performance')}
        actions={
          <Link to="/team/performance" className="text-xs text-primary hover:underline">
            {tt('executorPage.allPerformance')}
          </Link>
        }
      />
      <CardBody>
        {query.isPending ? (
          <Skeleton className="h-20" />
        ) : query.isError ? (
          <ErrorState compact error={query.error} onRetry={() => void query.refetch()} />
        ) : !p ? (
          <p className="text-sm text-muted-foreground">{t('perf.empty')}</p>
        ) : (
          (() => {
            const f = perfFlags(p)
            const cards: Array<[string, React.ReactNode, string | undefined, boolean?]> = [
              [t('perf.completed'), formatNumber(p.completed, lang), undefined],
              [t('perf.rating'), p.averageRating === null ? '—' : formatNumber(p.averageRating, lang, 1), p.ratingsCount ? t('perf.ratings', { count: p.ratingsCount }) : undefined, !!f.rating],
              [t('perf.onTime'), pct(p.onTimeRate), p.scheduledArrivals ? t('perf.arrivals', { count: p.scheduledArrivals }) : undefined, !!f.onTime],
              [t('perf.acceptance'), pct(p.acceptanceRate), p.assignmentsOffered ? t('perf.offered', { rejected: p.assignmentsRejected, offered: p.assignmentsOffered }) : undefined],
              [t('perf.workTime'), p.averageWorkMinutes === null ? '—' : formatDuration(p.averageWorkMinutes, lang), undefined],
              [t('perf.warranty'), formatNumber(p.warrantyClaims, lang), undefined, !!f.warranty],
              [t('perf.disputes'), formatNumber(p.disputes, lang), undefined],
              [t('perf.cancelled'), formatNumber(p.cancelledAfterAssignment, lang), undefined],
              [t('perf.revenue'), <Money key="r" value={p.revenue} />, undefined],
            ]
            return (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {cards.map(([label, value, sub, flagged]) => (
                  <div key={label} className={cn('rounded-lg border p-3', flagged && 'border-tone-danger/40 bg-tone-danger-soft/40')}>
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className={cn('tabular mt-1 text-lg font-semibold', flagged && 'text-tone-danger')}>{value}</div>
                    {sub && <div className="text-[0.6875rem] text-muted-foreground">{sub}</div>}
                  </div>
                ))}
              </div>
            )
          })()
        )}
      </CardBody>
    </Card>
  )
}

function ScheduleSection({ executorId, query }: { executorId: string; query: ReturnType<typeof useQuery<ExecutorScheduleResponse>> }) {
  const { t } = useTranslation('team')
  if (query.isPending) return <Skeleton className="h-72" />
  if (query.isError)
    return (
      <Card>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </Card>
    )
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{t('schedule.effect')}</p>
      <WorkingHoursCard executorId={executorId} schedule={query.data} />
      <TimeOffCard executorId={executorId} schedule={query.data} />
    </div>
  )
}

function WorkingHoursCard({ executorId, schedule }: { executorId: string; schedule: ExecutorScheduleResponse }) {
  const { t } = useTranslation('team')
  const { lang } = useLang()
  const unrestricted = schedule.workingHours.length === 0
  const [rows, setRows] = useState<DayRow[]>(() => toRows(schedule.workingHours))
  const [editing, setEditing] = useState(!unrestricted)

  useEffect(() => {
    setRows(toRows(schedule.workingHours))
    setEditing(schedule.workingHours.length > 0)
  }, [schedule.workingHours])

  const save = useAction({
    mutationFn: (days: ReturnType<typeof toEntries>) => teamApi.saveWorkingHours(executorId, days),
    invalidate: [teamKeys.schedule(executorId)],
    success: t('schedule.hoursSaved'),
  })
  const bad = invalidDays(rows)
  const setRow = (i: number, patch: Partial<DayRow>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)))

  return (
    <Card>
      <CardHeader title={t('schedule.hours')} />
      <CardBody className="space-y-3">
        {!editing ? (
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="info">{t('schedule.noRestriction')}</Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setRows(defaultWeek())
                setEditing(true)
              }}
            >
              {t('schedule.setHours')}
            </Button>
          </div>
        ) : (
          <>
            <ul className="divide-y rounded-md border">
              {rows.map((r, i) => (
                <li key={r.day} className="flex flex-wrap items-center gap-3 px-3 py-2" data-day={r.day}>
                  <span className="w-20 text-sm font-medium">{enumLabel('DayOfWeek', r.day, lang)}</span>
                  <div className="flex items-center gap-2">
                    <Switch id={`works-${r.day}`} checked={r.works} onCheckedChange={(v) => setRow(i, { works: v })} />
                    <Label htmlFor={`works-${r.day}`} className="cursor-pointer text-xs">
                      {r.works ? t('schedule.works') : t('schedule.dayOff')}
                    </Label>
                  </div>
                  {r.works && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">{t('schedule.from')}</span>
                      <Input type="time" dir="ltr" value={r.start} onChange={(e) => setRow(i, { start: e.target.value })} className="h-8 w-28" aria-label={`${t('schedule.from')} ${r.day}`} />
                      <span className="text-muted-foreground">{t('schedule.to')}</span>
                      <Input type="time" dir="ltr" value={r.end} onChange={(e) => setRow(i, { end: e.target.value })} className="h-8 w-28" aria-label={`${t('schedule.to')} ${r.day}`} />
                    </div>
                  )}
                  {bad.includes(r.day) && <span className="text-xs text-tone-danger">{t('schedule.invalidDay')}</span>}
                </li>
              ))}
            </ul>
            <InlineError error={save.error} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" loading={save.isPending} disabled={bad.length > 0} onClick={() => save.mutate(toEntries(rows))}>
                {t('schedule.saveHours')}
              </Button>
              {!unrestricted ? (
                <Button size="sm" variant="ghost" disabled={save.isPending} onClick={() => save.mutate([])}>
                  {t('schedule.clearHours')}
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  {t('schedule.noRestriction')}
                </Button>
              )}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  )
}

function TimeOffCard({ executorId, schedule }: { executorId: string; schedule: ExecutorScheduleResponse }) {
  const { t } = useTranslation('team')
  const { lang } = useLang()
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<TimeOffResponse | null>(null)
  const remove = useAction({
    mutationFn: (id: string) => teamApi.removeTimeOff(executorId, id),
    invalidate: [teamKeys.schedule(executorId)],
    success: t('schedule.timeOffDeleted'),
    onSuccess: () => setDeleting(null),
  })

  return (
    <Card>
      <CardHeader
        title={t('schedule.timeOff')}
        actions={
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <CalendarPlus /> {t('schedule.addTimeOff')}
          </Button>
        }
      />
      <CardBody>
        {schedule.timeOff.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('schedule.noTimeOff')}</p>
        ) : (
          <ul className="divide-y">
            {schedule.timeOff.map((o) => (
              <li key={o.id} className="flex flex-wrap items-start gap-3 py-2.5" data-time-off={o.id}>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge enum="ExecutorTimeOffReason" value={o.reason} />
                    <span className="tabular text-xs">
                      <DateTime value={o.startsAt} mode="absolute" /> – <DateTime value={o.endsAt} mode="absolute" />
                    </span>
                  </div>
                  {o.note && (
                    <p className="mt-0.5 text-xs text-muted-foreground" dir="auto">
                      {o.note}
                    </p>
                  )}
                  {o.conflictingJobs > 0 && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-tone-attention">
                      <AlertTriangle className="size-3.5" /> {t('schedule.conflicts', { count: o.conflictingJobs, formattedCount: formatNumber(o.conflictingJobs, lang) })}
                    </p>
                  )}
                </div>
                <Button size="icon-sm" variant="ghost" className="text-tone-danger" onClick={() => setDeleting(o)} aria-label={t('schedule.deleteTimeOff')} title={t('schedule.deleteTimeOff')}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
      <TimeOffDialog executorId={executorId} open={adding} onOpenChange={setAdding} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t('schedule.deleteTimeOff')}
        description={t('schedule.deleteTimeOffConfirm')}
        confirmLabel={t('schedule.deleteTimeOff')}
        destructive
        submitting={remove.isPending}
        error={remove.error}
        onSubmit={() => deleting && remove.mutate(deleting.id)}
      />
    </Card>
  )
}

function TimeOffDialog({ executorId, open, onOpenChange }: { executorId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation('team')
  const { lang } = useLang()
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [reason, setReason] = useState<ExecutorTimeOffReason>('Leave')
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    setStartsAt('')
    setEndsAt('')
    setReason('Leave')
    setNote('')
    setTouched(false)
  }, [open])

  const add = useAction({
    mutationFn: () => teamApi.addTimeOff(executorId, { startsAt: riyadhInputToIso(startsAt)!, endsAt: riyadhInputToIso(endsAt)!, reason, note: note.trim() || null }),
    invalidate: [teamKeys.schedule(executorId)],
    success: t('schedule.timeOffAdded'),
    onSuccess: () => onOpenChange(false),
  })
  const missing = !startsAt || !endsAt
  const order = !missing && endsAt <= startsAt

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('schedule.addTimeOff')}
      confirmLabel={t('schedule.addTimeOff')}
      submitting={add.isPending}
      submitDisabled={missing}
      error={add.error}
      onSubmit={() => {
        setTouched(true)
        if (!missing && !order) add.mutate()
      }}
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('schedule.startsAt')} htmlFor="off-start" required>
            <Input id="off-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </Field>
          <Field label={t('schedule.endsAt')} htmlFor="off-end" required error={touched && order ? t('schedule.endAfterStart') : undefined}>
            <Input id="off-end" type="datetime-local" value={endsAt} min={startsAt || undefined} onChange={(e) => setEndsAt(e.target.value)} />
          </Field>
        </div>
        <Field label={t('schedule.reasonLabel')} htmlFor="off-reason">
          <Select id="off-reason" value={reason} onChange={(e) => setReason(e.target.value as ExecutorTimeOffReason)}>
            {ExecutorTimeOffReasonValues.map((r) => (
              <option key={r} value={r}>
                {enumLabel('ExecutorTimeOffReason', r, lang)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('schedule.note')} htmlFor="off-note">
          <Textarea id="off-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </ActionDialog>
  )
}

