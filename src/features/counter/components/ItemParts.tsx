import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fileUrl } from '@/api/files'
import type { CounterItemDetailResponse, CustomerApprovalResponse, EvidenceResponse, QuotationResponse } from '@/api/types'
import { DateTime, Money } from '@/components/Format'
import { KeyValue } from '@/components/KeyValue'
import { Badge } from '@/components/ui/badge'
import { EnumText, StatusBadge } from '@/components/StatusBadge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { useLang } from '@/hooks/useLang'
import { enumLabel } from '@/i18n/enums'
import { formatDateTime, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { balanceState } from '../logic'
import '../i18n'
import '../opsI18n'

/**
 * Intake and technician photos. Their URLs are signed for 15 minutes (`api/public/files/{token}`): shown at full size
 * with `object-fit` (no `?w=` thumbnails there), and renewed by reading the detail again.
 */
export function PhotoGrid({ photos }: { photos: EvidenceResponse[] }) {
  const { t } = useTranslation('counter')
  const { lang } = useLang()
  const [open, setOpen] = useState<EvidenceResponse | null>(null)
  if (!photos.length) return <p className="text-sm text-muted-foreground">{t('item.noPhotos')}</p>
  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {photos.map((p) => (
          <button key={p.id} type="button" onClick={() => setOpen(p)} className="overflow-hidden rounded-md border bg-muted/40" title={enumLabel('EvidenceStage', p.stage, lang)}>
            <img src={fileUrl(p.url)} alt={p.caption ?? enumLabel('EvidenceStage', p.stage, lang)} loading="lazy" className="aspect-square w-full object-cover" />
          </button>
        ))}
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent size="xl" className="p-2">
          <DialogTitle className="sr-only">{t('item.photos')}</DialogTitle>
          {open && <img src={fileUrl(open.url)} alt={open.caption ?? ''} className="max-h-[80vh] w-full rounded object-contain" />}
        </DialogContent>
      </Dialog>
    </>
  )
}

/** The intake receipt: accessories, condition, estimate and fees, the promise and who received it. */
export function IntakeFacts({ detail }: { detail: CounterItemDetailResponse }) {
  const { t } = useTranslation('counter')
  const { lang } = useLang()
  const i = detail.intake
  if (!i) return null
  const estimate =
    i.estimateType === 'Fixed' ? (
      <Money value={i.estimateMin} />
    ) : i.estimateType === 'Range' ? (
      <span>
        <Money value={i.estimateMin} /> – <Money value={i.estimateMax} />
      </span>
    ) : i.estimateType ? (
      <EnumText enum="IntakeEstimateType" value={i.estimateType} />
    ) : null
  return (
    <KeyValue
      columns={3}
      items={[
        { label: t('item.accessories'), value: [...i.accessories.map((a) => enumLabel('IntakeAccessory', a, lang)), i.accessoriesNote].filter(Boolean).join('، ') || null },
        {
          label: t('item.conditions'),
          value: (
            <span className="flex flex-wrap gap-1">
              {i.conditions.filter((c) => c !== 'None').length === 0 ? (
                <StatusBadge enum="IntakeCondition" value="None" dot={false} />
              ) : (
                i.conditions.filter((c) => c !== 'None').map((c) => <StatusBadge key={c} enum="IntakeCondition" value={c} dot={false} />)
              )}
            </span>
          ),
        },
        { label: t('item.powersOn'), value: i.powersOn ? <StatusBadge enum="PowersOnState" value={i.powersOn} /> : null },
        { label: t('wizard.conditionNotes'), value: i.conditionNotes, wide: true, hidden: !i.conditionNotes },
        { label: t('item.lockCode'), value: i.hasLockCode ? t('item.hasLockCode') : t('item.noLockCode') },
        { label: t('item.estimate'), value: estimate },
        { label: t('item.inspectionFee'), value: <Money value={i.inspectionFee} /> },
        { label: t('item.deposit'), value: <Money value={i.deposit} /> },
        { label: t('item.promised'), value: i.promisedReadyAt ? <DateTime value={i.promisedReadyAt} mode="absolute" /> : null },
        { label: t('item.termsVersion'), value: i.termsVersion ?? null },
        { label: t('col.received'), value: <DateTime value={i.receivedAt} mode="absolute" /> },
        { label: t('item.receivedByLabel'), value: i.receivedByName },
        { label: t('wizard.customerNotes'), value: detail.customerDescription, wide: true, hidden: !detail.customerDescription },
      ]}
    />
  )
}

