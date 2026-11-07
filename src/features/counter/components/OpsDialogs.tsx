import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, PauseCircle, PlayCircle } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { qk } from '@/api/keys'
import type { CounterItemDetailResponse, CounterItemWhatsAppResponse, FulfillmentChannel, ServiceItemStatus, WhatsAppMessageResponse, WhatsAppTemplateKind } from '@/api/types'
import { ActionDialog, ConfirmDialog, ReasonDialog } from '@/components/ActionDialog'
import { DateTime } from '@/components/Format'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useRoleKind } from '@/features/auth/authStore'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { enumLabel } from '@/i18n/enums'
import { COUNTER_INVALIDATION, counterApi, counterKeys } from '../api'
import { ABANDON_REASON_MAX, abandonNeedsReason, EMPTY_PAUSE, HOLD_LIMITS, HOLD_REASONS, holdActions, pauseProblems, pauseRequest, WAIVER_REASON_MAX, type PauseDraft } from '../logic'
import { ChoiceChips } from './FlagChips'
import '../opsI18n'

interface Open {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** What the pause / resume dialogs need: a counter item or a platform service at a branch. */
export interface HoldTarget {
  serviceItemId: string
  label: string
  status: ServiceItemStatus
  fulfillmentChannel: FulfillmentChannel
}

/** Pause and resume change the item everywhere: counter, work, shelf and the board. */
const HOLD_INVALIDATION = [qk.counter, qk.work, qk.workshop, qk.board] as const

/**
 * "إيقاف مؤقت" (phase 5 §2) from the platform: the owner and supervisors, a device at a branch. The reason is required
 * for a counter device; the workshop name and cost go with `ExternalWorkshop` only.
 */
export function PauseDialog({ item, open, onOpenChange }: Open & { item: HoldTarget }) {
  const { t } = useTranslation('counterOps')
  const uid = useId()
  const [draft, setDraft] = useState<PauseDraft>(EMPTY_PAUSE)
  const walkIn = item.fulfillmentChannel === 'WalkIn'
  const action = useAction({
    mutationFn: () => counterApi.pause(item.serviceItemId, pauseRequest(draft)),
    invalidate: HOLD_INVALIDATION,
    success: t('hold.paused'),
    onSuccess: () => onOpenChange(false),
  })
  const { reset } = action
  useEffect(() => {
    if (open) {
      setDraft(EMPTY_PAUSE)
      reset()
    }
  }, [open, reset])
  const problems = pauseProblems(draft, walkIn)
  const patch = (p: Partial<PauseDraft>) => setDraft((d) => ({ ...d, ...p }))

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('hold.pauseTitle')}
      target={item.label}
      submitting={action.isPending}
      submitDisabled={problems.length > 0}
      error={action.error}
      onSubmit={() => action.mutate()}
    >
      <div className="space-y-2">
        <p className="text-sm font-medium">
          {t('hold.reason')} {walkIn && <span className="text-destructive">*</span>}
        </p>
        <ChoiceChips enum="HoldReason" values={HOLD_REASONS} value={draft.holdReason} onChange={(v) => patch({ holdReason: v })} label={t('hold.reason')} />
        {walkIn && !draft.holdReason && <p className="text-xs text-muted-foreground">{t('hold.reasonRequired')}</p>}
      </div>
      {draft.holdReason === 'ExternalWorkshop' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('hold.workshop')} htmlFor={`${uid}-ws`} optional>
            <Input id={`${uid}-ws`} dir="auto" value={draft.externalWorkshopName} maxLength={HOLD_LIMITS.workshop} onChange={(e) => patch({ externalWorkshopName: e.target.value })} />
          </Field>
          <Field label={t('hold.cost')} htmlFor={`${uid}-cost`} optional error={problems.includes('cost') ? t('common:errors.generic') : undefined}>
            <Input id={`${uid}-cost`} type="number" inputMode="decimal" min={0} step="0.5" dir="ltr" className="tabular" value={draft.externalCost} onChange={(e) => patch({ externalCost: e.target.value })} />
          </Field>
        </div>
      )}
      <Field label={t('hold.note')} htmlFor={`${uid}-note`} optional>
        <Textarea id={`${uid}-note`} dir="auto" rows={2} value={draft.note} maxLength={HOLD_LIMITS.note} onChange={(e) => patch({ note: e.target.value })} />
      </Field>
    </ActionDialog>
  )
}

