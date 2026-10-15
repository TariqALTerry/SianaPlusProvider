import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowDownToLine, Banknote, CheckCircle2, Hourglass, Landmark, Loader, Pencil } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { WalletItemResponse, WalletResponse, WithdrawalResponse } from '@/api/types'
import { listQueryOptions } from '@/api/queryClient'
import { ActionDialog, ConfirmDialog } from '@/components/ActionDialog'
import { DataTable } from '@/components/DataTable'
import { EntityLink } from '@/components/EntityLink'
import { QuickTabs } from '@/components/Filters'
import { DateTime, Money } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { ErrorState } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Tooltip } from '@/components/ui/menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useProvider } from '@/app/provider'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { paginationDefaults, useUrlState } from '@/hooks/useUrlState'
import { formatDate, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { walletApi, walletInvalidation, walletKeys } from './api'
import { formatIban, isSaudiIban, normalizeIban, WALLET_TABS, withdrawBlock, type WalletTab } from './logic'
import './i18n'

const schema = { ...paginationDefaults, tab: 'available' }

/**
 * `/wallet` (PROVIDER-PLATFORM-PHASE2-PROMPT §1): the four money tiles, the bank account and the
 * withdraw button (owner only), then available / on-hold services and the withdrawals.
 */
export function WalletPage() {
  const { t } = useTranslation('wallet')
  const { isOwner } = useProvider()
  const summary = useQuery({ queryKey: walletKeys.summary, queryFn: ({ signal }) => walletApi.summary(signal), refetchOnWindowFocus: true })
  const { state, set } = useUrlState(schema)
  const tab: WalletTab = (WALLET_TABS as readonly string[]).includes(state.tab) ? (state.tab as WalletTab) : 'available'
  const [withdrawing, setWithdrawing] = useState(false)
  const [editingBank, setEditingBank] = useState(false)

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={isOwner && summary.data ? <WithdrawButton wallet={summary.data} onClick={() => setWithdrawing(true)} /> : undefined}
      />

      {summary.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-busy>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : summary.isError ? (
        <Card>
          <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
        </Card>
      ) : (
        <div className="space-y-4">
          <Tiles wallet={summary.data} />
          <BankCard wallet={summary.data} isOwner={isOwner} onEdit={() => setEditingBank(true)} />
        </div>
      )}

      <QuickTabs
        className="mb-3 mt-6"
        value={tab}
        onChange={(key) => set({ tab: key, page: 1 })}
        tabs={WALLET_TABS.map((key) => ({ key, label: t(`tab.${key}`) }))}
      />
      {tab === 'withdrawals' ? (
        <WithdrawalsTable page={state.page} pageSize={state.pageSize} onPage={(page) => set({ page })} onPageSize={(pageSize) => set({ pageSize })} />
      ) : (
        <ItemsTable
          bucket={tab === 'onHold' ? 'OnHold' : 'Available'}
          page={state.page}
          pageSize={state.pageSize}
          onPage={(page) => set({ page })}
          onPageSize={(pageSize) => set({ pageSize })}
        />
      )}

      {isOwner && summary.data && <WithdrawDialog open={withdrawing} onOpenChange={setWithdrawing} wallet={summary.data} />}
      {isOwner && <BankAccountDialog open={editingBank} onOpenChange={setEditingBank} />}
    </>
  )
}

const toneIcon = {
  success: 'bg-tone-success-soft text-tone-success',
  waiting: 'bg-tone-waiting-soft text-tone-waiting',
  info: 'bg-tone-info-soft text-tone-info',
  muted: 'bg-muted text-muted-foreground',
} as const

function Tile({ icon, tone, label, value, sub, big }: { icon: ReactNode; tone: keyof typeof toneIcon; label: string; value: ReactNode; sub: string; big?: boolean }) {
  return (
    <Card className={cn('flex items-start gap-3 px-4 py-3', big && 'border-tone-success/40 bg-tone-success-soft/30')}>
      <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md', toneIcon[tone])} aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn('tabular mt-1 font-semibold', big ? 'text-2xl' : 'text-xl')}>{value}</div>
        <div className="tabular mt-0.5 text-xs text-muted-foreground">{sub}</div>
      </div>
    </Card>
  )
}

