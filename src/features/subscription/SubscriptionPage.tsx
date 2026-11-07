import type { ColumnDef } from '@tanstack/react-table'
import { AlertTriangle, CheckCircle2, Hourglass, Lock, Pause, Play, Repeat } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { CounterInvoiceResponse, CounterPlanResponse, ProviderSubscriptionOverviewResponse, SubscriptionInvoiceStatus } from '@/api/types'
import { ConfirmDialog } from '@/components/ActionDialog'
import { DataTable } from '@/components/DataTable'
import { EnumFilter } from '@/components/Filters'
import { DateTime, Money } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState, PageSkeleton } from '@/components/States'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Switch } from '@/components/ui/checkbox'
import { useProvider } from '@/app/provider'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { useUrlState } from '@/hooks/useUrlState'
import { enumLabel } from '@/i18n/enums'
import { formatDate, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { SUBSCRIPTION_INVALIDATION, subscriptionApi, useInvoices, usePlans, useSubscriptionOverview } from './api'
import { InvoiceDialog } from './components/InvoiceDialog'
import { SubscribeDialog } from './components/SubscribeDialog'
import { canCancel, cancelsAtOnce, canResume, daysUntil, isChangeable, isEnded, keyDate, yearlySaving } from './logic'
import './i18n'

const schema = { invoice: '', status: '', page: 1, pageSize: 25 }

/**
 * `/subscription` (PROVIDER-BRANCHES phase 3 §3–§5): the counter's paid subscription. The owner subscribes, changes,
 * cancels or resumes, turns auto-pay on, and pays invoices (wallet or bank transfer); supervisors read only. A "counter
 * only" shop can look at the plans before approval. `?invoice=` opens one invoice (from a notification).
 */
export function SubscriptionPage() {
  const { t } = useTranslation('subscription')
  const { isOwner, mode } = useProvider()
  const { state, set } = useUrlState(schema)
  const overview = useSubscriptionOverview()
  const plans = usePlans()
  const [dialog, setDialog] = useState<{ mode: 'start' | 'change'; planId?: string } | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)

  if (overview.isPending || plans.isPending) return <PageSkeleton />
  if (overview.isError) return <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />

  const o = overview.data
  const sub = o.subscription
  const offered = plans.data ?? []

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader title={t('title')} description={t('description')} />
      {!isOwner && (
        <p className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
          <Lock className="size-4 shrink-0" /> {t('readOnly')}
        </p>
      )}
      {mode !== 'full' && <p className="rounded-md bg-tone-info-soft px-3 py-2 text-sm text-tone-info">{t('beforeApproval')}</p>}

      <CurrentCard overview={o} isOwner={isOwner} onChange={() => setDialog({ mode: 'change' })} onCancel={() => setCancelOpen(true)} onOpenInvoice={(id) => set({ invoice: id })} />

      <section className="space-y-3">
        <h2 className="text-base font-semibold">{t('plans.title')}</h2>
        {plans.isError ? (
          <Card>
            <ErrorState error={plans.error} onRetry={() => void plans.refetch()} compact />
          </Card>
        ) : offered.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('plans.empty')}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {offered.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                current={sub && !isEnded(sub.status) ? sub.plan.id === p.id : false}
                action={
                  isOwner && o.canSubscribe ? (
                    <Button size="lg" className="w-full" onClick={() => setDialog({ mode: 'start', planId: p.id })}>
                      {o.trialAvailable && p.trialDays > 0 ? t('actions.startTrial') : t('actions.subscribe')}
                    </Button>
                  ) : isOwner && sub && isChangeable(sub.status) && sub.plan.id !== p.id ? (
                    <Button size="lg" variant="outline" className="w-full" onClick={() => setDialog({ mode: 'change', planId: p.id })}>
                      <Repeat /> {t('actions.change')}
                    </Button>
                  ) : null
                }
              />
            ))}
          </div>
        )}
      </section>

      <InvoicesCard status={state.status} page={state.page} pageSize={state.pageSize} onState={set} onOpen={(id) => set({ invoice: id })} />

      {dialog && (
        <SubscribeDialog mode={dialog.mode} open={!!dialog} onOpenChange={(open) => !open && setDialog(null)} plans={offered} overview={o} initialPlanId={dialog.planId} />
      )}
      <CancelDialog overview={o} open={cancelOpen} onOpenChange={setCancelOpen} />
      <InvoiceDialog invoiceId={state.invoice || null} onOpenChange={(open) => !open && set({ invoice: '' })} overview={o} isOwner={isOwner} />
    </div>
  )
}

