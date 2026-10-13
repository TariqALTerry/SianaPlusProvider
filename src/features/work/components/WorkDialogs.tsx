import { useEffect, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionDialog, ConfirmDialog, ReasonDialog } from '@/components/ActionDialog'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useAction } from '@/hooks/useAction'
import type { ServiceItemStatus } from '@/api/types'
import { nowRiyadh, riyadhInputToIso } from '@/lib/format'
import { REJECT_INVALIDATION, WORK_INVALIDATION, workApi } from '../api'
import { useDelegateAction, useTargetLabel, type WorkTarget } from '../hooks'
import { defaultScheduleWindow, SCHEDULE_INPUT_FORMAT, workErrorDetail } from '../logic'
import { WorkErrorHint } from './widgets'
import '../i18n'

interface DialogProps {
  item: WorkTarget
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DelegateDialog({ item, open, onOpenChange, executorId }: DialogProps & { executorId: string | null }) {
  const { t } = useTranslation('work')
  const targetLabel = useTargetLabel()
  const action = useDelegateAction({ onDone: () => onOpenChange(false) })
  useEffect(() => {
    if (open) action.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('actions.delegate')}
      target={targetLabel(item)}
      changes={
        <span className="space-y-1">
          <span className="block">{t('actions.delegateConfirm')}</span>
          {executorId && <span className="block text-muted-foreground">{t('actions.delegateReassignNote')}</span>}
        </span>
      }
      confirmLabel={t('actions.delegate')}
      submitting={action.isPending}
      error={action.error}
      onSubmit={() => action.mutate({ id: item.id, previousExecutorId: executorId })}
    />
  )
}

/**
 * "اعتذار عن الطلب" (§8.3): a required reason (≤ 1000) → the item returns to the platform and
 * leaves the organization. Errors `ServiceItemNotRejectable`, `AssignmentNotPending` stay inline.
 */
export function RejectDialog({ item, open, onOpenChange, onRejected }: DialogProps & { onRejected?: () => void }) {
  const { t } = useTranslation('work')
  const targetLabel = useTargetLabel()
  const action = useAction({
    mutationFn: (note: string) => workApi.reject(item.id, { note }),
    invalidate: REJECT_INVALIDATION,
    success: t('actions.success.reject'),
    onSuccess: () => {
      onOpenChange(false)
      onRejected?.()
    },
  })
  useEffect(() => {
    if (open) action.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      destructive
      title={t('actions.reject')}
      target={targetLabel(item)}
      changes={t('actions.rejectChange')}
      label={t('actions.rejectLabel')}
      placeholder={t('actions.rejectPlaceholder')}
      confirmLabel={t('actions.rejectShort')}
      submitting={action.isPending}
      error={action.error}
      onSubmit={(note) => action.mutate(note)}
    />
  )
}

/** "سحب الفني": optional reason; the item returns to AssignedToProvider. */
export function UnassignDialog({ item, open, onOpenChange, executorName }: DialogProps & { executorName: string | null }) {
  const { t } = useTranslation('work')
  const targetLabel = useTargetLabel()
  const id = useId()
  const [reason, setReason] = useState('')
  const action = useAction({
    mutationFn: () => workApi.unassign(item.id, { reason: reason.trim() || null }),
    invalidate: WORK_INVALIDATION,
    success: t('actions.success.unassign'),
    onSuccess: () => onOpenChange(false),
  })
  useEffect(() => {
    if (open) {
      setReason('')
      action.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const { error, detail } = useMemo(() => workErrorDetail(action.error), [action.error])
  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      destructive
      size="sm"
      title={t('actions.unassign')}
      target={
        <span>
          {targetLabel(item)}
          {executorName && <span className="block text-xs font-normal text-muted-foreground">{executorName}</span>}
        </span>
      }
      changes={t('actions.unassignChange')}
      confirmLabel={t('actions.unassign')}
      submitting={action.isPending}
      error={error}
      onSubmit={() => action.mutate()}
    >
      <Field label={t('common:common.reason')} htmlFor={id} optional>
        <Textarea id={id} value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={1000} />
      </Field>
      <WorkErrorHint detail={detail} />
    </ActionDialog>
  )
}

/**
 * "جدولة / تغيير الموعد" (§8.4): Riyadh datetime inputs, end after start, note ≤ 500. A start
 * in the past is refused inline (client check, and the server's `ScheduleInPast` stays in the
 * dialog too).
 */
export function ScheduleDialog({
  item,
  open,
  onOpenChange,
  status,
  scheduledStart,
  scheduledEnd,
}: DialogProps & { status: ServiceItemStatus; scheduledStart: string | null; scheduledEnd: string | null }) {
  const { t } = useTranslation('work')
  const targetLabel = useTargetLabel()
  const ids = { start: useId(), end: useId(), note: useId() }
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [note, setNote] = useState('')

  const action = useAction({
    mutationFn: (body: { scheduledStart: string; scheduledEnd: string; note: string | null }) => workApi.schedule(item.id, body),
    invalidate: WORK_INVALIDATION,
    success: t('actions.success.schedule'),
    onSuccess: () => onOpenChange(false),
  })

  useEffect(() => {
    if (open) {
      const w = defaultScheduleWindow(scheduledStart, scheduledEnd)
      setStart(w.start)
      setEnd(w.end)
      setNote('')
      action.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const startIso = riyadhInputToIso(start)
  const endIso = riyadhInputToIso(end)
  const inPast = !!startIso && Date.parse(startIso) < Date.now()
  const endBeforeStart = !!startIso && !!endIso && Date.parse(endIso) <= Date.parse(startIso)
  const invalid = !startIso || !endIso || inPast || endBeforeStart || note.length > 500
  const rescheduling = !!scheduledStart

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={rescheduling ? t('schedule.titleChange') : t('schedule.title')}
      target={targetLabel(item)}
      changes={status === 'Accepted' ? t('schedule.effectAccepted') : t('schedule.effectOther')}
      confirmLabel={rescheduling ? t('actions.reschedule') : t('actions.schedule')}
      submitting={action.isPending}
      submitDisabled={invalid}
      error={action.error}
      onSubmit={() => startIso && endIso && action.mutate({ scheduledStart: startIso, scheduledEnd: endIso, note: note.trim() || null })}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('schedule.start')} htmlFor={ids.start} required hint={t('schedule.riyadhTime')} error={inPast ? t('schedule.inPast') : undefined}>
          <Input
            id={ids.start}
            type="datetime-local"
            value={start}
            min={nowRiyadh().format(SCHEDULE_INPUT_FORMAT)}
            onChange={(e) => setStart(e.target.value)}
            aria-invalid={inPast || undefined}
            className="ltr-nums"
          />
        </Field>
        <Field label={t('schedule.end')} htmlFor={ids.end} required error={endBeforeStart ? t('common:validation.endAfterStart') : undefined}>
          <Input
            id={ids.end}
            type="datetime-local"
            value={end}
            min={start || undefined}
            onChange={(e) => setEnd(e.target.value)}
            aria-invalid={endBeforeStart || undefined}
            className="ltr-nums"
          />
        </Field>
      </div>
      <Field
        label={t('schedule.note')}
        htmlFor={ids.note}
        optional
        hint={`${note.length}/500`}
        error={note.length > 500 ? t('common:validation.maxLength', { max: 500 }) : undefined}
      >
        <Textarea id={ids.note} value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder={t('schedule.notePlaceholder')} />
      </Field>
    </ActionDialog>
  )
}
