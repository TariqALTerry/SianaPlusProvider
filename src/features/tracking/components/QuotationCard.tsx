import { useMutation } from '@tanstack/react-query'
import { Check, MessageCircle, Phone, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toApiError, type ApiError } from '@/api/http'
import type { CustomerApprovalDecision, PublicTrackingOtpResponse, PublicTrackingQuotationResponse, PublicTrackingResponse } from '@/api/types'
import { Money } from '@/components/Format'
import { OtpInput } from '@/components/OtpInput'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useLang } from '@/hooks/useLang'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { trackingApi } from '../api'
import { formatCountdown, needsNewCode, ownWordsError, REJECT_REASON_MAX, secondsUntil, telHref } from '../logic'
import '../i18n'

interface Props {
  token: string
  quotation: PublicTrackingQuotationResponse
  branchPhone: string | null
  /** The decision went through: the reply is the whole page. */
  onDecided: (page: PublicTrackingResponse, decision: CustomerApprovalDecision) => void
  /** `QuotationNotPending`: answered or changed meanwhile (maybe by phone). */
  onStale: () => void
}

type Step = 'idle' | 'reason' | 'code'

/** Ticks every second while a countdown is on screen. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])
  return now
}

/**
 * The pending quotation and its answer (phase 4 §6): lines and totals, then approve or reject (a reason is required to
 * reject), a one-time code by WhatsApp or SMS, and the decision. `canAnswerOnline = false` puts "call the shop" first.
 */