function CurrentCard({
  overview: o,
  isOwner,
  onChange,
  onCancel,
  onOpenInvoice,
}: {
  overview: ProviderSubscriptionOverviewResponse
  isOwner: boolean
  onChange: () => void
  onCancel: () => void
  onOpenInvoice: (id: string) => void
}) {
  const { t } = useTranslation('subscription')
  const { t: tc } = useTranslation('counter')
  const { lang, pick } = useLang()
  const sub = o.subscription
  const date = sub ? keyDate(sub) : null

  const resume = useAction({ mutationFn: () => subscriptionApi.resume(), invalidate: SUBSCRIPTION_INVALIDATION, success: t('cancel.resumed'), errorToast: true })
  const autoPay = useAction({
    mutationFn: (enabled: boolean) => subscriptionApi.setAutoPay(enabled),
    invalidate: SUBSCRIPTION_INVALIDATION,
    success: (_r, enabled) => (enabled ? t('actions.autoPayOn') : t('actions.autoPayOff')),
    errorToast: true,
  })

  return (
    <Card>
      <CardHeader
        title={t('current.title')}
        actions={
          sub && isOwner ? (
            <>
              {isChangeable(sub.status) && (
                <Button size="sm" variant="outline" onClick={onChange}>
                  <Repeat /> {t('actions.change')}
                </Button>
              )}
              {canResume(sub) && (
                <Button size="sm" variant="outline" onClick={() => resume.mutate(undefined)} loading={resume.isPending}>
                  <Play /> {t('actions.resume')}
                </Button>
              )}
              {canCancel(sub) && (
                <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive-soft" onClick={onCancel}>
                  <Pause /> {t('actions.cancel')}
                </Button>
              )}
            </>
          ) : undefined
        }
      />
      <CardBody className="space-y-4">
        {/* The live gate: from the server, never computed here. */}
        {o.counterAvailable ? (
          <p className="flex items-center gap-2 rounded-lg bg-tone-success-soft px-3 py-2 text-sm text-tone-success">
            <CheckCircle2 className="size-4 shrink-0" /> {o.counterModuleEnabled ? t('current.override') : t('current.gateOpen')}
          </p>
        ) : (
          <p className="flex items-center gap-2 rounded-lg bg-tone-danger-soft px-3 py-2 text-sm text-tone-danger">
            <AlertTriangle className="size-4 shrink-0" />
            {tc(`gate.${o.counterBlockedReason === 'CounterSubscriptionPendingPayment' || o.counterBlockedReason === 'CounterSubscriptionExpired' ? o.counterBlockedReason : 'CounterModuleDisabled'}`)}
          </p>
        )}
        {o.pendingBusinessModel && (
          <p className="flex items-center gap-2 text-sm text-tone-waiting">
            <Hourglass className="size-4" /> {t('current.pendingModel', { model: enumLabel('ProviderBusinessModel', o.pendingBusinessModel, lang) })}
          </p>
        )}

        {!sub ? (
          <div>
            <p className="font-medium">{t('current.none')}</p>
            <p className="text-sm text-muted-foreground">{t('current.noneHint')}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold">{pick(sub.plan.nameAr, sub.plan.nameEn)}</span>
                <StatusBadge enum="ProviderSubscriptionStatus" value={sub.status} />
                <Badge tone="neutral">{enumLabel('SubscriptionBillingCycle', sub.billingCycle, lang)}</Badge>
              </div>
              {date && (
                <p className={cn('text-sm', date.kind === 'graceEnds' ? 'font-semibold text-tone-danger' : 'text-muted-foreground')}>{t(`current.${date.kind}`, { date: formatDate(date.at, lang) })}</p>
              )}
              {sub.status === 'Trial' && sub.trialEndsAt && daysUntil(sub.trialEndsAt) >= 0 && <p className="text-sm font-medium text-tone-info">{t('current.trialDaysLeft', { count: daysUntil(sub.trialEndsAt) })}</p>}
              {sub.status === 'PendingPayment' && <p className="text-sm text-tone-waiting">{t('current.pendingPayment')}</p>}
              {isEnded(sub.status) && <p className="text-sm text-muted-foreground">{t('current.ended')}</p>}
              {sub.cancelAtPeriodEnd && <p className="text-sm text-tone-attention">{t('current.cancelAtPeriodEnd')}</p>}
              {(sub.nextPlan || sub.nextBillingCycle || sub.nextExtraBranches !== null) && (
                <p className="text-sm text-tone-info">
                  {t('current.nextChange', {
                    plan: pick((sub.nextPlan ?? sub.plan).nameAr, (sub.nextPlan ?? sub.plan).nameEn),
                    cycle: enumLabel('SubscriptionBillingCycle', sub.nextBillingCycle ?? sub.billingCycle, lang),
                    extra: sub.nextExtraBranches ?? sub.extraBranches,
                  })}
                </p>
              )}
              {!o.trialAvailable && !sub && <p className="text-xs text-muted-foreground">{t('current.trialUsed')}</p>}
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md bg-muted/50 p-2">
                <dt className="text-xs text-muted-foreground">{t('current.branches')}</dt>
                <dd className="tabular font-semibold">
                  {o.counterBranchesAllowed === null ? t('current.branchesUnlimited', { used: o.counterBranchesUsed }) : t('current.branchesUsed', { used: o.counterBranchesUsed, allowed: o.counterBranchesAllowed })}
                </dd>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <dt className="text-xs text-muted-foreground">{t('current.whatsApp')}</dt>
                <dd className="tabular font-semibold">{o.whatsAppQuotaUnlimited ? t('current.whatsAppUnlimited') : t('current.whatsAppUsed', { used: o.whatsAppQuotaUsed, allowed: o.whatsAppQuotaAllowed })}</dd>
              </div>
            </dl>
          </div>
        )}

        {o.pendingInvoice && (
          <div className="flex flex-col gap-3 rounded-lg border border-tone-waiting/40 bg-tone-waiting-soft/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <p className="font-semibold">
                {t('invoices.pending')} · <bdi className="ltr-nums font-mono">{o.pendingInvoice.invoiceNumber}</bdi>
              </p>
              <p className="text-xs text-muted-foreground">
                {o.pendingInvoice.awaitingConfirmation ? t('invoices.awaiting') : t('invoices.due', { date: formatDate(o.pendingInvoice.periodStart, lang) })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Money value={o.pendingInvoice.amount} className="text-lg font-bold" />
              <Button size="lg" onClick={() => onOpenInvoice(o.pendingInvoice!.id)}>
                {isOwner ? t('pay.title') : t('invoices.open')}
              </Button>
            </div>
          </div>
        )}

        {sub && isOwner && !isEnded(sub.status) && (
          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div>
              <label htmlFor="sub-autopay" className="cursor-pointer text-sm font-medium">
                {t('actions.autoPay')}
              </label>
              <p className="text-xs text-muted-foreground">{t('actions.autoPayHint')}</p>
              {o.walletAvailableAmount !== null && <p className="text-xs text-muted-foreground">{t('pay.walletBalance', { amount: formatMoney(o.walletAvailableAmount, lang) })}</p>}
            </div>
            <Switch id="sub-autopay" checked={sub.autoPayFromWallet} disabled={autoPay.isPending} onCheckedChange={(v) => autoPay.mutate(v)} />
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function PlanCard({ plan: p, current, action }: { plan: CounterPlanResponse; current: boolean; action: ReactNode }) {
  const { t } = useTranslation('subscription')
  const { lang, pick } = useLang()
  const saving = yearlySaving(p)
  return (
    <Card className={cn('flex flex-col', current && 'border-primary ring-1 ring-primary')}>
      <CardBody className="flex flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold">{pick(p.nameAr, p.nameEn)}</h3>
          {current && <Badge tone="active">{t('plans.current')}</Badge>}
        </div>
        {(p.descriptionAr || p.descriptionEn) && <p className="text-sm text-muted-foreground">{pick(p.descriptionAr, p.descriptionEn)}</p>}
        <div>
          <p className="tabular text-2xl font-bold">{t('plans.monthly', { price: formatMoney(p.monthlyPrice, lang) })}</p>
          <p className="tabular text-sm text-muted-foreground">{t('plans.yearly', { price: formatMoney(p.yearlyPrice, lang) })}</p>
          {saving > 0 && <p className="text-xs font-medium text-tone-success">{t('plans.saving', { amount: formatMoney(saving, lang) })}</p>}
        </div>
        <ul className="space-y-1 text-sm">
          <li>{t('plans.includedBranches', { count: p.includedBranches })}</li>
          <li>{t('plans.extraBranch', { price: formatMoney(p.extraBranchMonthlyPrice, lang) })}</li>
          <li>{t('plans.whatsApp', { count: p.whatsAppMonthlyQuota })}</li>
          {p.trialDays > 0 && <li>{t('plans.trial', { count: p.trialDays })}</li>}
          {p.graceDays > 0 && <li className="text-muted-foreground">{t('plans.grace', { count: p.graceDays })}</li>}
        </ul>
        {action && <div className="mt-auto pt-2">{action}</div>}
      </CardBody>
    </Card>
  )
}

function CancelDialog({ overview, open, onOpenChange }: { overview: ProviderSubscriptionOverviewResponse; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('subscription')
  const { pick } = useLang()
  const sub = overview.subscription
  const action = useAction({
    mutationFn: () => subscriptionApi.cancel(),
    invalidate: SUBSCRIPTION_INVALIDATION,
    success: t('cancel.done'),
    onSuccess: () => onOpenChange(false),
  })
  if (!sub) return null
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      destructive
      title={t('cancel.title')}
      target={pick(sub.plan.nameAr, sub.plan.nameEn)}
      changes={cancelsAtOnce(sub.status) ? t('cancel.atOnce') : t('cancel.atPeriodEnd')}
      confirmLabel={t('actions.cancel')}
      submitting={action.isPending}
      error={action.error}
      onSubmit={() => action.mutate(undefined)}
    />
  )
}

function InvoicesCard({
  status,
  page,
  pageSize,
  onState,
  onOpen,
}: {
  status: string
  page: number
  pageSize: number
  onState: (patch: { status?: string; page?: number; pageSize?: number }) => void
  onOpen: (id: string) => void
}) {
  const { t } = useTranslation('subscription')
  const { lang, pick } = useLang()
  const params = { status: (status || undefined) as SubscriptionInvoiceStatus | undefined, page, pageSize }
  const query = useInvoices(params)
  const columns = useMemo<ColumnDef<CounterInvoiceResponse, unknown>[]>(
    () => [
      {
        id: 'number',
        header: t('invoices.number'),
        meta: { alwaysVisible: true, cardTitle: true },
        cell: ({ row: { original: i } }) => (
          <div>
            <bdi className="ltr-nums font-mono text-sm font-medium">{i.invoiceNumber}</bdi>
            <div className="text-xs text-muted-foreground">
              {pick(i.planNameAr, i.planNameEn)} · {enumLabel('SubscriptionBillingCycle', i.billingCycle, lang)}
            </div>
          </div>
        ),
      },
      {
        id: 'period',
        header: t('invoices.period'),
        cell: ({ row: { original: i } }) => (
          <span className="tabular text-xs">
            {formatDate(i.periodStart, lang)} → {formatDate(i.periodEnd, lang)}
          </span>
        ),
      },
      {
        id: 'status',
        header: t('invoices.status'),
        cell: ({ row: { original: i } }) => (
          <div className="flex flex-col items-start gap-1">
            <StatusBadge enum="SubscriptionInvoiceStatus" value={i.status} />
            {i.awaitingConfirmation && <span className="text-[0.6875rem] text-tone-waiting">{t('invoices.awaiting')}</span>}
          </div>
        ),
      },
      { id: 'amount', header: t('invoices.amount'), meta: { align: 'end' }, cell: ({ row: { original: i } }) => <Money value={i.amount} className="font-semibold" /> },
      { id: 'created', header: t('common:common.createdAt'), meta: { cardHidden: true }, cell: ({ row: { original: i } }) => <DateTime value={i.createdAt} className="text-xs text-muted-foreground" /> },
    ],
    [t, lang, pick],
  )
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">{t('invoices.title')}</h2>
      <DataTable
        id="subscription-invoices"
        columns={columns}
        query={query}
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => onState({ page: p })}
        onPageSizeChange={(s) => onState({ pageSize: s })}
        getRowId={(i) => i.id}
        onRowClick={(i) => onOpen(i.id)}
        filtered={!!status}
        onClearFilters={() => onState({ status: '' })}
        emptyTitle={t('invoices.empty')}
        toolbar={<EnumFilter enumName="SubscriptionInvoiceStatus" value={status} onChange={(v) => onState({ status: v })} label={t('invoices.status')} />}
      />
    </section>
  )
}