/** "استئناف": back to the status before the pause; the reason is cleared. */
export function ResumeDialog({ item, open, onOpenChange }: Open & { item: HoldTarget }) {
  const { t } = useTranslation('counterOps')
  const action = useAction({
    mutationFn: () => counterApi.resume(item.serviceItemId),
    invalidate: HOLD_INVALIDATION,
    success: t('hold.resumed'),
    onSuccess: () => onOpenChange(false),
  })
  const { reset } = action
  useEffect(() => {
    if (open) reset()
  }, [open, reset])
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('hold.resumeTitle')}
      description={t('hold.resumeHint')}
      target={item.label}
      confirmLabel={t('hold.resume')}
      submitting={action.isPending}
      error={action.error}
      onSubmit={() => action.mutate()}
    />
  )
}

/**
 * Pause / resume buttons with their dialogs, for a service page outside the counter (a platform device at a branch,
 * phase 5 §2). Nothing renders when neither applies (role, status, device not at a branch).
 */
export function HoldButtons({ item, size = 'sm' }: { item: HoldTarget & { currentBranchId: string | null }; size?: 'sm' | 'lg' }) {
  const { t } = useTranslation('counterOps')
  const role = useRoleKind()
  const [dialog, setDialog] = useState<'pause' | 'resume' | null>(null)
  const { canPause, canResume } = holdActions(item, role)
  if (!canPause && !canResume) return null
  return (
    <>
      {canPause && (
        <Button size={size} variant="outline" onClick={() => setDialog('pause')}>
          <PauseCircle /> {t('hold.pause')}
        </Button>
      )}
      {canResume && (
        <Button size={size} variant="outline" onClick={() => setDialog('resume')}>
          <PlayCircle /> {t('hold.resume')}
        </Button>
      )}
      <PauseDialog item={item} open={dialog === 'pause'} onOpenChange={(o) => !o && setDialog(null)} />
      <ResumeDialog item={item} open={dialog === 'resume'} onOpenChange={(o) => !o && setDialog(null)} />
    </>
  )
}

const label = (d: CounterItemDetailResponse) => [d.intake?.intakeNumber ?? d.itemNumber, d.customer.fullName].filter(Boolean).join(' · ')

function useDetailAction<V>(detail: CounterItemDetailResponse, mutationFn: (v: V) => Promise<CounterItemDetailResponse>, success: string, onDone: () => void) {
  const queryClient = useQueryClient()
  return useAction<V, CounterItemDetailResponse>({
    mutationFn,
    invalidate: COUNTER_INVALIDATION,
    success,
    onSuccess: (updated) => {
      queryClient.setQueryData(counterKeys.detail(detail.serviceItemId), updated)
      onDone()
    },
  })
}

/** "إعفاء من الرسوم" (`WaiveStorageFee`, supervisors): a reason up to 300. */
export function WaiveStorageDialog({ detail, open, onOpenChange }: Open & { detail: CounterItemDetailResponse }) {
  const { t } = useTranslation('counterOps')
  const action = useDetailAction(detail, (reason: string) => counterApi.waiveStorage(detail.serviceItemId, reason.slice(0, WAIVER_REASON_MAX)), t('storage.waivedToast'), () => onOpenChange(false))
  const { reset } = action
  useEffect(() => {
    if (open) reset()
  }, [open, reset])
  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('storage.waiveTitle')}
      target={label(detail)}
      label={t('storage.waiveReason')}
      submitting={action.isPending}
      error={action.error}
      onSubmit={(reason) => action.mutate(reason)}
    />
  )
}

