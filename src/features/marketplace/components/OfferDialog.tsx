import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ActionDialog } from '@/components/ActionDialog'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import type { ProviderMarketplaceRequestResponse } from '@/api/types'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import '../i18n'
import { marketplaceApi, offerActionInvalidation } from '../api'
import { OFFER_NOTE_MAX, offerFormDefaults, offerFormSchema, toOfferRequest, type OfferFieldError, type OfferFormValues } from '../offer'

export type OfferDialogMode = 'submit' | 'resubmit' | 'edit'

interface OfferDialogProps {
  request: ProviderMarketplaceRequestResponse
  mode: OfferDialogMode
  open: boolean
  onClose: () => void
}

/**
 * Submit (POST), resubmit a withdrawn offer (POST) or edit a live one (PUT). Client checks mirror
 * the server's (`OfferAmountInvalid`, `EstimatedDurationInvalid`, `OfferNoteTooLong`); business
 * errors (`MarketplaceRequestClosed`, `MarketplaceOfferExists`, …) show the server message here.
 */
export function OfferDialog({ request, mode, open, onClose }: OfferDialogProps) {
  const { t } = useTranslation('marketplace')
  const { pick } = useLang()
  const form = useForm<OfferFormValues>({ resolver: zodResolver(offerFormSchema), defaultValues: offerFormDefaults(request.myOffer) })
  const { register, formState, reset, handleSubmit, control } = form

  useEffect(() => {
    if (open) reset(offerFormDefaults(request.myOffer))
  }, [open, request.myOffer, reset])

  const save = useAction({
    invalidate: offerActionInvalidation,
    success: mode === 'edit' ? t('success.updated') : t('success.submitted'),
    mutationFn: (values: OfferFormValues) =>
      mode === 'edit' ? marketplaceApi.updateOffer(request.id, toOfferRequest(values)) : marketplaceApi.submitOffer(request.id, toOfferRequest(values)),
    onSuccess: onClose,
  })

  useEffect(() => {
    if (open) save.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const note = useWatch({ control, name: 'note' }) ?? ''
  const err = (name: keyof OfferFormValues): string | undefined => {
    const code = formState.errors[name]?.message as OfferFieldError | undefined
    return code ? t(`form.errors.${code}`) : undefined
  }

  const title = mode === 'edit' ? t('form.editTitle') : mode === 'resubmit' ? t('form.resubmitTitle') : t('form.submitTitle')
  const confirm = mode === 'edit' ? t('form.save') : mode === 'resubmit' ? t('form.resubmit') : t('form.submit')

  return (
    <ActionDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={title}
      description={t('detail.oneOffer')}
      target={`${request.requestNumber} · ${pick(request.serviceNameAr, request.serviceNameEn)}`}
      confirmLabel={confirm}
      submitting={save.isPending}
      error={save.error}
      onSubmit={() => void handleSubmit((v) => save.mutate(v))()}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('form.amount')} htmlFor="offer-amount" required error={err('amount')}>
          <Input
            id="offer-amount"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            dir="ltr"
            className="tabular"
            autoFocus
            {...register('amount')}
            aria-invalid={!!formState.errors.amount}
          />
        </Field>
        <Field label={t('form.estimatedDuration')} htmlFor="offer-duration" optional hint={t('form.estimatedDurationHint')} error={err('estimatedDurationMinutes')}>
          <Input
            id="offer-duration"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            dir="ltr"
            className="tabular"
            {...register('estimatedDurationMinutes')}
            aria-invalid={!!formState.errors.estimatedDurationMinutes}
          />
        </Field>
        <Field label={t('form.proposedStart')} htmlFor="offer-start" optional hint={t('form.proposedStartHint')} error={err('proposedStart')} className="sm:col-span-2">
          <Input id="offer-start" type="datetime-local" dir="ltr" className="tabular" {...register('proposedStart')} aria-invalid={!!formState.errors.proposedStart} />
        </Field>
        <Field
          label={t('form.note')}
          htmlFor="offer-note"
          optional
          hint={t('form.noteCount', { count: note.length, max: OFFER_NOTE_MAX })}
          error={err('note')}
          className="sm:col-span-2"
        >
          <Textarea id="offer-note" rows={4} maxLength={OFFER_NOTE_MAX} {...register('note')} aria-invalid={!!formState.errors.note} />
        </Field>
      </div>
    </ActionDialog>
  )
}
