import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toApiError } from '@/api/http'
import type { CallOutcome, CounterItemDetailResponse, CustomerApprovalDecision, QuotationResponse } from '@/api/types'
import { ActionDialog } from '@/components/ActionDialog'
import { Money } from '@/components/Format'
import { Button } from '@/components/ui/button'
import { CheckboxField } from '@/components/ui/checkbox'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useRoleKind } from '@/features/auth/authStore'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { formatMoney } from '@/lib/format'
import { COUNTER_INVALIDATION, counterApi, counterKeys } from '../api'
import { balanceState, canAllowDebt, COUNTER_METHODS, discountProblem, isPickupCode, maxDiscountAmount, type CounterMethod } from '../logic'
import { ChoiceChips } from './FlagChips'
import { SignaturePad, type SignaturePadHandle } from './SignaturePad'
import '../i18n'

interface Props {
  detail: CounterItemDetailResponse
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Every counter write returns the item: put it in the cache at once, then refresh the lists and counts. */
function useCounterAction<V>(detail: CounterItemDetailResponse, mutationFn: (v: V) => Promise<CounterItemDetailResponse>, success: string, onDone: () => void) {
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

const target = (d: CounterItemDetailResponse) => [d.intake?.intakeNumber ?? d.itemNumber, d.customer.fullName].filter(Boolean).join(' · ')

const CALL_OUTCOMES: readonly CallOutcome[] = ['Answered', 'NoAnswer', 'Busy', 'Off']

/** "تسجيل مكالمة" about the pending quotation; an answered call can record the decision right away. */
export function CallLogDialog({ detail, quotation, open, onOpenChange, onAnswered }: Props & { quotation: QuotationResponse; onAnswered: () => void }) {
  const { t } = useTranslation('counter')
  const uid = useId()
  const [outcome, setOutcome] = useState<CallOutcome | null>(null)
  const [note, setNote] = useState('')
  const action = useCounterAction(
    detail,
    (body: { outcome: CallOutcome; note: string | null }) => counterApi.callLog(detail.serviceItemId, quotation.id, body),
    t('call.saved'),
    () => {
      onOpenChange(false)
      if (outcome === 'Answered') onAnswered()
    },
  )
  const { reset } = action
  useEffect(() => {
    if (open) {
      setOutcome(null)
      setNote('')
      reset()
    }
  }, [open, reset])

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('call.title')}
      target={`${target(detail)} · ${quotation.quotationNumber}`}
      changes={<Money value={quotation.total} className="font-semibold" />}
      submitting={action.isPending}
      submitDisabled={!outcome}
      error={action.error}
      onSubmit={() => outcome && action.mutate({ outcome, note: note.trim() || null })}
    >
      {detail.customer.phone && (
        <Button asChild size="lg" variant="outline" className="h-12 w-full">
          <a href={`tel:${detail.customer.phone}`}>
            {t('item.call')} <bdi className="ltr-nums font-latin">{detail.customer.phone}</bdi>
          </a>
        </Button>
      )}
      <div className="space-y-2">
        <p className="text-sm font-medium">{t('call.outcome')}</p>
        <ChoiceChips enum="CallOutcome" values={CALL_OUTCOMES} value={outcome} onChange={setOutcome} label={t('call.outcome')} />
        {outcome === 'Answered' && <p className="text-xs text-muted-foreground">{t('call.decideNow')}</p>}
      </div>
      <Field label={t('call.note')} htmlFor={`${uid}-note`} optional>
        <Textarea id={`${uid}-note`} dir="auto" rows={2} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </ActionDialog>
  )
}

/**
 * "تسجيل رد العميل" (phase 2 §7): approve or reject, by phone (needs an answered call in the last 24 h, or tick that this
 * call was answered) or in person. A rejection needs the reason (`QuotationRejectReasonRequired`).
 */
