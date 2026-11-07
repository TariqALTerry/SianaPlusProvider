import { useQuery } from '@tanstack/react-query'
import { ExternalLink, FileUp, Hourglass, Wallet } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { fileUrl, MAX_UPLOAD_BYTES, UPLOAD_ACCEPT, validateUpload } from '@/api/files'
import { toApiError } from '@/api/http'
import type { CounterInvoiceResponse, ProviderSubscriptionOverviewResponse } from '@/api/types'
import { DateTime, Money } from '@/components/Format'
import { KeyValue } from '@/components/KeyValue'
import { ErrorState, InlineError } from '@/components/States'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { i18next } from '@/i18n'
import { enumLabel } from '@/i18n/enums'
import { formatDate, formatMoney } from '@/lib/format'
import { SUBSCRIPTION_INVALIDATION, subscriptionApi, subscriptionKeys } from '../api'
import { canPayFromWallet, walletShortfall } from '../logic'
import '../i18n'

interface Props {
  invoiceId: string | null
  onOpenChange: (open: boolean) => void
  overview: ProviderSubscriptionOverviewResponse | undefined
  isOwner: boolean
}

/**
 * One counter invoice: its period and amount, and — for the owner while it is unpaid — pay from the wallet (instant)
 * or send a bank-transfer receipt (the invoice stays Pending, "بانتظار تأكيد المنصة", until the platform confirms).
 */