function Tiles({ wallet: w }: { wallet: WalletResponse }) {
  const { t } = useTranslation('wallet')
  const { lang } = useLang()
  return (
    <div className="space-y-1.5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          big
          icon={<Banknote className="size-4" />}
          tone="success"
          label={t('available')}
          value={<Money value={w.availableAmount} />}
          sub={t('availableItems', { count: w.availableItems })}
        />
        <Tile
          icon={<Hourglass className="size-4" />}
          tone="waiting"
          label={t('onHold')}
          value={<Money value={w.onHoldAmount} />}
          sub={w.nextReleaseAt ? t('releasesAt', { date: formatDate(w.nextReleaseAt, lang) }) : t('nothingOnHold')}
        />
        <Tile icon={<Loader className="size-4" />} tone="info" label={t('inProcessing')} value={<Money value={w.inProcessingAmount} />} sub={t('inProcessingHint')} />
        <Tile
          icon={<CheckCircle2 className="size-4" />}
          tone="muted"
          label={t('paid')}
          value={<Money value={w.paidAmount} />}
          sub={w.lastPaidAt ? t('lastPaid', { date: formatDate(w.lastPaidAt, lang) }) : t('neverPaid')}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {t('howItWorks', { days: w.holdDays })} {t('disputeNote')}
      </p>
    </div>
  )
}

function WithdrawButton({ wallet: w, onClick }: { wallet: WalletResponse; onClick: () => void }) {
  const { t } = useTranslation('wallet')
  const { lang } = useLang()
  const block = w.canWithdraw ? null : withdrawBlock(w.cannotWithdrawReason) ?? 'Unknown'
  const button = (
    <Button size="sm" onClick={onClick} disabled={!!block}>
      <ArrowDownToLine /> {t('withdraw')}
    </Button>
  )
  if (!block) return button
  // A disabled button gets no pointer events: the tooltip sits on a wrapper.
  return (
    <Tooltip content={t(`reason.${block}`, { min: formatMoney(w.minWithdrawalAmount, lang, false) })}>
      <span tabIndex={0} className="inline-flex" data-withdraw-block={block}>
        {button}
      </span>
    </Tooltip>
  )
}

function BankCard({ wallet: w, isOwner, onEdit }: { wallet: WalletResponse; isOwner: boolean; onEdit: () => void }) {
  const { t } = useTranslation('wallet')
  const bank = w.bankAccount
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Landmark className="size-4 text-muted-foreground" /> {t('bank.title')}
          </span>
        }
        actions={
          isOwner ? (
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil /> {bank ? t('bank.edit') : t('bank.add')}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">{t('bank.ownerOnly')}</span>
          )
        }
      />
      <CardBody>
        {bank ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">{t('bank.name')}</dt>
              <dd className="font-medium">{bank.bankName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('bank.iban')}</dt>
              <dd dir="ltr" className="tabular text-start font-mono">
                {bank.ibanMasked}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('bank.holder')}</dt>
              <dd className="font-medium">{bank.accountHolderName}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">{t('bank.none')}</p>
        )}
      </CardBody>
    </Card>
  )
}

function WithdrawDialog({ open, onOpenChange, wallet: w }: { open: boolean; onOpenChange: (open: boolean) => void; wallet: WalletResponse }) {
  const { t } = useTranslation('wallet')
  const { lang } = useLang()
  const [note, setNote] = useState('')
  useEffect(() => {
    if (open) setNote('')
  }, [open])
  const withdraw = useAction({
    mutationFn: () => walletApi.withdraw(note.trim() || null),
    invalidate: walletInvalidation,
    success: t('withdrawSent'),
    onSuccess: () => onOpenChange(false),
  })
  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('withdrawTitle')}
      target={t('withdrawConfirm', { amount: formatMoney(w.availableAmount, lang, false), iban: `⁦${w.bankAccount?.ibanMasked ?? ''}⁩` })}
      description={t('withdrawAll')}
      confirmLabel={t('withdraw')}
      submitting={withdraw.isPending}
      error={withdraw.error}
      onSubmit={() => withdraw.mutate()}
    >
      <Field label={t('note')} htmlFor="withdraw-note">
        <Textarea id="withdraw-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </ActionDialog>
  )
}

function BankAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('wallet')
  const current = useQuery({ queryKey: walletKeys.bankAccount, queryFn: ({ signal }) => walletApi.bankAccount(signal), enabled: open, staleTime: 0 })
  const [bankName, setBankName] = useState('')
  const [iban, setIban] = useState('')
  const [holder, setHolder] = useState('')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    setTouched(false)
    setBankName(current.data?.bankName ?? '')
    setIban(formatIban(current.data?.iban ?? ''))
    setHolder(current.data?.accountHolderName ?? '')
  }, [open, current.data])

  const save = useAction({
    mutationFn: () => walletApi.saveBankAccount({ bankName: bankName.trim(), iban: normalizeIban(iban), accountHolderName: holder.trim() }),
    invalidate: walletInvalidation,
    success: t('bank.saved'),
    onSuccess: () => onOpenChange(false),
  })

  const errors = { bankName: !bankName.trim(), iban: !isSaudiIban(iban), holder: !holder.trim() }
  const valid = !errors.bankName && !errors.iban && !errors.holder

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('bank.title')}
      confirmLabel={t('bank.edit')}
      submitting={save.isPending}
      error={save.error}
      onSubmit={() => {
        setTouched(true)
        if (valid) save.mutate()
      }}
    >
      <div className="space-y-3">
        <Field label={t('bank.name')} htmlFor="bank-name" required error={touched && errors.bankName ? t('bank.required') : undefined}>
          <Input id="bank-name" value={bankName} maxLength={100} onChange={(e) => setBankName(e.target.value)} />
        </Field>
        <Field label={t('bank.iban')} htmlFor="bank-iban" required hint={t('bank.ibanHint')} error={touched && errors.iban ? t('bank.ibanInvalid') : undefined}>
          <Input
            id="bank-iban"
            dir="ltr"
            className="font-mono"
            inputMode="text"
            autoComplete="off"
            placeholder="SA00 0000 0000 0000 0000 0000"
            value={iban}
            onChange={(e) => setIban(formatIban(e.target.value))}
          />
        </Field>
        <Field label={t('bank.holder')} htmlFor="bank-holder" required error={touched && errors.holder ? t('bank.required') : undefined}>
          <Input id="bank-holder" value={holder} maxLength={150} onChange={(e) => setHolder(e.target.value)} />
        </Field>
      </div>
    </ActionDialog>
  )
}

function ItemsTable({
  bucket,
  page,
  pageSize,
  onPage,
  onPageSize,
}: {
  bucket: 'Available' | 'OnHold'
  page: number
  pageSize: number
  onPage: (p: number) => void
  onPageSize: (s: number) => void
}) {
  const { t } = useTranslation('wallet')
  const { pick } = useLang()
  const params = { bucket, page, pageSize }
  const query = useQuery({ queryKey: walletKeys.items(params), queryFn: ({ signal }) => walletApi.items(params, signal), ...listQueryOptions })
  const columns = useMemo<ColumnDef<WalletItemResponse, unknown>[]>(
    () => [
      {
        id: 'service',
        header: t('col.service'),
        meta: { alwaysVisible: true },
        cell: ({ row: { original: i } }) => (
          <div>
            <div className="font-medium">{pick(i.serviceNameAr, i.serviceNameEn)}</div>
            {i.itemNumber && <EntityLink kind="workItem" id={i.serviceItemId} label={i.itemNumber} mono />}
          </div>
        ),
      },
      { id: 'completedAt', header: t('col.completedAt'), cell: ({ row: { original: i } }) => <DateTime value={i.completedAt} mode="date" /> },
      { id: 'gross', header: t('col.gross'), meta: { align: 'end' }, cell: ({ row: { original: i } }) => <Money value={i.grossAmount} /> },
      { id: 'commission', header: t('col.commission'), meta: { align: 'end' }, cell: ({ row: { original: i } }) => <Money value={-i.commissionAmount} /> },
      { id: 'net', header: t('col.net'), meta: { align: 'end' }, cell: ({ row: { original: i } }) => <Money value={i.netAmount} className="font-semibold" /> },
      ...(bucket === 'OnHold'
        ? [{ id: 'availableAt', header: t('col.availableAt'), cell: ({ row: { original: i } }) => <DateTime value={i.availableAt} mode="date" /> } satisfies ColumnDef<WalletItemResponse, unknown>]
        : []),
    ],
    [t, pick, bucket],
  )
  return (
    <DataTable
      id={`wallet-${bucket}`}
      columns={columns}
      query={query}
      page={page}
      pageSize={pageSize}
      onPageChange={onPage}
      onPageSizeChange={onPageSize}
      getRowId={(i) => i.serviceItemId}
      emptyTitle={bucket === 'OnHold' ? t('emptyOnHold') : t('emptyAvailable')}
    />
  )
}