export function DecisionDialog({ detail, quotation, open, onOpenChange }: Props & { quotation: QuotationResponse }) {
  const { t } = useTranslation('counter')
  const uid = useId()
  const [decision, setDecision] = useState<CustomerApprovalDecision | null>(null)
  const [method, setMethod] = useState<'Call' | 'InPerson'>('Call')
  const [answered, setAnswered] = useState(true)
  const [note, setNote] = useState('')
  const action = useCounterAction(
    detail,
    () =>
      counterApi.decision(detail.serviceItemId, quotation.id, {
        decision: decision!,
        method,
        callOutcome: method === 'Call' && answered ? 'Answered' : null,
        note: note.trim() || null,
      }),
    t('decision.saved'),
    () => onOpenChange(false),
  )
  const { reset } = action
  useEffect(() => {
    if (open) {
      setDecision(null)
      setMethod('Call')
      setAnswered(true)
      setNote('')
      reset()
    }
  }, [open, reset])

  const reasonMissing = decision === 'Rejected' && !note.trim()

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('decision.title')}
      target={`${target(detail)} · ${quotation.quotationNumber}`}
      changes={decision ? (decision === 'Approved' ? t('decision.approvedNote') : t('decision.rejectedNote')) : <Money value={quotation.total} className="font-semibold" />}
      destructive={decision === 'Rejected'}
      submitting={action.isPending}
      submitDisabled={!decision || reasonMissing}
      error={action.error}
      onSubmit={() => action.mutate(undefined)}
    >
      <div className="space-y-2">
        <p className="text-sm font-medium">{t('decision.decision')}</p>
        <ChoiceChips enum="CustomerApprovalDecision" values={['Approved', 'Rejected'] as const} value={decision} onChange={setDecision} label={t('decision.decision')} />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">{t('decision.method')}</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('decision.method')}>
          {(['Call', 'InPerson'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={method === m}
              onClick={() => setMethod(m)}
              className={
                method === m
                  ? 'inline-flex h-11 items-center rounded-lg border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground'
                  : 'inline-flex h-11 items-center rounded-lg border bg-surface px-4 text-sm font-medium hover:bg-muted'
              }
            >
              {m === 'Call' ? t('decision.methodCall') : t('decision.methodInPerson')}
            </button>
          ))}
        </div>
        {method === 'Call' && (
          <>
            <CheckboxField id={`${uid}-answered`} checked={answered} onCheckedChange={setAnswered} label={t('decision.callAnswered')} />
            <p className="text-xs text-muted-foreground">{t('decision.callHint')}</p>
          </>
        )}
      </div>
      <Field label={decision === 'Rejected' ? t('decision.reason') : t('decision.note')} htmlFor={`${uid}-note`} required={decision === 'Rejected'} optional={decision !== 'Rejected'}>
        <Textarea id={`${uid}-note`} dir="auto" rows={2} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </ActionDialog>
  )
}

/** "تسجيل دفعة": a record only (no money through the platform); more than 0 and at most the balance. */
export function PaymentDialog({ detail, open, onOpenChange }: Props) {
  const { t } = useTranslation('counter')
  const { lang } = useLang()
  const uid = useId()
  const balance = Math.max(0, detail.money.balance)
  const [method, setMethod] = useState<CounterMethod | null>('Cash')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const action = useCounterAction(
    detail,
    () => counterApi.addPayment(detail.serviceItemId, { method: method!, amount: Number(amount), reference: reference.trim() || null }),
    t('payment.saved'),
    () => onOpenChange(false),
  )
  const { reset } = action
  useEffect(() => {
    if (open) {
      setMethod('Cash')
      setAmount(balance > 0 ? String(balance) : '')
      setReference('')
      reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset])

  const value = Number(amount)
  const invalid = !amount.trim() || !Number.isFinite(value) || value <= 0 || value > balance + 0.004

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('payment.title')}
      description={t('payment.recordOnly')}
      target={target(detail)}
      changes={t('payment.balance', { amount: formatMoney(balance, lang) })}
      submitting={action.isPending}
      submitDisabled={invalid || !method}
      error={action.error}
      onSubmit={() => action.mutate(undefined)}
    >
      <div className="space-y-2">
        <p className="text-sm font-medium">{t('payment.method')}</p>
        <ChoiceChips enum="PaymentMethod" values={COUNTER_METHODS} value={method} onChange={setMethod} label={t('payment.method')} />
      </div>
      <Field label={t('payment.amount')} htmlFor={`${uid}-amount`} required error={amount && invalid ? t('payment.invalid') : undefined}>
        <div className="flex gap-2">
          <Input id={`${uid}-amount`} type="number" inputMode="decimal" min={0} step="0.01" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 text-lg tabular" autoFocus />
          <Button size="lg" variant="outline" className="h-12" onClick={() => setAmount(String(balance))}>
            {t('payment.payAll')}
          </Button>
        </div>
      </Field>
      {method && method !== 'Cash' && (
        <Field label={t('payment.reference')} htmlFor={`${uid}-ref`} optional>
          <Input id={`${uid}-ref`} dir="ltr" value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} className="h-11" />
        </Field>
      )}
    </ActionDialog>
  )
}

