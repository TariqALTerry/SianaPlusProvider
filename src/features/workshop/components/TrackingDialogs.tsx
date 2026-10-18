import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionDialog, ConfirmDialog } from '@/components/ActionDialog'
import { DateTime } from '@/components/Format'
import { ErrorState } from '@/components/States'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import type { DeviceCustodyStage, LegResponse, ProgressUpdateKind, ServiceItemLegType, TrackedDevice } from '@/api/types'
import { workApi, workKeys } from '@/features/work/api'
import { useTargetLabel, type WorkTarget } from '@/features/work/hooks'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { enumLabel, enumOptions } from '@/i18n/enums'
import { nowRiyadh, riyadhInputToIso } from '@/lib/format'
import { cn } from '@/lib/utils'
import { TRACKING_INVALIDATION, trackingApi } from '../api'
import { useTrackingError } from '../hooks'
import { isHandover, isValidCode, normalizeCode, NOTE_MAX, noteRequired, READY_MAX_DAYS, tripCandidates, updateProblems } from '../logic'
import { ImagePicker } from './ImagePicker'
import '../i18n'

const INPUT_FORMAT = 'YYYY-MM-DDTHH:mm'

interface DialogProps {
  item: WorkTarget
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * "إرسال تحديث للعميل": kind, a note (required for Other/Delayed, ≤ 1000), the expected ready date (now..4 months,
 * Riyadh input) and an optional photo — multipart `POST …/updates`. The customer is notified at once.
 */
export function SendUpdateDialog({ item, open, onOpenChange }: DialogProps) {
  const { t } = useTranslation('workshop')
  const { lang } = useLang()
  const targetLabel = useTargetLabel()
  const ids = { kind: useId(), note: useId(), ready: useId() }
  const [kind, setKind] = useState<ProgressUpdateKind>('InspectionStarted')
  const [note, setNote] = useState('')
  const [ready, setReady] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [touched, setTouched] = useState(false)

  const action = useAction({
    mutationFn: () => trackingApi.postUpdate(item.id, { kind, note: note.trim() || null, expectedReadyAt: riyadhInputToIso(ready), file }),
    invalidate: TRACKING_INVALIDATION,
    success: t('tracking.success.update'),
    onSuccess: () => onOpenChange(false),
  })
  const error = useTrackingError(action.error, item.id)

  useEffect(() => {
    if (open) {
      setKind('InspectionStarted')
      setNote('')
      setReady('')
      setFile(null)
      setTouched(false)
      action.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const problems = updateProblems({ kind, note, expectedReadyAt: riyadhInputToIso(ready) })
  const now = nowRiyadh()

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('tracking.sendUpdate')}
      target={targetLabel(item)}
      changes={t('tracking.updateEffect')}
      confirmLabel={t('tracking.send')}
      submitting={action.isPending}
      submitDisabled={problems.length > 0}
      error={error}
      onSubmit={() => action.mutate()}
    >
      <Field label={t('tracking.kind')} htmlFor={ids.kind} required>
        <Select id={ids.kind} value={kind} onChange={(e) => setKind(e.target.value as ProgressUpdateKind)}>
          {enumOptions('ProgressUpdateKind').map((k) => (
            <option key={k} value={k}>
              {enumLabel('ProgressUpdateKind', k, lang)}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label={t('tracking.updateNote')}
        htmlFor={ids.note}
        required={noteRequired(kind)}
        optional={!noteRequired(kind)}
        hint={`${note.length}/${NOTE_MAX}`}
        error={
          problems.includes('noteTooLong')
            ? t('common:validation.maxLength', { max: NOTE_MAX })
            : touched && problems.includes('noteRequired')
              ? t('tracking.updateNoteRequired')
              : undefined
        }
      >
        <Textarea
          id={ids.note}
          dir="auto"
          rows={3}
          value={note}
          maxLength={NOTE_MAX}
          placeholder={t('tracking.updateNotePlaceholder')}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => setTouched(true)}
        />
      </Field>
      <Field
        label={t('tracking.readyAt')}
        htmlFor={ids.ready}
        optional
        hint={t('tracking.readyAtHint')}
        error={problems.includes('readyInvalid') ? t('tracking.readyInvalid') : undefined}
      >
        <Input
          id={ids.ready}
          type="datetime-local"
          value={ready}
          min={now.format(INPUT_FORMAT)}
          max={now.add(READY_MAX_DAYS, 'day').format(INPUT_FORMAT)}
          onChange={(e) => setReady(e.target.value)}
          className="ltr-nums"
        />
      </Field>
      <ImagePicker file={file} onChange={setFile} label={t('tracking.image')} />
    </ActionDialog>
  )
}

/**
 * One custody step (only the next ones are offered). A handover — collecting from the customer, or giving it
 * back — needs the customer's 4-digit code and a photo; the other steps take an optional note and photo.
 */
export function MoveDeviceDialog({
  item,
  device,
  to,
  open,
  onOpenChange,
}: DialogProps & { device: TrackedDevice; to: DeviceCustodyStage | null }) {
  const { t } = useTranslation('workshop')
  const { lang } = useLang()
  const targetLabel = useTargetLabel()
  const ids = { code: useId(), note: useId() }
  const [code, setCode] = useState('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const handover = !!to && isHandover(to)

  const action = useAction({
    mutationFn: (stage: DeviceCustodyStage) =>
      trackingApi.moveDevice(item.id, device.deviceId, { stage, code: handover ? code : null, note: note.trim() || null, file }),
    invalidate: TRACKING_INVALIDATION,
    success: t('tracking.success.move'),
    onSuccess: () => onOpenChange(false),
  })
  const error = useTrackingError(action.error, item.id)

  useEffect(() => {
    if (open) {
      setCode('')
      setNote('')
      setFile(null)
      action.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!to) return null
  const noteKey = to === 'Returned' && device.stage === 'ReadyForReturn' ? 'ReturnedDirect' : to
  const invalid = (handover && (!isValidCode(code) || !file)) || note.length > NOTE_MAX

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t(`tracking.step.${to}`)}
      target={
        <span>
          {targetLabel(item)}
          <span className="block text-xs font-normal text-muted-foreground">
            {[device.name, device.brand, device.model].filter(Boolean).join(' · ')}
            {device.tagCode && (
              <bdi className="ltr-nums ms-2 font-mono" dir="ltr">
                {device.tagCode}
              </bdi>
            )}
          </span>
        </span>
      }
      changes={
        <span className="space-y-1">
          <span className="block font-medium">
            {t('tracking.stepChange', { from: enumLabel('DeviceCustodyStage', device.stage, lang), to: enumLabel('DeviceCustodyStage', to, lang) })}
          </span>
          <span className="block text-muted-foreground">{t(`tracking.stepNote.${noteKey}`)}</span>
        </span>
      }
      confirmLabel={t(`tracking.step.${to}`)}
      submitting={action.isPending}
      submitDisabled={invalid}
      error={error}
      onSubmit={() => action.mutate(to)}
    >
      {handover && (
        <Field label={t('tracking.handoverCode')} htmlFor={ids.code} required hint={t('tracking.handoverCodeHint')}>
          <Input
            id={ids.code}
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            value={code}
            onChange={(e) => setCode(normalizeCode(e.target.value))}
            className="ltr-nums w-32 text-center font-mono text-lg tracking-[0.5em]"
            maxLength={4}
          />
        </Field>
      )}
      <ImagePicker file={file} onChange={setFile} required={handover} label={handover ? t('tracking.handoverPhoto') : t('tracking.photoOptional')} />
      <Field label={t('tracking.note')} htmlFor={ids.note} optional>
        <Textarea id={ids.note} dir="auto" rows={2} value={note} maxLength={NOTE_MAX} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </ActionDialog>
  )
}

/**
 * "ترتيب الاستلام / ترتيب الإرجاع": a member with the delivery role, or the service's own technician (read from the
 * item's candidates, which carry the roles, and the item's detail), and an optional window. Planning replaces the
 * planned trip of that type.
 */
export function PlanTripDialog({ item, type, current, open, onOpenChange }: DialogProps & { type: ServiceItemLegType; current: LegResponse | null }) {
  const { t } = useTranslation('workshop')
  const { t: tw } = useTranslation('work')
  const targetLabel = useTargetLabel()
  const ids = { start: useId(), end: useId(), member: useId() }
  const [executorId, setExecutorId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const candidates = useQuery({
    queryKey: workKeys.candidates(item.id),
    queryFn: ({ signal }) => workApi.candidates(item.id, signal),
    enabled: open,
    staleTime: 15_000,
  })
  // The service's technician may take the trip without the delivery role (cached when opened from the item page).
  const detail = useQuery({
    queryKey: workKeys.detail(item.id),
    queryFn: ({ signal }) => workApi.detail(item.id, signal),
    enabled: open,
    staleTime: 30_000,
  })
  const assignedId = detail.data?.item.executor?.id ?? null
  const members = tripCandidates(candidates.data ?? [], assignedId)

  const action = useAction({
    mutationFn: () =>
      trackingApi.planTrip(item.id, { type, executorId, scheduledStart: riyadhInputToIso(start), scheduledEnd: riyadhInputToIso(end) }),
    invalidate: TRACKING_INVALIDATION,
    success: t('tracking.success.trip'),
    onSuccess: () => onOpenChange(false),
  })
  const error = useTrackingError(action.error, item.id)

  useEffect(() => {
    if (open) {
      setExecutorId(current?.executorId ?? '')
      setStart('')
      setEnd('')
      action.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const startIso = riyadhInputToIso(start)
  const endIso = riyadhInputToIso(end)
  const inPast = !!startIso && Date.parse(startIso) < Date.now() - 60_000
  const endBeforeStart = !!startIso && !!endIso && Date.parse(endIso) <= Date.parse(startIso)
  const invalid = !executorId || inPast || endBeforeStart || (!!end && !start)

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={t(`tracking.tripTitle.${type}`)}
      target={targetLabel(item)}
      changes={
        <span className="space-y-1">
          <span className="block">{t('tracking.tripEffect')}</span>
          {current && <span className="block text-muted-foreground">{t('tracking.tripReplaces', { name: current.executorName })}</span>}
        </span>
      }
      confirmLabel={type === 'Pickup' ? t('tracking.arrangePickup') : t('tracking.arrangeReturn')}
      submitting={action.isPending}
      submitDisabled={invalid}
      error={error}
      onSubmit={() => action.mutate()}
    >
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">
          {t('tracking.tripMember')} <span className="text-destructive" aria-hidden>*</span>
          <span className="ms-2 text-xs font-normal text-muted-foreground">{t('tracking.tripMemberHint')}</span>
        </legend>
        {candidates.isPending || detail.isPending ? (
          <Skeleton className="h-24" />
        ) : candidates.isError ? (
          <ErrorState compact error={candidates.error} onRetry={() => void candidates.refetch()} />
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">{(candidates.data ?? []).length === 0 ? t('tracking.noMembers') : t('tracking.noDeliveryMembers')}</p>
        ) : (
          <div className="max-h-64 space-y-1.5 overflow-y-auto pe-1">
            {members.map((m) => (
              <label
                key={m.executorId}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 text-sm transition-colors hover:bg-muted/50',
                  executorId === m.executorId && 'border-primary bg-primary-soft',
                )}
              >
                <input
                  type="radio"
                  name={ids.member}
                  value={m.executorId}
                  aria-label={m.fullName}
                  checked={executorId === m.executorId}
                  onChange={() => setExecutorId(m.executorId)}
                  className="accent-primary"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-medium">{m.fullName}</span>
                    {m.executorId === assignedId && <Badge tone="active">{t('tracking.assignedTechnician')}</Badge>}
                    {m.canDeliver && <Badge tone="info">{t('tracking.deliveryRole')}</Badge>}
                  </span>
                  {m.specialization && <span className="block truncate text-xs text-muted-foreground">{m.specialization}</span>}
                </span>
                <StatusBadge enum="ExecutorAvailability" value={m.availability} />
                <span className="tabular hidden text-xs text-muted-foreground sm:inline" title={tw('picker.load')}>
                  {m.activeJobs}/{m.maxConcurrentJobs}
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('tracking.tripStart')} htmlFor={ids.start} optional hint={t('tracking.tripWindowHint')} error={inPast ? tw('schedule.inPast') : undefined}>
          <Input
            id={ids.start}
            type="datetime-local"
            value={start}
            min={nowRiyadh().format(INPUT_FORMAT)}
            onChange={(e) => setStart(e.target.value)}
            aria-invalid={inPast || undefined}
            className="ltr-nums"
          />
        </Field>
        <Field label={t('tracking.tripEnd')} htmlFor={ids.end} optional error={endBeforeStart ? t('common:validation.endAfterStart') : undefined}>
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
    </ActionDialog>
  )
}

/** Cancels a planned trip (`DELETE …/trips/{tripId}`). */
export function CancelTripDialog({ item, leg, open, onOpenChange }: DialogProps & { leg: LegResponse | null }) {
  const { t } = useTranslation('workshop')
  const { lang } = useLang()
  const targetLabel = useTargetLabel()
  const action = useAction({
    mutationFn: (tripId: string) => trackingApi.cancelTrip(item.id, tripId),
    invalidate: TRACKING_INVALIDATION,
    success: t('tracking.success.cancelTrip'),
    onSuccess: () => onOpenChange(false),
  })
  const error = useTrackingError(action.error, item.id)
  useEffect(() => {
    if (open) action.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  if (!leg) return null
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      destructive
      title={t('tracking.cancelTrip')}
      target={
        <span>
          {targetLabel(item)}
          <span className="block text-xs font-normal text-muted-foreground">
            {enumLabel('ServiceItemLegType', leg.type, lang)} · {leg.executorName}
            {leg.scheduledStart && (
              <>
                {' · '}
                <DateTime value={leg.scheduledStart} mode="absolute" />
              </>
            )}
          </span>
        </span>
      }
      changes={t('tracking.cancelTripConfirm')}
      confirmLabel={t('tracking.cancelTrip')}
      submitting={action.isPending}
      error={error}
      onSubmit={() => action.mutate(leg.id)}
    />
  )
}