export function InvoiceDialog({ invoiceId, onOpenChange, overview, isOwner }: Props) {
  const { t } = useTranslation('subscription')
  const query = useQuery({
    queryKey: subscriptionKeys.invoice(invoiceId ?? ''),
    queryFn: ({ signal }) => subscriptionApi.invoice(invoiceId!, signal),
    enabled: !!invoiceId,
  })

  return (
    <Dialog open={!!invoiceId} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{t('pay.title')}</DialogTitle>
          {query.data && (
            <DialogDescription>
              <bdi className="ltr-nums font-mono">{query.data.invoiceNumber}</bdi>
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogBody className="space-y-4">
          {query.isPending ? (
            <Skeleton className="h-40" />
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
          ) : (
            <InvoiceBody invoice={query.data} overview={overview} isOwner={isOwner} />
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

function InvoiceBody({ invoice: i, overview, isOwner }: { invoice: CounterInvoiceResponse; overview: ProviderSubscriptionOverviewResponse | undefined; isOwner: boolean }) {
  const { t } = useTranslation('subscription')
  const { lang, pick } = useLang()
  const uid = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [reference, setReference] = useState(i.reference ?? '')

  const pay = useAction({
    mutationFn: () => subscriptionApi.payFromWallet(i.id),
    invalidate: SUBSCRIPTION_INVALIDATION,
    success: t('pay.walletDone'),
  })
  const proof = useAction({
    mutationFn: () => subscriptionApi.submitTransferProof(i.id, file!, reference.trim() || null),
    invalidate: SUBSCRIPTION_INVALIDATION,
    success: t('pay.proofSent'),
    onSuccess: () => setFile(null),
  })
  useEffect(() => setReference(i.reference ?? ''), [i.reference])

  const pending = i.status === 'Pending'
  const shortfall = toApiError(pay.error).errorCode === 'WalletBalanceInsufficient' ? walletShortfall(toApiError(pay.error).details) : null
  const receipt = fileUrl(i.receiptUrl)

  const pickFile = (f: File | undefined) => {
    setFileError(null)
    if (!f) return
    const problem = validateUpload(f)
    if (problem) {
      setFileError(problem === 'TooLarge' ? i18next.t('errors.uploadTooLarge') : i18next.t('errors.uploadBadExtension'))
      return
    }
    setFile(f)
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <StatusBadge enum="SubscriptionInvoiceStatus" value={i.status} />
        <Money value={i.amount} className="text-2xl font-bold" />
      </div>
      {i.awaitingConfirmation && (
        <p className="flex items-center gap-2 rounded-md bg-tone-waiting-soft px-3 py-2 text-sm text-tone-waiting" role="status">
          <Hourglass className="size-4" /> {t('invoices.awaiting')}
        </p>
      )}
      <KeyValue
        items={[
          { label: t('subscribe.plan'), value: `${pick(i.planNameAr, i.planNameEn)} · ${enumLabel('SubscriptionBillingCycle', i.billingCycle, lang)}` },
          { label: t('subscribe.extraBranches'), value: i.extraBranches },
          { label: t('invoices.period'), value: `${formatDate(i.periodStart, lang)} → ${formatDate(i.periodEnd, lang)}` },
          { label: t('invoices.dueLabel'), value: <DateTime value={i.periodStart} mode="date" />, hidden: !pending },
          { label: t('pay.title'), value: i.paidAt ? t('invoices.paidVia', { date: formatDate(i.paidAt, lang), method: i.paymentMethod ? enumLabel('SubscriptionPaymentMethod', i.paymentMethod, lang) : '' }) : null, hidden: !i.paidAt },
          { label: t('pay.reference'), value: i.reference, hidden: !i.reference },
          { label: t('pay.proofLabel'), value: <DateTime value={i.proofSubmittedAt} />, hidden: !i.proofSubmittedAt },
          { label: t('common:common.notes'), value: i.notes ?? i.cancellationReason, wide: true, hidden: !i.notes && !i.cancellationReason },
        ]}
      />
      {receipt && (
        <Button asChild size="sm" variant="outline">
          <a href={receipt} target="_blank" rel="noreferrer">
            <ExternalLink /> {t('invoices.receipt')}
          </a>
        </Button>
      )}

      {pending && isOwner && (
        <div className="space-y-4 border-t pt-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold">{t('pay.wallet')}</p>
            {overview?.walletAvailableAmount !== null && overview?.walletAvailableAmount !== undefined && (
              <p className="text-xs text-muted-foreground">{t('pay.walletBalance', { amount: formatMoney(overview.walletAvailableAmount, lang) })}</p>
            )}
            <Button size="lg" onClick={() => pay.mutate(undefined)} loading={pay.isPending} disabled={!overview || !canPayFromWallet(overview, i)}>
              <Wallet /> {t('pay.wallet')}
            </Button>
            {shortfall !== null ? <p className="text-sm text-tone-danger">{t('pay.walletShort', { amount: formatMoney(shortfall, lang) })}</p> : <InlineError error={pay.error} />}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">{t('pay.transfer')}</p>
            <p className="text-xs text-muted-foreground">{t('pay.transferHint')}</p>
            {/* The platform's bank details have no endpoint yet (phase 3 §4): point to support rather than invent them. */}
            <p className="text-xs">
              {t('pay.bankDetails')}{' '}
              <Link to="/support" className="text-primary underline">
                {t('pay.contactSupport')}
              </Link>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => fileInput.current?.click()}>
                <FileUp /> {file ? file.name : t('pay.proof')}
              </Button>
              <input ref={fileInput} type="file" accept={UPLOAD_ACCEPT} className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
              <span className="text-xs text-muted-foreground">≤ {Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB</span>
            </div>
            {fileError && <p className="text-xs text-destructive">{fileError}</p>}
            <Field label={t('pay.reference')} htmlFor={`${uid}-ref`} optional>
              <Input id={`${uid}-ref`} dir="ltr" value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} />
            </Field>
            <Button onClick={() => proof.mutate(undefined)} loading={proof.isPending} disabled={!file}>
              {i.proofSubmittedAt ? t('pay.replaceProof') : t('pay.sendProof')}
            </Button>
            <InlineError error={proof.error} />
          </div>
          <p className="text-xs text-muted-foreground">{t('pay.cardSoon')}</p>
        </div>
      )}
    </>
  )
}
