import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toApiError } from '@/api/http'
import type { CreateExecutorRequest, ExecutorResponse, UpdateExecutorRequest } from '@/api/types'
import { ActionDialog } from '@/components/ActionDialog'
import { PhoneField } from '@/components/PhoneField'
import { ErrorState, useErrorMessage } from '@/components/States'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useAction } from '@/hooks/useAction'
import { formatSaudiMobile } from '@/lib/phone'
import { teamApi, teamInvalidation, useOrganizationCapabilities } from '../api'
import {
  EMPTY_EXECUTOR,
  LIMITS,
  createExecutorBody,
  draftFromExecutor,
  executorProfileBody,
  fieldForError,
  hasErrors,
  ltrIsolate,
  phoneChanged,
  profileChanged,
  skillOptions,
  validateExecutor,
  type ExecutorDraft,
} from '../utils'
import { CreatedDialog, Hint, NoCapabilitiesHint, SkillPicker } from './Bits'
import { useDraftErrorText } from './useDraftErrorText'
import '../i18n'

/**
 * «إضافة فني» (no `executor`) and «تعديل بيانات الفني» (§8.7).
 * - Create: `POST …/executors` with skills chosen only from the organization's capabilities;
 *   success shows who can sign in to the technician app, and with which number.
 * - Edit: `PUT …/executors/{id}` (profile + capacity); skills have their own dialog. Changing
 *   the phone changes the login, so it is called out before saving.
 * Server errors land on the field they concern (phone, skills, capacity…), else at the bottom.
 */