/** "خصم": a percent or an amount, with a reason, within `money.maxDiscountPercent`; it replaces the last one. */
export function DiscountDialog({ detail, open, onOpenChange }: Props) {
  const { t } = useTranslation('counter')
  const { lang } = useLang()
  const uid = useId()
  const [mode, setMode] = useState<'percent' | 'amount'>('amount')
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')
  const action = useCounterAction(
    detail,
    () =>
      counterApi.discount(detail.serviceItemId, {
        percent: mode === 'percent' ? Number(value) : null,
        amount: mode === 'amount' ? Number(value) : null,
        reason: reason.trim(),
      }),
    t('discountDialog.saved'),
    () => onOpenChange(false),
  )
  const { reset } = action
  useEffect(() => {
    if (open) {
      setMode('amount')
      setValue(detail.money.discount ? String(detail.money.discount) : '')
      setReason(detail.intake?.discountReason ?? '')
      reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset])

  const money = detail.money
  const problem = discountProblem({ mode, value, reason }, money)
  const noLimit = money.maxDiscountPercent <= 0

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('discountDialog.title')}
      description={t('discountDialog.replaces')}
      target={target(detail)}
      changes={noLimit ? t('discountDialog.noLimit') : t('discountDialog.limit', { percent: money.maxDiscountPercent, amount: formatMoney(maxDiscountAmount(money), lang) })}
      submitting={action.isPending}
      submitDisabled={!!problem || noLimit}
      error={action.error}
      onSubmit={() => action.mutate(undefined)}
    >
      <div className="flex gap-2" role="radiogroup" aria-label={t('discountDialog.mode')}>
        {(['amount', 'percent'] as const).map((m) => (
          <Button key={m} size="lg" variant={mode === m ? 'default' : 'outline'} role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className="h-11">
            {t(`discountDialog.${m}`)}
          </Button>
        ))}
      </div>
      <Field label={t('discountDialog.value')} htmlFor={`${uid}-value`} required error={value && problem && problem !== 'reason' ? t(`discountDialog.problems.${problem}`) : undefined}>
        <Input id={`${uid}-value`} type="number" inputMode="decimal" min={0} step="0.01" dir="ltr" value={value} onChange={(e) => setValue(e.target.value)} className="h-12 text-lg tabular" disabled={noLimit} />
      </Field>
      <Field label={t('discountDialog.reason')} htmlFor={`${uid}-reason`} required>
        <Textarea id={`${uid}-reason`} dir="auto" rows={2} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} disabled={noLimit} />
      </Field>
    </ActionDialog>
  )
}

/**
 * "تسليم للعميل" (phase 2 §10): ready, nothing left to pay (or a debt the owner / a supervisor allows), and the pickup
 * code or the customer's signature. After five wrong codes the server locks the code: use the signature.
 */