export function QuotationCard({ token, quotation: q, branchPhone, onDecided, onStale }: Props) {
  const { t } = useTranslation('publicTracking')
  const { lang } = useLang()
  const uid = useId()
  const [step, setStep] = useState<Step>('idle')
  const [decision, setDecision] = useState<CustomerApprovalDecision | null>(null)
  const [reason, setReason] = useState('')
  const [otp, setOtp] = useState<PublicTrackingOtpResponse | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<ApiError | null>(null)
  const now = useNow(step === 'code')
  const tel = telHref(branchPhone)

  const fail = (e: unknown) => {
    const err = toApiError(e)
    if (err.errorCode === 'QuotationNotPending') {
      onStale()
      return
    }
    if (err.errorCode === 'OtpInvalid') setCode('')
    setError(err)
  }

  const sendOtp = useMutation({
    mutationFn: () => trackingApi.sendOtp(token, q.id),
    onSuccess: (res) => {
      setOtp(res)
      setCode('')
      setError(null)
      setStep('code')
    },
    onError: fail,
  })

  const decide = useMutation({
    mutationFn: (otpCode: string) => trackingApi.decide(token, q.id, { otp: otpCode, decision: decision!, reason: decision === 'Rejected' ? reason.trim() : null }),
    onSuccess: (page) => onDecided(page, decision!),
    onError: fail,
  })

  const start = (d: CustomerApprovalDecision) => {
    setDecision(d)
    setError(null)
    if (d === 'Rejected') setStep('reason')
    else sendOtp.mutate()
  }

  const back = () => {
    setStep('idle')
    setDecision(null)
    setOtp(null)
    setCode('')
    setError(null)
  }

  const submit = (value = code) => {
    if (!otp || value.length !== otp.codeLength || decide.isPending) return
    setError(null)
    decide.mutate(value)
  }

  const resendLeft = otp ? secondsUntil(otp.resendAvailableAt, now) : 0
  const errorText = error ? (ownWordsError(error.errorCode) ? t(`errors.${ownWordsError(error.errorCode)!}`) : error.message) : null
  const codeDead = needsNewCode(error?.errorCode)
  const reasonMissing = !reason.trim()

  return (
    <section className="rounded-2xl border bg-surface shadow-sm" aria-labelledby={`${uid}-title`}>
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 id={`${uid}-title`} className="text-base font-semibold">
          {t('quote.title')}
        </h2>
        <bdi className="ltr-nums font-mono text-xs text-muted-foreground">{q.quotationNumber}</bdi>
      </header>

      <div className="space-y-3 px-4 py-3">
        <ul className="divide-y text-sm">
          {q.lines.map((line, i) => (
            <li key={i} className="flex items-start justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block">{line.description}</span>
                {line.quantity !== 1 && (
                  <span className="block text-xs text-muted-foreground">
                    <span className="tabular">{line.quantity}</span> × <Money value={line.unitPrice} />
                  </span>
                )}
              </span>
              <Money value={line.total} className="shrink-0 font-medium" />
            </li>
          ))}
        </ul>
        {q.discountAmount > 0 && (
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t('quote.subtotal')}</dt>
              <dd>
                <Money value={q.subtotal} />
              </dd>
            </div>
            <div className="flex justify-between text-tone-success">
              <dt>{t('quote.discount')}</dt>
              <dd>
                <Money value={-q.discountAmount} />
              </dd>
            </div>
          </dl>
        )}
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
          <span className="font-medium">{t('quote.total')}</span>
          <Money value={q.total} className="text-lg font-bold" />
        </div>
        {q.notes && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{q.notes}</p>}
        <p className="text-sm font-medium">
          {q.alreadyPaid > 0
            ? t('quote.ifApprovedPaid', {
                amount: formatMoney(q.amountIfApproved, lang),
                paid: formatMoney(q.alreadyPaid, lang),
                remaining: formatMoney(q.remainingIfApproved, lang),
              })
            : t('quote.ifApproved', { amount: formatMoney(q.amountIfApproved, lang) })}
        </p>
        {q.amountIfRejected > 0 && <p className="text-sm text-muted-foreground">{t('quote.ifRejected', { amount: formatMoney(q.amountIfRejected, lang) })}</p>}
      </div>

      <div className="space-y-3 border-t px-4 py-4">
        {step === 'idle' && (
          <>
            {!q.canAnswerOnline && tel && (
              <div className="space-y-2">
                <Button asChild size="lg" className="h-12 w-full text-base">
                  <a href={tel}>
                    <Phone /> {t('quote.callFirst')}
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground">{t('quote.callFirstHint')}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="lg"
                variant={q.canAnswerOnline ? 'default' : 'outline'}
                className="h-12 text-base"
                loading={sendOtp.isPending && decision === 'Approved'}
                onClick={() => start('Approved')}
              >
                <Check /> {t('quote.approve')}
              </Button>
              <Button size="lg" variant="destructive-outline" className="h-12 text-base" onClick={() => start('Rejected')}>
                <X /> {t('quote.reject')}
              </Button>
            </div>
          </>
        )}

        {step === 'reason' && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (!reasonMissing) sendOtp.mutate()
            }}
          >
            <Field label={t('quote.rejectReason')} htmlFor={`${uid}-reason`} required hint={t('quote.rejectReasonHint')}>
              <Textarea id={`${uid}-reason`} dir="auto" rows={3} maxLength={REJECT_REASON_MAX} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Button size="lg" variant="outline" className="h-12" onClick={back}>
                {t('quote.back')}
              </Button>
              <Button type="submit" size="lg" variant="destructive" className="h-12" disabled={reasonMissing} loading={sendOtp.isPending}>
                {t('quote.continue')}
              </Button>
            </div>
          </form>
        )}

        {step === 'code' && otp && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <p className="flex items-center gap-2 text-sm">
              <MessageCircle className="size-4 shrink-0 text-primary" aria-hidden />
              <span>
                {otp.channel === 'WhatsApp' ? t('quote.sentWhatsApp', { phone: '' }) : t('quote.sentSms', { phone: '' })}
                <bdi className="ltr-nums font-latin">{otp.phoneMasked}</bdi>
              </span>
            </p>
            <OtpInput
              length={otp.codeLength}
              value={code}
              onChange={setCode}
              onComplete={(c) => submit(c)}
              invalid={error?.errorCode === 'OtpInvalid'}
              disabled={decide.isPending || codeDead}
              autoFocus
              label={t('quote.code')}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button size="lg" variant="outline" className="h-12" onClick={back} disabled={decide.isPending}>
                {t('quote.back')}
              </Button>
              <Button
                type="submit"
                size="lg"
                variant={decision === 'Rejected' ? 'destructive' : 'default'}
                className="h-12"
                disabled={code.length !== otp.codeLength || codeDead}
                loading={decide.isPending}
              >
                {decision === 'Rejected' ? t('quote.confirmReject') : t('quote.confirmApprove')}
              </Button>
            </div>
            <Button variant="link" className="w-full" disabled={resendLeft > 0 || sendOtp.isPending} onClick={() => sendOtp.mutate()}>
              {sendOtp.isPending ? t('quote.sending') : resendLeft > 0 ? t('quote.resendIn', { time: formatCountdown(resendLeft) }) : t('quote.resend')}
            </Button>
          </form>
        )}

        {errorText && (
          <p role="alert" className={cn('rounded-lg px-3 py-2 text-sm', 'bg-tone-danger-soft text-tone-danger')}>
            {errorText}
            {error?.errorCode === 'WhatsAppCustomerPhoneMissing' && tel && (
              <a href={tel} className="ms-2 font-semibold underline">
                {t('branch.call')}
              </a>
            )}
          </p>
        )}
      </div>
    </section>
  )
}