function WithdrawalsTable({ page, pageSize, onPage, onPageSize }: { page: number; pageSize: number; onPage: (p: number) => void; onPageSize: (s: number) => void }) {
  const { t } = useTranslation('wallet')
  const { isOwner } = useProvider()
  const [cancelling, setCancelling] = useState<WithdrawalResponse | null>(null)
  const params = { page, pageSize }
  const query = useQuery({ queryKey: walletKeys.withdrawals(params), queryFn: ({ signal }) => walletApi.withdrawals(params, signal), ...listQueryOptions })
  const cancel = useAction({
    mutationFn: (id: string) => walletApi.cancel(id),
    invalidate: walletInvalidation,
    success: t('cancelled'),
    onSuccess: () => setCancelling(null),
  })

  const columns = useMemo<ColumnDef<WithdrawalResponse, unknown>[]>(
    () => [
      {
        id: 'status',
        header: t('col.status'),
        meta: { alwaysVisible: true },
        cell: ({ row: { original: w } }) => (
          <div className="space-y-1">
            <StatusBadge enum="ProviderWithdrawalStatus" value={w.status} />
            {w.status === 'Rejected' && w.rejectionReason && <p className="max-w-[16rem] text-xs text-tone-danger">{t('rejectedBecause', { reason: w.rejectionReason })}</p>}
          </div>
        ),
      },
      { id: 'amount', header: t('col.amount'), meta: { align: 'end' }, cell: ({ row: { original: w } }) => <Money value={w.amount} className="font-semibold" /> },
      { id: 'items', header: t('col.items'), meta: { align: 'end' }, cell: ({ row: { original: w } }) => <span className="tabular">{w.itemsCount}</span> },
      {
        id: 'account',
        header: t('col.account'),
        cell: ({ row: { original: w } }) => (
          <div className="text-xs">
            <div>{w.bankName}</div>
            <div dir="ltr" className="text-start font-mono text-muted-foreground">
              {w.ibanMasked}
            </div>
          </div>
        ),
      },
      {
        id: 'settlement',
        header: t('col.settlement'),
        cell: ({ row: { original: w } }) => (w.settlementNumber ? <EntityLink kind="settlement" id={w.settlementId} label={w.settlementNumber} mono /> : '—'),
      },
      {
        id: 'reference',
        header: t('col.reference'),
        cell: ({ row: { original: w } }) =>
          w.paymentReference ? (
            <span dir="ltr" className="font-mono text-xs">
              {w.paymentReference}
            </span>
          ) : (
            '—'
          ),
      },
      { id: 'requestedAt', header: t('col.requestedAt'), cell: ({ row: { original: w } }) => <DateTime value={w.createdAt} /> },
      { id: 'paidAt', header: t('col.paidAt'), cell: ({ row: { original: w } }) => <DateTime value={w.paidAt} mode="date" /> },
      {
        id: 'actions',
        header: '',
        meta: { alwaysVisible: true },
        cell: ({ row: { original: w } }) =>
          isOwner && w.status === 'Requested' ? (
            <Button size="xs" variant="ghost" className="text-tone-danger" onClick={() => setCancelling(w)}>
              {t('cancel')}
            </Button>
          ) : null,
      },
    ],
    [t, isOwner],
  )

  return (
    <>
      <DataTable
        id="wallet-withdrawals"
        columns={columns}
        query={query}
        page={page}
        pageSize={pageSize}
        onPageChange={onPage}
        onPageSizeChange={onPageSize}
        getRowId={(w) => w.id}
        emptyTitle={t('emptyWithdrawals')}
      />
      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(o) => !o && setCancelling(null)}
        title={t('cancelTitle')}
        description={t('cancelConfirm')}
        confirmLabel={t('cancelButton')}
        destructive
        submitting={cancel.isPending}
        error={cancel.error}
        onSubmit={() => cancelling && cancel.mutate(cancelling.id)}
      />
    </>
  )
}