/**
 * "إعلانه متروكًا" (`Abandon`, supervisors). Final: two steps and a plain warning. The reason is required while fewer than
 * 3 reminders went out (`AbandonRemindersRequired`), optional after.
 */
export function AbandonDialog({ detail, open, onOpenChange }: Open & { detail: CounterItemDetailResponse }) {
  const { t } = useTranslation('counterOps')
  const required = abandonNeedsReason(detail.storage)
  const action = useDetailAction(detail, (reason: string) => counterApi.abandon(detail.serviceItemId, reason ? reason.slice(0, ABANDON_REASON_MAX) : null), t('storage.abandonedToast'), () => onOpenChange(false))
  const { reset } = action
  useEffect(() => {
    if (open) reset()
  }, [open, reset])
  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('storage.abandonTitle')}
      target={label(detail)}
      label={t('storage.abandonReason')}
      required={required}
      destructive
      twoStep
      confirmLabel={t('storage.abandon')}
      submitting={action.isPending}
      error={action.error}
      onSubmit={(reason) => action.mutate(reason)}
    >
      <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive-soft px-3 py-2 text-sm text-destructive">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {t('storage.abandonWarning')}
      </p>
      <p className="text-xs text-muted-foreground">
        {t('storage.reminders', { count: detail.storage.remindersSent })}
        {required && ` · ${t('storage.abandonReasonHint')}`}
      </p>
    </ReasonDialog>
  )
}

/**
 * A manual WhatsApp send (phase 4 §4): retry one failed / skipped message, or a new message of a kind that applies now.
 * The global switch, the quota, a sender and the phone are still required: the server answers with an error then.
 */
export function SendWhatsAppDialog({
  detail,
  message,
  kinds,
  open,
  onOpenChange,
}: Open & { detail: CounterItemDetailResponse; message: WhatsAppMessageResponse | null; kinds: readonly WhatsAppTemplateKind[] }) {
  const { t } = useTranslation('counterOps')
  const { lang } = useLang()
  const queryClient = useQueryClient()
  const [kind, setKind] = useState<WhatsAppTemplateKind | null>(null)
  const action = useAction<void, CounterItemWhatsAppResponse>({
    mutationFn: () => counterApi.resend(detail.serviceItemId, message ? { messageId: message.id } : { kind }),
    success: t('whatsapp.resent'),
    onSuccess: (updated) => {
      queryClient.setQueryData(counterKeys.messages(detail.serviceItemId), updated)
      onOpenChange(false)
    },
  })
  const { reset } = action
  useEffect(() => {
    if (open) {
      setKind(kinds.length === 1 ? kinds[0]! : null)
      reset()
    }
  }, [open, reset, kinds])

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={message ? t('whatsapp.resendTitle') : t('whatsapp.sendTitle')}
      description={t('whatsapp.sendHint')}
      target={message ? `${label(detail)} · ${enumLabel('WhatsAppTemplateKind', message.kind, lang)}` : label(detail)}
      confirmLabel={message ? t('whatsapp.resend') : t('whatsapp.send')}
      submitting={action.isPending}
      submitDisabled={!message && !kind}
      error={action.error}
      onSubmit={() => action.mutate()}
    >
      {message ? (
        <p className="text-sm text-muted-foreground">
          <DateTime value={message.createdAt} /> · {enumLabel('WhatsAppMessageStatus', message.status, lang)}
          {message.skipReason && ` · ${enumLabel('WhatsAppSkipReason', message.skipReason, lang)}`}
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('whatsapp.kind')}</p>
          <ChoiceChips enum="WhatsAppTemplateKind" values={kinds} value={kind} onChange={setKind} label={t('whatsapp.kind')} />
        </div>
      )}
    </ActionDialog>
  )
}
