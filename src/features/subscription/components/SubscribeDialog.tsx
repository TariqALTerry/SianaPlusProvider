import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CounterPlanResponse, ProviderSubscriptionOverviewResponse, SubscriptionBillingCycle } from '@/api/types'
import { ActionDialog } from '@/components/ActionDialog'
import { CheckboxField } from '@/components/ui/checkbox'
import { Input, Select } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { enumLabel } from '@/i18n/enums'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { SUBSCRIPTION_INVALIDATION, subscriptionApi } from '../api'
import { EXTRA_BRANCHES_MAX, periodPrice } from '../logic'
import '../i18n'

interface Props {
  mode: 'start' | 'change'
  open: boolean
  onOpenChange: (open: boolean) => void
  plans: CounterPlanResponse[]
  overview: ProviderSubscriptionOverviewResponse
  /** The plan picked on the plans grid. */
  initialPlanId?: string | null
}

const CYCLES: readonly SubscriptionBillingCycle[] = ['Monthly', 'Yearly']

/**
 * Subscribe (`POST subscription`) or change (`POST subscription/change`), owner only. Shows the period price for the
 * picked terms; a trial starts with no invoice, otherwise the first invoice is issued at once.
 */
export function SubscribeDialog({ mode, open, onOpenChange, plans, overview, initialPlanId }: Props) {
  const { t } = useTranslation('subscription')
  const { lang, pick } = useLang()
  const uid = useId()
  const sub = overview.subscription
  const [planId, setPlanId] = useState('')
  const [cycle, setCycle] = useState<SubscriptionBillingCycle>('Monthly')
  const [extra, setExtra] = useState('0')
  const [trial, setTrial] = useState(true)
  const [autoPay, setAutoPay] = useState(false)

  const action = useAction({
    mutationFn: () => {
      const extraBranches = Number(extra) || 0
      return mode === 'start'
        ? subscriptionApi.subscribe({ planId, billingCycle: cycle, extraBranches, startTrial: trial && canTrial, autoPayFromWallet: autoPay })
        : subscriptionApi.change({ planId, billingCycle: cycle, extraBranches })
    },
    invalidate: SUBSCRIPTION_INVALIDATION,
    success: mode === 'start' ? t('subscribe.subscribed') : t('subscribe.changed'),
    onSuccess: () => onOpenChange(false),
  })
  const { reset } = action

  useEffect(() => {
    if (!open) return
    const changing = mode === 'change' && sub
    setPlanId(initialPlanId ?? (changing ? (sub.nextPlan?.id ?? sub.plan.id) : (plans[0]?.id ?? '')))
    setCycle(changing ? (sub.nextBillingCycle ?? sub.billingCycle) : 'Monthly')
    setExtra(String(changing ? (sub.nextExtraBranches ?? sub.extraBranches) : 0))
    setTrial(true)
    setAutoPay(false)
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset])

  const plan = plans.find((p) => p.id === planId) ?? (sub?.plan.id === planId ? sub.plan : undefined)
  const extraNumber = Number(extra)
  const extraInvalid = !Number.isInteger(extraNumber) || extraNumber < 0 || extraNumber > EXTRA_BRANCHES_MAX
  const canTrial = mode === 'start' && overview.trialAvailable && (plan?.trialDays ?? 0) > 0
  const price = plan && !extraInvalid ? periodPrice(plan, cycle, extraNumber) : null
  const pendingPayment = sub?.status === 'PendingPayment'
  const allowed = plan ? plan.includedBranches + (extraInvalid ? 0 : extraNumber) : null
  const overLimit = allowed !== null && overview.counterBranchesUsed > allowed

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'start' ? t('subscribe.title') : t('subscribe.changeTitle')}
      description={mode === 'start' ? (canTrial && trial ? t('subscribe.trialNote') : t('subscribe.payNote')) : pendingPayment ? t('subscribe.changePendingNote') : t('subscribe.changeNote')}
      changes={
        price !== null ? (
          <span className="space-y-0.5">
            <span className="block text-base font-semibold">{t('subscribe.price', { price: formatMoney(price, lang) })}</span>
            <span className="block text-xs text-muted-foreground">{t('subscribe.priceNote')}</span>
          </span>
        ) : undefined
      }
      confirmLabel={mode === 'start' ? (canTrial && trial ? t('actions.startTrial') : t('actions.subscribe')) : t('actions.change')}
      submitting={action.isPending}
      submitDisabled={!plan || extraInvalid}
      error={action.error}
      onSubmit={() => action.mutate(undefined)}
    >
      <Field label={t('subscribe.plan')} htmlFor={`${uid}-plan`} required>
        <Select id={`${uid}-plan`} value={planId} onChange={(e) => setPlanId(e.target.value)} className="h-11">
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {pick(p.nameAr, p.nameEn)}
            </option>
          ))}
        </Select>
      </Field>
      <div className="space-y-2">
        <p className="text-sm font-medium">{t('subscribe.cycle')}</p>
        <div className="flex gap-2" role="radiogroup" aria-label={t('subscribe.cycle')}>
          {CYCLES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={cycle === c}
              onClick={() => setCycle(c)}
              className={cn('inline-flex h-11 items-center rounded-lg border px-4 text-sm font-medium', cycle === c ? 'border-primary bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')}
            >
              {enumLabel('SubscriptionBillingCycle', c, lang)}
            </button>
          ))}
        </div>
      </div>
      <Field label={t('subscribe.extraBranches')} htmlFor={`${uid}-extra`} hint={t('subscribe.extraHint')}>
        <Input id={`${uid}-extra`} type="number" inputMode="numeric" min={0} max={EXTRA_BRANCHES_MAX} step={1} dir="ltr" value={extra} onChange={(e) => setExtra(e.target.value)} className="h-11 w-32 tabular" aria-invalid={extraInvalid || undefined} />
      </Field>
      {overLimit && <p className="text-xs text-tone-danger">{t('subscribe.limitHint', { used: overview.counterBranchesUsed })}</p>}
      {canTrial && <CheckboxField id={`${uid}-trial`} checked={trial} onCheckedChange={setTrial} label={t('subscribe.startTrial', { count: plan?.trialDays ?? 0 })} />}
      {mode === 'start' && <CheckboxField id={`${uid}-auto`} checked={autoPay} onCheckedChange={setAutoPay} label={t('subscribe.autoPay')} />}
    </ActionDialog>
  )
}