export function HandoverDialog({ detail, open, onOpenChange }: Props) {
  const { t } = useTranslation('counter')
  const { lang } = useLang()
  const role = useRoleKind()
  const uid = useId()
  const pad = useRef<SignaturePadHandle>(null)
  const [proof, setProof] = useState<'Code' | 'Signature'>('Code')
  const [code, setCode] = useState('')
  const [signed, setSigned] = useState(false)
  const [allowDebt, setAllowDebt] = useState(false)
  const [note, setNote] = useState('')
  const action = useCounterAction(
    detail,
    async () => {
      const signature = proof === 'Signature' ? await pad.current?.toFile() : null
      return counterApi.handover(detail.serviceItemId, { code: proof === 'Code' ? code : null, signature: signature ?? null, allowDebt, note: note.trim() || null })
    },
    t('handover.done'),
    () => onOpenChange(false),
  )
  const { reset } = action
  useEffect(() => {
    if (open) {
      setProof('Code')
      setCode('')
      setSigned(false)
      setAllowDebt(false)
      setNote('')
      reset()
    }
  }, [open, reset])

  const errorCode = action.error ? toApiError(action.error).errorCode : null
  useEffect(() => {
    if (errorCode === 'HandoverCodeLocked') setProof('Signature')
  }, [errorCode])

  const due = balanceState(detail.money.balance) === 'due'
  const debtAllowed = canAllowDebt(role)
  const proofOk = proof === 'Code' ? isPickupCode(code) : signed
  const blocked = !detail.isReady || (due && !allowDebt)

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={t('handover.title')}
      target={target(detail)}
      changes={
        !detail.isReady ? (
          <span className="text-destructive">{t('handover.notReady')}</span>
        ) : due ? (
          <span className="text-tone-danger">
            {t('handover.balanceDue', { amount: formatMoney(detail.money.balance, lang) })} {!allowDebt && t('handover.payFirst')}
          </span>
        ) : undefined
      }
      confirmLabel={t('handover.confirm')}
      submitting={action.isPending}
      submitDisabled={blocked || !proofOk}
      error={action.error}
      onSubmit={() => action.mutate(undefined)}
    >
      {due && debtAllowed && <CheckboxField id={`${uid}-debt`} checked={allowDebt} onCheckedChange={setAllowDebt} label={t('handover.allowDebt')} hint={t('handover.allowDebtHint')} />}
      <div className="space-y-2">
        <p className="text-sm font-medium">{t('handover.proof')}</p>
        <div className="flex gap-2" role="radiogroup" aria-label={t('handover.proof')}>
          {(['Code', 'Signature'] as const).map((p) => (
            <Button key={p} size="lg" variant={proof === p ? 'default' : 'outline'} role="radio" aria-checked={proof === p} onClick={() => setProof(p)} className="h-11" disabled={p === 'Code' && errorCode === 'HandoverCodeLocked'}>
              {p === 'Code' ? t('handover.byCode') : t('handover.bySignature')}
            </Button>
          ))}
        </div>
      </div>
      {proof === 'Code' ? (
        <Field label={t('handover.code')} htmlFor={`${uid}-code`} required hint={errorCode === 'HandoverCodeLocked' ? t('handover.locked') : t('handover.codeHint')}>
          <Input
            id={`${uid}-code`}
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            value={code}
            maxLength={4}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="ltr-nums h-14 w-40 text-center font-mono text-2xl tracking-[0.5em]"
            autoFocus
          />
        </Field>
      ) : (
        <SignaturePad ref={pad} label={t('handover.bySignature')} onChange={(empty) => setSigned(!empty)} />
      )}
      <Field label={t('handover.note')} htmlFor={`${uid}-note`} optional>
        <Textarea id={`${uid}-note`} dir="auto" rows={2} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </ActionDialog>
  )
}

/** The customer's signature on the intake terms, after the fact. */
export function SignDialog({ detail, open, onOpenChange }: Props) {
  const { t } = useTranslation('counter')
  const pad = useRef<SignaturePadHandle>(null)
  const [signed, setSigned] = useState(false)
  const action = useCounterAction(
    detail,
    async () => {
      const file = await pad.current?.toFile()
      if (!file) throw new Error(t('wizard.signatureHint'))
      return counterApi.sign(detail.serviceItemId, file)
    },
    t('sign.saved'),
    () => onOpenChange(false),
  )
  const { reset } = action
  useEffect(() => {
    if (open) {
      setSigned(false)
      reset()
    }
  }, [open, reset])
  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={t('sign.title')}
      target={target(detail)}
      submitting={action.isPending}
      submitDisabled={!signed}
      error={action.error}
      onSubmit={() => action.mutate(undefined)}
    >
      <SignaturePad ref={pad} label={t('wizard.signature')} onChange={(empty) => setSigned(!empty)} />
    </ActionDialog>
  )
}
