import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeftRight,
  PauseCircle,
  PlayCircle,
  Truck,
  Banknote,
  BadgePercent,
  CheckCircle2,
  ExternalLink,
  FileText,
  HandHelping,
  MessageCircle,
  PenLine,
  Phone,
  PhoneCall,
  Printer,
  RefreshCw,
  ShieldCheck,
  Tag,
  UserCog,
  Vote,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { fileUrl } from '@/api/files'
import { detailQueryOptions } from '@/api/queryClient'
import type { CounterItemDetailResponse } from '@/api/types'
import { DateTime, Money } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState, PageSkeleton } from '@/components/States'
import { StatusBadge } from '@/components/StatusBadge'
import { Timeline } from '@/components/Timeline'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/menu'
import { useRoleKind } from '@/features/auth/authStore'
import { CreateTransferDialog } from '@/features/branchOps/components/CreateTransferDialog'
import { CandidatePickerDialog } from '@/features/work/components/CandidatePickerDialog'
import { usePollingInterval } from '@/hooks/usePageVisible'
import { useLang } from '@/hooks/useLang'
import { enumLabel } from '@/i18n/enums'
import { formatDate, formatMoney } from '@/lib/format'
import { formatSaudiMobile } from '@/lib/phone'
import { counterApi, counterKeys } from './api'
import { CallLogDialog, DecisionDialog, DiscountDialog, HandoverDialog, PaymentDialog, SignDialog } from './components/CounterDialogs'
import { ApprovalsList, IntakeFacts, MoneySummary, PaymentsList, PhotoGrid, QuotationLines } from './components/ItemParts'
import { PauseDialog, ResumeDialog, type HoldTarget } from './components/OpsDialogs'
import { StorageCard, TrackingLinkCard, WhatsAppCard } from './components/OpsParts'
import { PhotoUploader } from './components/PhotoUploader'
import { useCounterDocuments } from './hooks'
import { can, holdActions, photosMissing } from './logic'
import './i18n'
import './opsI18n'

type DialogKind = 'call' | 'decision' | 'payment' | 'discount' | 'handover' | 'sign' | 'assign' | 'pause' | 'resume' | 'transfer'

/**
 * `/counter/items/:id` (phase 2 §6): everything about one walk-in device. The buttons come from `availableActions`;
 * printing and sharing are always there. Devices received before a gate closed are never locked (phase 3 §2).
 * Polled every 30 s until handed over; photo links are short-lived and renew with each read.
 * Phase 4 adds the WhatsApp log and the tracking link; phase 5 the hold reason, storage and abandon, transfers and the
 * rework link; phase 6 the warranty days on quotation lines.
 */
export function CounterItemPage() {
  const { id = '' } = useParams()
  const interval = usePollingInterval(30_000)
  const query = useQuery({
    queryKey: counterKeys.detail(id),
    queryFn: ({ signal }) => counterApi.detail(id, signal),
    ...detailQueryOptions,
    refetchInterval: (q) => (q.state.data && !q.state.data.intake?.handedOverAt ? interval : false),
  })
  if (query.isPending) return <PageSkeleton />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  return <Item detail={query.data} fetching={query.isFetching} />
}