/** Amount, discount, due, paid and balance; negative balance means the shop owes the customer. */
export function MoneySummary({ detail }: { detail: CounterItemDetailResponse }) {
  const { t } = useTranslation('counter')
  const { t: tOps } = useTranslation('counterOps')
  const { lang } = useLang()
  const m = detail.money
  const state = balanceState(m.balance)
  const rows: Array<{ label: string; value: number; hidden?: boolean; negative?: boolean }> = [
    { label: t('item.amount'), value: m.amount },
    { label: t('item.discount'), value: -m.discount, hidden: m.discount === 0, negative: true },
    {
      label: detail.storage.feePerDay ? tOps('storage.line', { days: detail.storage.chargeableDays, fee: formatMoney(detail.storage.feePerDay, lang) }) : t('item.storageFee'),
      value: m.storageFee,
      hidden: m.storageFee === 0,
    },
    { label: t('item.amountDue'), value: m.amountDue },
    { label: t('item.paid'), value: m.paid },
  ]
  return (
    <div className="space-y-2">
      <dl className="space-y-1 text-sm">
        {rows
          .filter((r) => !r.hidden)
          .map((r) => (
            <div key={r.label} className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd>
                <Money value={r.value} className={cn(r.negative && 'text-tone-success')} />
              </dd>
            </div>
          ))}
      </dl>
      <div
        className={cn(
          'flex items-center justify-between rounded-lg px-3 py-2',
          state === 'due' ? 'bg-tone-danger-soft text-tone-danger' : state === 'credit' ? 'bg-tone-info-soft text-tone-info' : 'bg-tone-success-soft text-tone-success',
        )}
      >
        <span className="text-sm font-medium">{state === 'credit' ? t('item.credit') : state === 'settled' ? t('item.settled') : t('item.balance')}</span>
        <Money value={Math.abs(m.balance)} className="text-lg font-bold" />
      </div>
      {m.debt > 0 && (
        <p className="flex justify-between text-sm text-tone-danger">
          <span>{t('item.debt')}</span>
          <Money value={m.debt} />
        </p>
      )}
      {detail.intake?.discountReason && m.discount > 0 && <p className="text-xs text-muted-foreground">{detail.intake.discountReason}</p>}
    </div>
  )
}

export function PaymentsList({ detail }: { detail: CounterItemDetailResponse }) {
  const { t } = useTranslation('counter')
  if (!detail.payments.length) return <p className="text-sm text-muted-foreground">{t('item.noPayments')}</p>
  return (
    <ul className="divide-y text-sm">
      {detail.payments.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-2 py-2">
          <span className="min-w-0">
            <span className="block font-medium">
              {p.kind ? <EnumText enum="CounterPaymentKind" value={p.kind} /> : null} · <EnumText enum="PaymentMethod" value={p.method} />
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              <bdi className="ltr-nums font-mono">{p.paymentNumber}</bdi>
              {p.reference && <> · {p.reference}</>}
              {p.collectedByName && <> · {p.collectedByName}</>} · <DateTime value={p.paidAt} />
            </span>
          </span>
          <Money value={p.amount} className="font-semibold" />
        </li>
      ))}
    </ul>
  )
}

/** One quotation: its lines, each line's warranty days and whether it comes from stock (phase 6 §10), and the total. */
export function QuotationLines({ quotation: q }: { quotation: QuotationResponse }) {
  const { t } = useTranslation('counter')
  const { t: tOps } = useTranslation('counterOps')
  const { lang } = useLang()
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <bdi className="ltr-nums font-mono text-sm">{q.quotationNumber}</bdi>
          <StatusBadge enum="QuotationStatus" value={q.status} />
        </span>
        <Money value={q.total} className="text-base font-semibold" />
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <THead>
            <Tr>
              <Th>{t('col.device')}</Th>
              <Th className="text-end">×</Th>
              <Th>{tOps('quotation.warranty')}</Th>
              <Th className="text-end">{t('item.amount')}</Th>
            </Tr>
          </THead>
          <TBody>
            {q.items.map((line) => (
              <Tr key={line.id}>
                <Td className="text-sm">
                  <span className="me-1 text-xs text-muted-foreground">
                    <EnumText enum="PriceItemType" value={line.itemType} />
                  </span>
                  {line.description}
                  {line.partItemId && (
                    <Badge tone="info" className="ms-1.5 align-middle">
                      {tOps('quotation.fromStock')}
                    </Badge>
                  )}
                </Td>
                <Td className="tabular text-end">{line.quantity}</Td>
                <Td className="whitespace-nowrap text-xs">{line.warrantyDays ? tOps('quotation.warrantyDays', { count: line.warrantyDays }) : '—'}</Td>
                <Td className="text-end">
                  <Money value={line.total} />
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </div>
      {q.discountAmount > 0 && (
        <p className="flex justify-between text-xs text-muted-foreground">
          <span>{t('item.discount')}</span>
          <Money value={-q.discountAmount} />
        </p>
      )}
      {q.notes && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{q.notes}</p>}
      {q.expiresAt && q.status === 'Sent' && <p className="text-xs text-muted-foreground">{t('item.expiresAt', { date: formatDateTime(q.expiresAt, lang) })}</p>}
    </div>
  )
}

/** Calls and recorded answers, newest first. */
export function ApprovalsList({ approvals }: { approvals: CustomerApprovalResponse[] }) {
  const { t } = useTranslation('counter')
  if (!approvals.length) return <p className="text-sm text-muted-foreground">{t('item.noApprovals')}</p>
  return (
    <ul className="divide-y text-sm">
      {approvals.map((a) => (
        <li key={a.id} className="space-y-0.5 py-2">
          <div className="flex flex-wrap items-center gap-2">
            {a.decision ? <StatusBadge enum="CustomerApprovalDecision" value={a.decision} /> : null}
            {a.callOutcome && <StatusBadge enum="CallOutcome" value={a.callOutcome} dot={false} />}
            <span className="text-xs text-muted-foreground">
              <EnumText enum="CustomerApprovalMethod" value={a.method} />
              {a.recordedByName && ` · ${a.recordedByName}`} · <DateTime value={a.at} />
            </span>
          </div>
          {a.note && <p className="text-sm">{a.note}</p>}
        </li>
      ))}
    </ul>
  )
}
