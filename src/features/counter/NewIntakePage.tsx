import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Check, ShieldCheck, UserCheck, UserPlus } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { toApiError } from '@/api/http'
import { qk } from '@/api/keys'
import type { CounterCustomerLookupResponse, CounterItemDetailResponse, CreateCounterIntakeRequest } from '@/api/types'
import { DateTime, Money } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { PhoneField } from '@/components/PhoneField'
import { InlineError } from '@/components/States'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { CheckboxField } from '@/components/ui/checkbox'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useRoleKind } from '@/features/auth/authStore'
import { BranchSelect } from '@/features/branches/BranchSelect'
import { useBranchScope } from '@/features/branches/scope'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { enumLabel } from '@/i18n/enums'
import { formatDate, formatMoney, nowRiyadh } from '@/lib/format'
import { cn } from '@/lib/utils'
import { COUNTER_INVALIDATION, counterApi, counterKeys } from './api'
import { ChoiceChips, FlagChips } from './components/FlagChips'
import { GateBanner } from './components/GateBanner'
import { ServiceField } from './components/ServiceField'
import { SignaturePad, type SignaturePadHandle } from './components/SignaturePad'
import { useCounterGate, useService } from './hooks'
import {
  ACCESSORIES,
  COUNTER_METHODS,
  CONDITIONS,
  draftFromPrefill,
  type IntakePrefillState,
  ESTIMATE_TYPES,
  GATE_ERROR_CODES,
  INTAKE_LIMITS,
  INTAKE_STEPS,
  intakeRequest,
  paidNow,
  POWERS_ON,
  stepProblems,
  toggleFlag,
  type IntakeDraft,
  type IntakeProblem,
  type IntakeStep,
} from './logic'
import './i18n'

/** Server errors that belong to a step, so the wizard can take the user back there. */
const ERROR_STEP: Record<string, IntakeStep> = {
  CounterPhoneInvalid: 'customer',
  CounterCustomerNameRequired: 'customer',
  PhoneAlreadyRegistered: 'customer',
  BranchNotFound: 'customer',
  CanonicalServiceNotFound: 'device',
  ServiceInactive: 'device',
  ServiceIssueNotFound: 'device',
  CounterImeiInvalid: 'device',
  CounterAccessoryInvalid: 'condition',
  CounterConditionInvalid: 'condition',
  CounterEstimateInvalid: 'money',
  CounterAmountInvalid: 'money',
  CounterPaymentMethodRequired: 'money',
  CounterPaymentMethodInvalid: 'money',
}

/**
 * `/counter/new` (phase 2 §4): the intake wizard. Customer (look up by phone: earlier devices and warranties at this
 * shop) → device → condition → estimate and payment → terms and signature. Saving posts the JSON, then the signature;
 * the photos come next on the "تم الاستلام" screen, where an interrupted upload leaves the receipt "ناقص".
 */