function Item({ detail, fetching }: { detail: CounterItemDetailResponse; fetching: boolean }) {
  const { t } = useTranslation('counter')
  const { t: tOps } = useTranslation('counterOps')
  const { pick, lang } = useLang()
  const role = useRoleKind()
  const queryClient = useQueryClient()
  const docs = useCounterDocuments(detail)
  const [dialog, setDialog] = useState<DialogKind | null>(null)
  const open = (k: DialogKind) => () => setDialog(k)
  const props = (k: DialogKind) => ({ detail, open: dialog === k, onOpenChange: (o: boolean) => !o && setDialog(null) })
  const intake = detail.intake
  const missing = photosMissing(intake)
  const pending = detail.pendingQuotation
  const handedOver = !!intake?.handedOverAt
  const management = role !== 'frontDesk'
  const target = { id: detail.serviceItemId, itemNumber: detail.itemNumber, serviceNameAr: detail.serviceNameAr, serviceNameEn: detail.serviceNameEn }
  const label = [intake?.intakeNumber ?? detail.itemNumber, detail.customer.fullName].filter(Boolean).join(' · ')
  const holdTarget: HoldTarget = { serviceItemId: detail.serviceItemId, label, status: detail.status, fulfillmentChannel: detail.fulfillmentChannel }
  const hold = holdActions(detail, role)
  const transfer = detail.openTransfer
  // Automatic WhatsApp on: the manual wa.me buttons step back (phase 4 §3).
  const shareVariant = detail.whatsAppAutoSend ? 'outline' : 'default'

  return (
    <>
      <PageHeader
        back={{ to: '/counter', label: t('item.back') }}
        title={
          <span className="flex flex-wrap items-center gap-x-3">
            <bdi className="ltr-nums font-mono">{intake?.intakeNumber ?? detail.itemNumber}</bdi>
            <span className="text-base font-normal text-muted-foreground">{pick(detail.serviceNameAr, detail.serviceNameEn)}</span>
          </span>
        }
        meta={
          <>
            <StatusBadge enum="ServiceItemStatus" value={detail.status} />
            {detail.repairOutcome && <StatusBadge enum="RepairOutcome" value={detail.repairOutcome} />}
            {missing > 0 && <Badge tone="attention">{t('incompleteBadge')}</Badge>}
            {handedOver && <Badge tone="success">{t('item.handedOver', { date: formatDate(intake?.handedOverAt, lang) })}</Badge>}
            {detail.reworkOfServiceItemId && (
              <Link to={`/counter/items/${detail.reworkOfServiceItemId}`} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Badge tone="attention">{tOps('rework.badge', { number: detail.reworkOfItemNumber ?? '' })}</Badge>
              </Link>
            )}
          </>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {detail.branchName && <span>{detail.branchName}</span>}
            {intake?.receivedByName && <span>{t('item.receivedBy', { name: intake.receivedByName })}</span>}
            {intake && <DateTime value={intake.receivedAt} />}
            {!handedOver && (
              <span className="inline-flex items-center gap-1 text-xs">
                <RefreshCw className={fetching ? 'size-3 animate-spin' : 'size-3'} aria-hidden />
              </span>
            )}
          </span>
        }
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="lg" variant="outline">
                  <Printer /> {t('item.documents')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={() => void docs.printReceipt('a5')}>
                  <Printer /> {t('item.receiptA5')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void docs.printReceipt('thermal')}>
                  <Printer /> {t('item.receiptThermal')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void docs.printLabel(intake?.deviceId)}>
                  <Tag /> {t('item.label')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void docs.openInvoice()}>
                  <FileText /> {t('item.invoice')}
                </DropdownMenuItem>
                {detail.warranty && (
                  <DropdownMenuItem onSelect={() => void docs.openWarranty()}>
                    <ShieldCheck /> {t('item.warrantyPdf')}
                  </DropdownMenuItem>
                )}
                {detail.publicReceiptUrl && (
                  <DropdownMenuItem asChild>
                    <a href={detail.publicReceiptUrl} target="_blank" rel="noreferrer">
                      <ExternalLink /> {t('item.publicReceipt')}
                    </a>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {docs.shareReceipt && (
              <Button size="lg" variant={shareVariant} onClick={docs.shareReceipt}>
                <MessageCircle /> {t('item.whatsAppReceipt')}
              </Button>
            )}
            {docs.shareReady && (
              <Button size="lg" variant={shareVariant} onClick={docs.shareReady}>
                <MessageCircle /> {t('item.whatsAppReady')}
              </Button>
            )}
          </>
        }
      />

      {/* What the counter should do next. */}
      {detail.whatsAppAutoSend && (docs.shareReceipt || docs.shareReady) && <p className="mb-3 text-xs text-muted-foreground">{tOps('whatsapp.autoOn')}</p>}
      {detail.status === 'Paused' && (
        <Banner
          tone="attention"
          icon={<PauseCircle className="size-4" />}
          text={[
            detail.holdReason ? tOps('hold.banner', { reason: enumLabel('HoldReason', detail.holdReason, lang) }) : tOps('hold.bannerNoReason'),
            detail.holdNote,
            detail.externalWorkshopName ? tOps('hold.external', { name: detail.externalWorkshopName }) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        >
          {hold.canResume && (
            <Button size="lg" onClick={open('resume')}>
              <PlayCircle /> {tOps('hold.resume')}
            </Button>
          )}
        </Banner>
      )}
      {transfer && (
        <Banner tone="attention" icon={<Truck className="size-4" />} text={transfer.status === 'InTransit' ? tOps('transfer.inTransit', { to: transfer.toBranch.name }) : tOps('transfer.requested', { to: transfer.toBranch.name })}>
          <Button asChild size="lg" variant="outline">
            <Link to={`/counter/transfers/${transfer.id}`}>{tOps('transfer.open')}</Link>
          </Button>
        </Banner>
      )}
      {detail.awaitingCustomer && pending && (
        <Banner tone="attention" icon={<PhoneCall className="size-4" />} text={t('item.awaitingBanner')}>
          {can(detail, 'RecordCall') && (
            <Button size="lg" onClick={open('call')}>
              <PhoneCall /> {t('item.recordCall')}
            </Button>
          )}
          {can(detail, 'RecordDecision') && (
            <Button size="lg" variant="outline" onClick={open('decision')}>
              <Vote /> {t('item.recordDecision')}
            </Button>
          )}
        </Banner>
      )}
      {detail.isReady && !handedOver && (
        <Banner tone="success" icon={<CheckCircle2 className="size-4" />} text={t('item.readyBanner')}>
          {can(detail, 'Handover') && (
            <Button size="lg" onClick={open('handover')}>
              <HandHelping /> {t('item.handover')}
            </Button>
          )}
        </Banner>
      )}
      {missing > 0 && (
        <Banner tone="attention" icon={<AlertTriangle className="size-4" />} text={t('done.photosMissing', { count: missing })}>
          {can(detail, 'UploadPhotos') && <PhotoUploader itemId={detail.serviceItemId} deviceId={intake?.deviceId} size="sm" />}
        </Banner>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title={t('item.intake')} actions={can(detail, 'Sign') ? <Button size="sm" variant="outline" onClick={open('sign')}><PenLine /> {t('item.sign')}</Button> : undefined} />
            <CardBody className="space-y-4">
              <IntakeFacts detail={detail} />
              <div>
                <p className="text-xs text-muted-foreground">{t('item.signature')}</p>
                {intake?.signatureUrl ? (
                  <img src={fileUrl(intake.signatureUrl)} alt={t('item.signature')} className="mt-1 h-20 rounded border bg-white object-contain p-1" />
                ) : (
                  <p className="text-sm text-muted-foreground">{t('item.noSignature')}</p>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={`${t('item.devices')} (${detail.devices.length})`}
              actions={
                can(detail, 'Transfer') && !transfer ? (
                  <Button size="sm" variant="outline" onClick={open('transfer')}>
                    <ArrowLeftRight /> {tOps('transfer.action')}
                  </Button>
                ) : undefined
              }
            />
            <CardBody>
              <ul className="divide-y">
                {detail.devices.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                    <span className="min-w-0">
                      <span className="block font-medium">{[d.name, d.brand, d.model].filter(Boolean).join(' · ')}</span>
                      <span className="block text-xs text-muted-foreground">
                        {d.imei && <bdi className="ltr-nums me-2 font-mono">IMEI {d.imei}</bdi>}
                        {d.serialNumber && <bdi className="ltr-nums me-2 font-mono">SN {d.serialNumber}</bdi>}
                        {d.tagCode && <bdi className="ltr-nums font-mono">{d.tagCode}</bdi>}
                      </span>
                      {d.issueDescription && <span className="block text-sm">{d.issueDescription}</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge enum="DeviceCustodyStage" value={d.custodyStage} />
                      <Button size="xs" variant="ghost" onClick={() => void docs.printLabel(d.id)}>
                        <Tag /> {t('item.label')}
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('item.quotations')} />
            <CardBody className="space-y-4">
              {detail.quotations.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('item.noQuotation')}</p>
              ) : (
                [...detail.quotations].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).map((q) => <QuotationLines key={q.id} quotation={q} />)
              )}
              <div>
                <p className="mb-1 text-sm font-semibold">{t('item.approvals')}</p>
                <ApprovalsList approvals={detail.approvals} />
              </div>
            </CardBody>
          </Card>

          <WhatsAppCard detail={detail} />

          <Card>
            <CardHeader title={t('item.photos')} description={t('item.photosExpire')} actions={can(detail, 'UploadPhotos') && missing === 0 ? <PhotoUploader itemId={detail.serviceItemId} deviceId={intake?.deviceId} size="sm" /> : undefined} />
            <CardBody>
              <PhotoGrid photos={detail.photos} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('item.timeline')} />
            <CardBody>
              <Timeline rows={detail.timeline.map((event) => ({ event }))} />
            </CardBody>
          </Card>
        </div>

        <aside className="min-w-0 space-y-4">
          <Card>
            <CardHeader title={t('item.customer')} actions={detail.customer.phone ? <Button asChild size="sm"><a href={`tel:${detail.customer.phone}`}><Phone /> {t('item.call')}</a></Button> : undefined} />
            <CardBody className="space-y-1 text-sm">
              <p className="font-medium">{detail.customer.fullName}</p>
              {detail.customer.phone && <bdi className="ltr-nums block font-latin text-muted-foreground">{formatSaudiMobile(detail.customer.phone)}</bdi>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={t('item.technician')}
              actions={
                management && !handedOver ? (
                  <Button size="sm" variant="outline" onClick={open('assign')}>
                    <UserCog /> {detail.executor ? t('item.reassign') : t('item.assign')}
                  </Button>
                ) : undefined
              }
            />
            <CardBody className="space-y-2 text-sm">
              <p>{detail.executor ? detail.executor.fullName : <span className="text-muted-foreground">{t('item.unassigned')}</span>}</p>
              {detail.reworkRootCause && (
                <p className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{tOps('rework.rootCause')}</span>
                  <StatusBadge enum="ReworkRootCause" value={detail.reworkRootCause} dot={false} />
                </p>
              )}
              {management && detail.internalCost !== null && (
                <p className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{tOps('rework.internalCost')}</span>
                  <Money value={detail.internalCost} />
                </p>
              )}
              {detail.externalWorkshopName && (
                <p className="text-xs text-muted-foreground">
                  {tOps('hold.external', { name: detail.externalWorkshopName })}
                  {detail.externalCost !== null && <> · {tOps('hold.externalCost', { amount: formatMoney(detail.externalCost, lang) })}</>}
                </p>
              )}
              {(hold.canPause || hold.canResume) && !handedOver && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {hold.canPause && (
                    <Button size="sm" variant="outline" onClick={open('pause')}>
                      <PauseCircle /> {tOps('hold.pause')}
                    </Button>
                  )}
                  {hold.canResume && (
                    <Button size="sm" variant="outline" onClick={open('resume')}>
                      <PlayCircle /> {tOps('hold.resume')}
                    </Button>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('item.money')} />
            <CardBody className="space-y-3">
              <MoneySummary detail={detail} />
              <div className="flex flex-wrap gap-2">
                {can(detail, 'AddPayment') && (
                  <Button size="lg" onClick={open('payment')}>
                    <Banknote /> {t('item.addPayment')}
                  </Button>
                )}
                {can(detail, 'Discount') && (
                  <Button size="lg" variant="outline" onClick={open('discount')}>
                    <BadgePercent /> {t('item.giveDiscount')}
                  </Button>
                )}
                {can(detail, 'Handover') && detail.isReady && (
                  <Button size="lg" variant="outline" onClick={open('handover')}>
                    <HandHelping /> {t('item.handover')}
                  </Button>
                )}
              </div>
              <div>
                <p className="mb-1 text-sm font-semibold">{t('item.payments')}</p>
                <PaymentsList detail={detail} />
              </div>
            </CardBody>
          </Card>

          <StorageCard detail={detail} />

          <TrackingLinkCard url={detail.publicTrackingUrl} />

          <Card>
            <CardHeader title={t('item.warranty')} />
            <CardBody className="text-sm">
              {detail.warranty ? (
                <div className="space-y-1">
                  <p className="flex items-center gap-2">
                    <bdi className="ltr-nums font-mono">{detail.warranty.warrantyNumber}</bdi>
                    <StatusBadge enum="WarrantyStatus" value={detail.warranty.status} />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <DateTime value={detail.warranty.startsAt} mode="date" /> → <DateTime value={detail.warranty.endsAt} mode="date" />
                  </p>
                  <Button size="sm" variant="outline" onClick={() => void docs.openWarranty()}>
                    <ShieldCheck /> {t('item.warrantyPdf')}
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">{t('item.noWarranty')}</p>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>

      {pending && <CallLogDialog {...props('call')} quotation={pending} onAnswered={() => setDialog('decision')} />}
      {pending && <DecisionDialog {...props('decision')} quotation={pending} />}
      <PaymentDialog {...props('payment')} />
      <DiscountDialog {...props('discount')} />
      <HandoverDialog {...props('handover')} />
      <SignDialog {...props('sign')} />
      {management && <PauseDialog item={holdTarget} open={dialog === 'pause'} onOpenChange={(o) => !o && setDialog(null)} />}
      {management && <ResumeDialog item={holdTarget} open={dialog === 'resume'} onOpenChange={(o) => !o && setDialog(null)} />}
      {management && (
        <CreateTransferDialog
          serviceItemId={detail.serviceItemId}
          target={label}
          currentBranchId={detail.currentBranchId}
          open={dialog === 'transfer'}
          onOpenChange={(o) => !o && setDialog(null)}
        />
      )}
      {management && (
        <CandidatePickerDialog
          item={target}
          open={dialog === 'assign'}
          onOpenChange={(o) => !o && setDialog(null)}
          mode={detail.executor ? 'reassign' : 'assign'}
          currentExecutorId={detail.executor?.id ?? null}
          onDone={() => void queryClient.invalidateQueries({ queryKey: counterKeys.detail(detail.serviceItemId) })}
        />
      )}
    </>
  )
}

function Banner({ tone, icon, text, children }: { tone: 'attention' | 'success'; icon: ReactNode; text: string; children?: ReactNode }) {
  return (
    <div
      role="status"
      className={
        tone === 'success'
          ? 'mb-4 flex flex-col gap-3 rounded-xl border border-tone-success/30 bg-tone-success-soft px-4 py-3 text-tone-success sm:flex-row sm:items-center sm:justify-between'
          : 'mb-4 flex flex-col gap-3 rounded-xl border border-tone-attention/30 bg-tone-attention-soft px-4 py-3 text-tone-attention sm:flex-row sm:items-center sm:justify-between'
      }
    >
      <p className="flex items-center gap-2 text-sm font-medium">
        {icon} {text}
      </p>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}