export function ExecutorDialog({
  open,
  onOpenChange,
  executor,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  executor?: ExecutorResponse | null
}) {
  const { t } = useTranslation('team')
  const uid = useId()
  const editing = !!executor
  const [draft, setDraft] = useState<ExecutorDraft>(EMPTY_EXECUTOR)
  const [tried, setTried] = useState(false)
  const [created, setCreated] = useState<{ name: string; phone: string } | null>(null)
  const errorText = useDraftErrorText()
  const serverMessage = useErrorMessage()

  const caps = useOrganizationCapabilities(open && !editing)

  const create = useAction({
    mutationFn: (body: CreateExecutorRequest) => teamApi.createExecutor(body),
    invalidate: teamInvalidation.executor,
    success: t('add.executorAdded'),
    onSuccess: (res, body) => setCreated({ name: res.fullName || body.fullName, phone: res.phone ?? body.phone }),
  })
  const update = useAction({
    mutationFn: (body: UpdateExecutorRequest) => teamApi.updateExecutor(executor!.id, body),
    invalidate: teamInvalidation.executor,
    success: t('edit.saved'),
    onSuccess: () => onOpenChange(false),
  })
  const action = editing ? update : create
  const { reset: resetCreate } = create
  const { reset: resetUpdate } = update

  // Fresh form on every opening (prefilled from the row when editing).
  useEffect(() => {
    if (!open) return
    setDraft(executor ? draftFromExecutor(executor) : EMPTY_EXECUTOR)
    setTried(false)
    setCreated(null)
    resetCreate()
    resetUpdate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, executor?.id])

  const patch = (p: Partial<ExecutorDraft>) => {
    setDraft((d) => ({ ...d, ...p }))
    // A server error about the field being edited is no longer true.
    const field = fieldForError(toApiError(action.error).errorCode)
    if (action.error && field && field in p) action.reset()
  }

  const errors = validateExecutor(draft)
  const serverCode = action.error ? toApiError(action.error).errorCode : null
  const serverField = fieldForError(serverCode)
  const show = (k: keyof ExecutorDraft): string | undefined =>
    serverField === k && action.error ? serverMessage(action.error) : tried ? errorText(errors[k]) : undefined

  const options = skillOptions(caps.data?.capabilities ?? [])
  const profile = executorProfileBody(draft)
  const changed = !executor || profileChanged(executor, profile)
  const phoneWillChange = !!executor && phoneChanged(executor, draft.phone)

  const submit = () => {
    setTried(true)
    if (hasErrors(errors)) return
    if (editing) {
      if (changed) update.mutate(profile)
      return
    }
    create.mutate(createExecutorBody(draft), {
      // The organization's capabilities changed meanwhile: reload the chips.
      onError: (e) => toApiError(e).errorCode === 'ExecutorCapabilityNotInOrganization' && void caps.refetch(),
    })
  }

  if (created) {
    return (
      <CreatedDialog
        open={open}
        onOpenChange={onOpenChange}
        title={t('add.executorAdded')}
        message={t('add.executorSignIn', { name: created.name, phone: ltrIsolate(formatSaudiMobile(created.phone)) })}
        onAnother={() => {
          setCreated(null)
          setDraft(EMPTY_EXECUTOR)
          setTried(false)
          resetCreate()
        }}
      />
    )
  }

  const capsLoading = !editing && caps.isPending
  const capsError = !editing && caps.isError

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={editing ? t('edit.title') : t('add.executorTitle')}
      target={executor ? [executor.fullName, executor.phone ? formatSaudiMobile(executor.phone) : null].filter(Boolean).join(' · ') : undefined}
      confirmLabel={editing ? t('common:actions.saveChanges') : t('technicians.add')}
      submitting={action.isPending}
      submitDisabled={editing && !changed}
      error={serverField && (serverField !== 'capabilityIds' || (!editing && options.length > 0)) ? null : action.error}
      onSubmit={submit}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('form.fullName')} htmlFor={`${uid}-name`} required error={show('fullName')}>
          <Input
            id={`${uid}-name`}
            value={draft.fullName}
            onChange={(e) => patch({ fullName: e.target.value })}
            maxLength={LIMITS.name}
            autoComplete="off"
            autoFocus
            aria-invalid={!!show('fullName') || undefined}
          />
        </Field>
        <Field label={t('form.phone')} htmlFor={`${uid}-phone`} required hint={t('form.executorPhoneHint')} error={show('phone')}>
          <PhoneField id={`${uid}-phone`} value={draft.phone} onChange={(phone) => patch({ phone })} autoComplete="off" aria-invalid={!!show('phone') || undefined} />
        </Field>
        <Field label={t('form.email')} htmlFor={`${uid}-email`} optional error={show('email')}>
          <Input
            id={`${uid}-email`}
            type="email"
            dir="ltr"
            value={draft.email}
            onChange={(e) => patch({ email: e.target.value })}
            maxLength={LIMITS.email}
            autoComplete="off"
            aria-invalid={!!show('email') || undefined}
          />
        </Field>
        <Field label={t('form.specialization')} htmlFor={`${uid}-spec`} optional error={show('specialization')}>
          <Input
            id={`${uid}-spec`}
            value={draft.specialization}
            onChange={(e) => patch({ specialization: e.target.value })}
            maxLength={LIMITS.specialization}
            placeholder={t('form.specializationPlaceholder')}
            aria-invalid={!!show('specialization') || undefined}
          />
        </Field>
        <Field label={t('form.maxJobs')} htmlFor={`${uid}-jobs`} required hint={t('form.maxJobsHint')} error={show('maxJobs')} className="sm:col-span-2">
          <Input
            id={`${uid}-jobs`}
            type="number"
            inputMode="numeric"
            min={LIMITS.minJobs}
            max={LIMITS.maxJobs}
            step={1}
            dir="ltr"
            className="w-28 tabular"
            value={draft.maxJobs}
            onChange={(e) => patch({ maxJobs: e.target.value })}
            aria-invalid={!!show('maxJobs') || undefined}
          />
        </Field>
      </div>

      {phoneWillChange && <Hint tone="attention">{t('edit.phoneWarning')}</Hint>}

      {!editing && (
        <div className="space-y-1.5">
          <p id={`${uid}-skills`} className="text-sm font-medium">
            {t('form.skills')}
          </p>
          {capsLoading ? (
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-8 w-24 rounded-full" />
              ))}
            </div>
          ) : capsError ? (
            <ErrorState compact error={caps.error} onRetry={() => void caps.refetch()} />
          ) : options.length ? (
            <>
              <SkillPicker
                labelledBy={`${uid}-skills`}
                options={options}
                selected={draft.capabilityIds}
                onChange={(capabilityIds) => patch({ capabilityIds })}
                invalid={!!show('capabilityIds')}
              />
              {show('capabilityIds') ? (
                <p className="text-xs text-destructive" role="alert">
                  {show('capabilityIds')}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t('form.skillsCount', { count: draft.capabilityIds.length })} · {t('form.skillsHint')}
                </p>
              )}
            </>
          ) : (
            <NoCapabilitiesHint />
          )}
        </div>
      )}
    </ActionDialog>
  )
}