export function NewIntakePage() {
  const { t } = useTranslation('counter')
  const { lang, pick, isRtl } = useLang()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const role = useRoleKind()
  const uid = useId()
  const id = (k: string) => `${uid}-${k}`
  const scope = useBranchScope()
  const gate = useCounterGate({ anyBranch: true })
  const signature = useRef<SignaturePadHandle>(null)
  const [step, setStep] = useState<IntakeStep>('customer')
  const location = useLocation()
  // An out-of-warranty claim opens the wizard filled from the earlier device (phase 5 §6).
  const [draft, setDraft] = useState<IntakeDraft>(() => draftFromPrefill((location.state as { prefill?: IntakePrefillState } | null)?.prefill))
  const [tried, setTried] = useState<Partial<Record<IntakeStep, boolean>>>({})
  const patch = (p: Partial<IntakeDraft>) => setDraft((d) => ({ ...d, ...p }))
  const Next = isRtl ? ArrowLeft : ArrowRight
  const Prev = isRtl ? ArrowRight : ArrowLeft

  // The intake branch: the switcher's when it runs the counter, else the first one that does.
  const counterBranches = scope.branches.filter((b) => b.isActive && b.counterEnabled)
  useEffect(() => {
    if (draft.branchId) return
    const preferred = scope.selected && scope.selected.counterEnabled && scope.selected.isActive ? scope.selected.id : counterBranches.length === 1 ? counterBranches[0]!.id : ''
    if (preferred) patch({ branchId: preferred })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.selected?.id, counterBranches.length])

  const phoneReady = /^5\d{8}$/.test(draft.phone)
  const lookup = useQuery({
    queryKey: counterKeys.customer(draft.phone),
    queryFn: ({ signal }) => counterApi.lookupCustomer(draft.phone, signal),
    enabled: phoneReady,
    staleTime: 60_000,
    retry: false,
  })
  const needsName = !lookup.data || !lookup.data.found || !lookup.data.fullName
  useEffect(() => {
    if (lookup.data?.found && lookup.data.fullName) patch({ customerName: '' })
  }, [lookup.data])

  const service = useService(draft.serviceId)
  // The branch terms come with the caller's branches (`me/branches`), so the front desk sees them too.
  const intakeBranch = scope.branches.find((b) => b.id === draft.branchId) ?? null

  const save = useAction<CreateCounterIntakeRequest, CounterItemDetailResponse>({
    mutationFn: (body) => counterApi.createIntake(body),
    invalidate: COUNTER_INVALIDATION,
    onSuccess: async (detail) => {
      queryClient.setQueryData(counterKeys.detail(detail.serviceItemId), detail)
      const file = await signature.current?.toFile()
      if (file) {
        try {
          const signed = await counterApi.sign(detail.serviceItemId, file)
          queryClient.setQueryData(counterKeys.detail(detail.serviceItemId), signed)
        } catch {
          toast.warning(t('wizard.signFailed'))
        }
      }
      navigate(`/counter/items/${detail.serviceItemId}/done`, { replace: true })
    },
  })
  const saveCode = save.error ? toApiError(save.error).errorCode : null
  useEffect(() => {
    if (!saveCode) return
    const back = ERROR_STEP[saveCode]
    if (back) setStep(back)
    // The gate closed under the page: refresh what drives it.
    if (GATE_ERROR_CODES.has(saveCode)) {
      void queryClient.invalidateQueries({ queryKey: qk.subscription })
      void queryClient.invalidateQueries({ queryKey: qk.branches })
    }
  }, [saveCode, save.error, queryClient])

  const index = INTAKE_STEPS.indexOf(step)
  const problems = stepProblems(step, draft, needsName)
  const show = (p: IntakeProblem) => (tried[step] && problems.includes(p) ? t(`wizard.errors.${p}`) : undefined)
  const goNext = () => {
    setTried((s) => ({ ...s, [step]: true }))
    if (problems.length) return
    if (index < INTAKE_STEPS.length - 1) setStep(INTAKE_STEPS[index + 1]!)
    else {
      const all = INTAKE_STEPS.flatMap((s) => stepProblems(s, draft, needsName).map(() => s))
      if (all.length) {
        setStep(all[0]!)
        setTried(Object.fromEntries(INTAKE_STEPS.map((s) => [s, true])))
        return
      }
      save.mutate(intakeRequest(draft))
    }
  }

  if (!gate.loading && !gate.open) {
    return (
      <>
        <PageHeader title={t('wizard.title')} back={{ to: '/counter', label: t('wizard.back') }} />
        <GateBanner reason={gate.reason} />
      </>
    )
  }

  const paying = paidNow(draft) > 0
  const minNow = nowRiyadh().format('YYYY-MM-DDTHH:mm')

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t('wizard.title')} back={{ to: '/counter', label: t('wizard.back') }} />

      <ol className="mb-4 grid grid-cols-5 gap-1" aria-label={t('wizard.title')}>
        {INTAKE_STEPS.map((s, i) => {
          const done = i < index
          const current = s === step
          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => i < index && setStep(s)}
                disabled={i > index}
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'flex w-full flex-col items-center gap-1 rounded-lg px-1 py-2 text-center text-xs transition-colors',
                  current ? 'bg-primary-soft font-semibold text-primary' : done ? 'text-foreground hover:bg-muted' : 'text-muted-foreground',
                )}
              >
                <span className={cn('flex size-8 items-center justify-center rounded-full border text-sm tabular', current && 'border-primary bg-primary text-primary-foreground', done && 'border-primary text-primary')}>
                  {done ? <Check className="size-4" /> : i + 1}
                </span>
                <span className="hidden sm:block">{t(`wizard.steps.${s}`)}</span>
              </button>
            </li>
          )
        })}
      </ol>

      <Card>
        <CardBody className="space-y-5 p-4 sm:p-6">
          <h2 className="text-lg font-semibold">{t(`wizard.steps.${step}`)}</h2>

          {step === 'customer' && (
            <>
              <Field label={t('wizard.branch')} htmlFor={id('branch')} required hint={t('wizard.branchHint')} error={show('branch')}>
                <BranchSelect id={id('branch')} value={draft.branchId || null} onChange={(v) => patch({ branchId: v ?? '' })} filter={(b) => b.counterEnabled} emptyLabel={t('wizard.branch')} className="h-11 text-base" />
              </Field>
              <Field label={t('wizard.phone')} htmlFor={id('phone')} required error={show('phone')}>
                <PhoneField id={id('phone')} value={draft.phone} onChange={(phone) => patch({ phone })} className="h-12" autoFocus aria-invalid={!!show('phone') || undefined} />
              </Field>
              {phoneReady && lookup.isFetching && <p className="text-sm text-muted-foreground">{t('common:common.loading')}</p>}
              <InlineError error={lookup.error} />
              {lookup.data && (
                <div className="space-y-4">
                  <p className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium', lookup.data.found ? 'bg-tone-success-soft text-tone-success' : 'bg-tone-info-soft text-tone-info')}>
                    {lookup.data.found ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}
                    {lookup.data.found ? (lookup.data.fullName ? t('wizard.found', { name: lookup.data.fullName }) : t('wizard.foundNoName')) : t('wizard.notFound')}
                  </p>
                  {needsName && (
                    <Field label={t('wizard.name')} htmlFor={id('name')} required hint={t('wizard.nameHint')} error={show('name')}>
                      <Input id={id('name')} value={draft.customerName} maxLength={INTAKE_LIMITS.name} onChange={(e) => patch({ customerName: e.target.value })} className="h-11 text-base" />
                    </Field>
                  )}
                  {lookup.data.found && (
                    <History data={lookup.data} management={role !== 'frontDesk'} />
                  )}
                </div>
              )}
            </>
          )}

          {step === 'device' && (
            <>
              <Field label={t('wizard.service')} htmlFor={id('service')} required error={show('service')}>
                <ServiceField id={id('service')} value={draft.serviceId} onChange={(serviceId) => patch({ serviceId, issueId: null })} invalid={!!show('service')} />
              </Field>
              {!!service.data?.issues.length && (
                <Field label={t('wizard.issue')} htmlFor={id('issue')} optional>
                  <Select id={id('issue')} value={draft.issueId ?? ''} onChange={(e) => patch({ issueId: e.target.value || null })} className="h-11 text-base" placeholder={t('wizard.issueNone')}>
                    {service.data.issues.map((i) => (
                      <option key={i.id} value={i.id}>
                        {pick(i.nameAr, i.nameEn)}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={t('wizard.deviceName')} htmlFor={id('dname')} optional hint={t('wizard.deviceNameHint')}>
                  <Input id={id('dname')} value={draft.deviceName} maxLength={INTAKE_LIMITS.text} onChange={(e) => patch({ deviceName: e.target.value })} className="h-11" />
                </Field>
                <Field label={t('wizard.brand')} htmlFor={id('brand')} optional>
                  <Input id={id('brand')} value={draft.brand} maxLength={INTAKE_LIMITS.text} onChange={(e) => patch({ brand: e.target.value })} className="h-11" />
                </Field>
                <Field label={t('wizard.model')} htmlFor={id('model')} optional>
                  <Input id={id('model')} value={draft.model} maxLength={INTAKE_LIMITS.text} onChange={(e) => patch({ model: e.target.value })} className="h-11" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('wizard.imei')} htmlFor={id('imei')} optional hint={t('wizard.imeiHint')} error={show('imei')}>
                  <Input id={id('imei')} dir="ltr" inputMode="numeric" value={draft.imei} maxLength={INTAKE_LIMITS.imei} onChange={(e) => patch({ imei: e.target.value.trim() })} className="h-11 font-mono" aria-invalid={!!show('imei') || undefined} />
                </Field>
                <Field label={t('wizard.serial')} htmlFor={id('serial')} optional>
                  <Input id={id('serial')} dir="ltr" value={draft.serialNumber} maxLength={INTAKE_LIMITS.text} onChange={(e) => patch({ serialNumber: e.target.value })} className="h-11 font-mono" />
                </Field>
              </div>
              <Field label={t('wizard.issueDescription')} htmlFor={id('desc')} optional>
                <Textarea id={id('desc')} dir="auto" rows={3} value={draft.issueDescription} maxLength={INTAKE_LIMITS.notes} onChange={(e) => patch({ issueDescription: e.target.value })} />
              </Field>
            </>
          )}

          {step === 'condition' && (
            <>
              <Group label={t('wizard.accessories')}>
                <FlagChips enum="IntakeAccessory" values={ACCESSORIES} selected={draft.accessories} onToggle={(v) => patch({ accessories: toggleFlag(draft.accessories, v, ACCESSORIES) })} label={t('wizard.accessories')} />
              </Group>
              <Field label={t('wizard.accessoriesNote')} htmlFor={id('anote')} optional>
                <Input id={id('anote')} value={draft.accessoriesNote} maxLength={INTAKE_LIMITS.accessoriesNote} onChange={(e) => patch({ accessoriesNote: e.target.value })} className="h-11" />
              </Field>
              <Group label={t('wizard.conditions')} hint={draft.conditions.length === 0 ? t('wizard.noMarks') : undefined}>
                <FlagChips enum="IntakeCondition" values={CONDITIONS} selected={draft.conditions} onToggle={(v) => patch({ conditions: toggleFlag(draft.conditions, v, CONDITIONS) })} label={t('wizard.conditions')} />
              </Group>
              <Field label={t('wizard.conditionNotes')} htmlFor={id('cnote')} optional error={show('tooLong')}>
                <Textarea id={id('cnote')} dir="auto" rows={2} value={draft.conditionNotes} maxLength={INTAKE_LIMITS.conditionNotes} onChange={(e) => patch({ conditionNotes: e.target.value })} />
              </Field>
              <Group label={t('wizard.powersOn')}>
                <ChoiceChips enum="PowersOnState" values={POWERS_ON} value={draft.powersOn} onChange={(powersOn) => patch({ powersOn })} label={t('wizard.powersOn')} />
              </Group>
              <Field label={t('wizard.lockCode')} htmlFor={id('lock')} optional hint={t('wizard.lockCodeHint')}>
                <Input id={id('lock')} dir="ltr" autoComplete="off" value={draft.lockCode} maxLength={50} onChange={(e) => patch({ lockCode: e.target.value })} className="h-11 w-56 font-mono" />
              </Field>
            </>
          )}

          {step === 'money' && (
            <>
              <Group label={t('wizard.estimateType')} hint={t('wizard.estimateHint')}>
                <ChoiceChips enum="IntakeEstimateType" values={ESTIMATE_TYPES} value={draft.estimateType} onChange={(estimateType) => patch({ estimateType })} label={t('wizard.estimateType')} allowNone noneLabel={t('wizard.estimateNone')} />
              </Group>
              {(draft.estimateType === 'Fixed' || draft.estimateType === 'Range') && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={draft.estimateType === 'Range' ? t('wizard.estimateFrom') : t('wizard.estimateMin')} htmlFor={id('emin')} required error={show('estimateMin')}>
                    <MoneyInput id={id('emin')} value={draft.estimateMin} onChange={(estimateMin) => patch({ estimateMin })} />
                  </Field>
                  {draft.estimateType === 'Range' && (
                    <Field label={t('wizard.estimateTo')} htmlFor={id('emax')} required error={show('estimateMax')}>
                      <MoneyInput id={id('emax')} value={draft.estimateMax} onChange={(estimateMax) => patch({ estimateMax })} />
                    </Field>
                  )}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('wizard.inspectionFee')} htmlFor={id('fee')} hint={t('wizard.inspectionFeeHint')} error={show('amount')}>
                  <MoneyInput id={id('fee')} value={draft.inspectionFee} onChange={(inspectionFee) => patch({ inspectionFee })} />
                </Field>
                <Field label={t('wizard.deposit')} htmlFor={id('deposit')} hint={t('wizard.depositHint')}>
                  <MoneyInput id={id('deposit')} value={draft.deposit} onChange={(deposit) => patch({ deposit })} />
                </Field>
              </div>
              {Number(draft.inspectionFee) > 0 && (
                <CheckboxField id={id('feenow')} checked={draft.inspectionFeePaidNow} onCheckedChange={(inspectionFeePaidNow) => patch({ inspectionFeePaidNow })} label={t('wizard.inspectionFeePaidNow')} />
              )}
              {paying && (
                <div className="space-y-4 rounded-lg border bg-muted/30 p-3">
                  <p className="text-sm font-semibold">{t('wizard.paidNow', { amount: formatMoney(paidNow(draft), lang) })}</p>
                  <Group label={t('wizard.paymentMethod')} error={show('paymentMethod')}>
                    <ChoiceChips enum="PaymentMethod" values={COUNTER_METHODS} value={draft.paymentMethod} onChange={(paymentMethod) => patch({ paymentMethod })} label={t('wizard.paymentMethod')} />
                  </Group>
                  {draft.paymentMethod && draft.paymentMethod !== 'Cash' && (
                    <Field label={t('wizard.paymentReference')} htmlFor={id('ref')} optional>
                      <Input id={id('ref')} dir="ltr" value={draft.paymentReference} maxLength={INTAKE_LIMITS.reference} onChange={(e) => patch({ paymentReference: e.target.value })} className="h-11" />
                    </Field>
                  )}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('wizard.promisedReadyAt')} htmlFor={id('ready')} optional>
                  <Input id={id('ready')} type="datetime-local" dir="ltr" min={minNow} value={draft.promisedReadyAt} onChange={(e) => patch({ promisedReadyAt: e.target.value })} className="h-11" />
                </Field>
              </div>
              <Field label={t('wizard.customerNotes')} htmlFor={id('notes')} optional>
                <Textarea id={id('notes')} dir="auto" rows={2} value={draft.customerNotes} maxLength={INTAKE_LIMITS.notes} onChange={(e) => patch({ customerNotes: e.target.value })} />
              </Field>
            </>
          )}

          {step === 'terms' && (
            <>
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="size-4 text-primary" /> {t('wizard.termsTitle')}
                  {intakeBranch?.termsText && <span className="text-xs font-normal text-muted-foreground">{t('wizard.termsVersion', { version: intakeBranch.termsVersion })}</span>}
                </p>
                {intakeBranch ? (
                  intakeBranch.termsText ? (
                    <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed" dir="auto">
                      {intakeBranch.termsText}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('wizard.termsEmpty')}</p>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">{t('wizard.termsPrinted')}</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">{t('wizard.signature')}</p>
                <p className="text-xs text-muted-foreground">{t('wizard.signatureHint')}</p>
                <SignaturePad ref={signature} label={t('wizard.signature')} />
              </div>
              <Summary draft={draft} serviceName={service.data ? pick(service.data.nameAr, service.data.nameEn) : null} customer={lookup.data?.fullName ?? draft.customerName} />
            </>
          )}

          <InlineError error={save.error} />
          {saveCode && GATE_ERROR_CODES.has(saveCode) && <GateBanner reason={saveCode === 'CounterSubscriptionPendingPayment' || saveCode === 'CounterSubscriptionExpired' || saveCode === 'CounterModuleDisabled' ? saveCode : saveCode === 'BranchInactive' ? 'BranchInactive' : 'BranchCounterDisabled'} message={toApiError(save.error).message} />}
        </CardBody>
        <div className="sticky bottom-0 flex items-center justify-between gap-2 rounded-b-lg border-t bg-surface/95 px-4 py-3 backdrop-blur">
          {index > 0 ? (
            <Button size="lg" variant="outline" className="h-12" onClick={() => setStep(INTAKE_STEPS[index - 1]!)} disabled={save.isPending}>
              <Prev /> {t('wizard.previous')}
            </Button>
          ) : (
            <Button asChild size="lg" variant="ghost" className="h-12">
              <Link to="/counter">{t('common:actions.cancel')}</Link>
            </Button>
          )}
          <Button size="lg" className="h-12 min-w-[10rem] text-base" onClick={goNext} loading={save.isPending}>
            {index < INTAKE_STEPS.length - 1 ? (
              <>
                {t('wizard.next')} <Next />
              </>
            ) : (
              <>
                <Check /> {save.isPending ? t('wizard.saving') : t('wizard.save')}
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}

function Group({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function MoneyInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <Input id={id} type="number" inputMode="decimal" min={0} step="0.01" dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} className="h-11 text-base tabular" placeholder="0" />
  )
}

/** Earlier devices and valid warranties of this customer at this shop only (the server sends nothing else). */
function History({ data, management }: { data: CounterCustomerLookupResponse; management: boolean }) {
  const { t } = useTranslation('counter')
  const { pick, lang } = useLang()
  if (!data.devices.length && !data.warranties.length) return <p className="text-sm text-muted-foreground">{t('wizard.noHistory')}</p>
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.devices.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-semibold">{t('wizard.previousDevices')}</p>
          <ul className="divide-y rounded-lg border text-sm">
            {data.devices.map((d) => (
              <li key={d.serviceItemId} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{[d.deviceName, d.brand, d.model].filter(Boolean).join(' · ')}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    <bdi className="ltr-nums font-mono">{d.intakeNumber}</bdi> · {pick(d.serviceNameAr, d.serviceNameEn)} · {d.branchName} · <DateTime value={d.receivedAt} mode="date" />
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <StatusBadge enum="ServiceItemStatus" value={d.status} />
                  <Link to={management ? `/work/${d.serviceItemId}` : `/counter/items/${d.serviceItemId}`} target="_blank" className="text-xs text-primary underline">
                    {t('wizard.openItem')}
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.warranties.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-semibold">{t('wizard.warranties')}</p>
          <ul className="divide-y rounded-lg border text-sm">
            {data.warranties.map((w) => (
              <li key={w.warrantyId} className="px-3 py-2">
                <span className="block font-medium">
                  <bdi className="ltr-nums font-mono">{w.warrantyNumber}</bdi> · {pick(w.serviceNameAr, w.serviceNameEn)}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {[w.deviceName, t('wizard.warrantyUntil', { date: formatDate(w.endsAt, lang) })].filter(Boolean).join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Summary({ draft, serviceName, customer }: { draft: IntakeDraft; serviceName: string | null; customer: string }) {
  const { t } = useTranslation('counter')
  const { lang } = useLang()
  const rows: Array<[string, ReactNode]> = [
    [t('wizard.name'), customer || '—'],
    [t('wizard.phone'), <bdi key="p" className="ltr-nums font-latin">+966 {draft.phone}</bdi>],
    [t('wizard.service'), serviceName ?? '—'],
    [t('wizard.accessories'), draft.accessories.map((a) => enumLabel('IntakeAccessory', a, lang)).join('، ') || '—'],
    [t('wizard.conditions'), draft.conditions.map((c) => enumLabel('IntakeCondition', c, lang)).join('، ') || t('wizard.noMarks')],
    [t('wizard.inspectionFee'), <Money key="f" value={Number(draft.inspectionFee) || 0} />],
    [t('wizard.deposit'), <Money key="d" value={Number(draft.deposit) || 0} />],
  ]
  return (
    <div>
      <p className="mb-1 text-sm font-semibold">{t('wizard.summary')}</p>
      <dl className="grid gap-x-6 gap-y-1 rounded-lg border p-3 text-sm sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-end">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
