import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toApiError } from '@/api/http'
import type { CreateSupervisorRequest } from '@/api/types'
import { ActionDialog } from '@/components/ActionDialog'
import { PhoneField } from '@/components/PhoneField'
import { useErrorMessage } from '@/components/States'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useAction } from '@/hooks/useAction'
import { formatSaudiMobile } from '@/lib/phone'
import { teamApi, teamInvalidation } from '../api'
import { EMPTY_PERSON, LIMITS, fieldForError, hasErrors, ltrIsolate, supervisorBody, validatePerson, type PersonDraft } from '../utils'
import { CreatedDialog } from './Bits'
import { useDraftErrorText } from './useDraftErrorText'
import '../i18n'

/** «إضافة مشرف» (owner only, §7): `POST …/supervisors`. The phone is their sign-in to this platform. */
export function SupervisorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('team')
  const uid = useId()
  const [draft, setDraft] = useState<PersonDraft>(EMPTY_PERSON)
  const [tried, setTried] = useState(false)
  const [created, setCreated] = useState<{ name: string; phone: string } | null>(null)
  const errorText = useDraftErrorText()
  const serverMessage = useErrorMessage()

  const create = useAction({
    mutationFn: (body: CreateSupervisorRequest) => teamApi.createSupervisor(body),
    invalidate: teamInvalidation.supervisor,
    success: t('add.supervisorAdded'),
    onSuccess: (res, body) => setCreated({ name: res.fullName || body.fullName, phone: res.phone ?? body.phone }),
  })
  const { reset } = create

  useEffect(() => {
    if (!open) return
    setDraft(EMPTY_PERSON)
    setTried(false)
    setCreated(null)
    reset()
  }, [open, reset])

  const errors = validatePerson(draft)
  const serverField = create.error ? fieldForError(toApiError(create.error).errorCode) : null
  const show = (k: keyof PersonDraft): string | undefined =>
    serverField === k ? serverMessage(create.error) : tried ? errorText(errors[k]) : undefined

  const patch = (p: Partial<PersonDraft>) => {
    setDraft((d) => ({ ...d, ...p }))
    if (serverField && serverField in p) reset()
  }

  if (created) {
    return (
      <CreatedDialog
        open={open}
        onOpenChange={onOpenChange}
        title={t('add.supervisorAdded')}
        message={t('add.supervisorSignIn', { name: created.name, phone: ltrIsolate(formatSaudiMobile(created.phone)) })}
        onAnother={() => {
          setCreated(null)
          setDraft(EMPTY_PERSON)
          setTried(false)
          reset()
        }}
      />
    )
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('add.supervisorTitle')}
      confirmLabel={t('supervisors.add')}
      submitting={create.isPending}
      error={serverField && serverField in EMPTY_PERSON ? null : create.error}
      onSubmit={() => {
        setTried(true)
        if (!hasErrors(errors)) create.mutate(supervisorBody(draft))
      }}
    >
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
      <Field label={t('form.phone')} htmlFor={`${uid}-phone`} required hint={t('form.supervisorPhoneHint')} error={show('phone')}>
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
    </ActionDialog>
  )
}
