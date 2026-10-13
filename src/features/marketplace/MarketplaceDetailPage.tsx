import { useQuery } from '@tanstack/react-query'
import { Pencil, Send, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { ConfirmDialog } from '@/components/ActionDialog'
import { HumanNumber } from '@/components/EntityLink'
import { DateTime, Duration, Money, Num } from '@/components/Format'
import { KeyValue } from '@/components/KeyValue'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState, PageSkeleton } from '@/components/States'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { detailQueryOptions } from '@/api/queryClient'
import type { ProviderMarketplaceRequestResponse } from '@/api/types'
import { useProvider } from '@/app/provider'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import './i18n'
import { marketplaceApi, marketplaceKeys, offerActionInvalidation } from './api'
import { Countdown } from './components/Countdown'
import { OfferDialog, type OfferDialogMode } from './components/OfferDialog'
import { offerAvailability } from './offer'

/** `/marketplace/:id`: the tender and the organization's single offer on it (§8.8). */
export function MarketplaceDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation('marketplace')
  const { pick } = useLang()

  const query = useQuery({
    queryKey: marketplaceKeys.request(id),
    queryFn: ({ signal }) => marketplaceApi.request(id, signal),
    ...detailQueryOptions,
  })

  if (query.isPending) return <PageSkeleton />
  if (query.isError) {
    return (
      <>
        <PageHeader back={{ to: '/marketplace', label: t('detail.back') }} title={t('title')} />
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </>
    )
  }

  const r = query.data

  return (
    <>
      <PageHeader
        back={{ to: '/marketplace', label: t('detail.back') }}
        title={pick(r.serviceNameAr, r.serviceNameEn)}
        meta={<StatusBadge enum="MarketplaceRequestStatus" value={r.status} />}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <HumanNumber value={r.requestNumber} />
            <Countdown closesAt={r.closesAt} />
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader title={t('detail.tender')} />
          <CardBody className="space-y-4">
            {r.publicDescription && (
              <div>
                <div className="text-xs text-muted-foreground">{t('detail.publicDescription')}</div>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{r.publicDescription}</p>
              </div>
            )}
            <KeyValue
              items={[
                { label: t('detail.category'), value: pick(r.category.nameAr, r.category.nameEn) },
                { label: t('detail.executionMode'), value: <StatusBadge enum="ExecutionMode" value={r.executionMode} dot={false} /> },
                { label: t('detail.city'), value: r.city },
                { label: t('detail.district'), value: r.district },
                { label: t('detail.preferredStart'), value: r.preferredStart && <DateTime value={r.preferredStart} mode="absolute" /> },
                { label: t('detail.preferredEnd'), value: r.preferredEnd && <DateTime value={r.preferredEnd} mode="absolute" /> },
                { label: t('detail.publishedAt'), value: <DateTime value={r.publishedAt} mode="absolute" /> },
                { label: t('detail.closesAt'), value: r.closesAt && <DateTime value={r.closesAt} mode="absolute" /> },
                { label: t('detail.offersCount'), value: <Num value={r.offersCount} /> },
              ]}
            />
          </CardBody>
        </Card>

        <MyOfferCard request={r} />
      </div>
    </>
  )
}

function MyOfferCard({ request }: { request: ProviderMarketplaceRequestResponse }) {
  const { t } = useTranslation('marketplace')
  const { pick } = useLang()
  const { operational } = useProvider()
  const [dialog, setDialog] = useState<OfferDialogMode | 'withdraw' | null>(null)
  const close = () => setDialog(null)

  const offer = request.myOffer
  const can = offerAvailability(request)

  const withdraw = useAction({
    invalidate: offerActionInvalidation,
    success: t('success.withdrawn'),
    mutationFn: () => marketplaceApi.withdrawOffer(request.id),
    onSuccess: close,
  })

  const note =
    offer?.status === 'Accepted'
      ? t('detail.acceptedNote')
      : offer?.status === 'Rejected'
        ? t('detail.rejectedNote')
        : !can.accepting && offer?.status !== 'Submitted'
          ? t('detail.closedNote')
          : offer?.status === 'Withdrawn'
            ? t('detail.withdrawnNote')
            : !offer
              ? t('detail.noOfferYet')
              : null

  const disabledReason = operational ? undefined : t('actions.notOperational')

  return (
    <Card className="h-fit">
      <CardHeader title={t('detail.myOffer')} actions={offer && <StatusBadge enum="MarketplaceOfferStatus" value={offer.status} />} />
      <CardBody className="space-y-4">
        {offer && offer.status !== 'Withdrawn' && (
          <KeyValue
            columns={1}
            items={[
              { label: t('form.amount'), value: <Money value={offer.amount} className="text-lg font-semibold" /> },
              { label: t('form.estimatedDuration'), value: offer.estimatedDurationMinutes ? <Duration minutes={offer.estimatedDurationMinutes} /> : null },
              { label: t('form.proposedStart'), value: offer.proposedStart && <DateTime value={offer.proposedStart} mode="absolute" /> },
              { label: t('form.note'), value: offer.note && <span className="whitespace-pre-line">{offer.note}</span> },
              { label: t('detail.submittedAt'), value: <DateTime value={offer.submittedAt} mode="absolute" /> },
              { label: t('detail.respondedAt'), value: offer.respondedAt && <DateTime value={offer.respondedAt} mode="absolute" />, hidden: !offer.respondedAt },
            ]}
          />
        )}

        {note && <p className="rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">{note}</p>}

        {(can.canSubmit || can.canEdit || can.canWithdraw) && (
          <div className="flex flex-col gap-2">
            {can.canSubmit && (
              <Button onClick={() => setDialog(can.isResubmit ? 'resubmit' : 'submit')} disabled={!operational} title={disabledReason}>
                <Send /> {can.isResubmit ? t('actions.resubmit') : t('actions.submit')}
              </Button>
            )}
            {can.canEdit && (
              <Button onClick={() => setDialog('edit')} disabled={!operational} title={disabledReason}>
                <Pencil /> {t('actions.edit')}
              </Button>
            )}
            {can.canWithdraw && (
              <Button variant="destructive-outline" onClick={() => setDialog('withdraw')} disabled={!operational} title={disabledReason}>
                <Undo2 /> {t('actions.withdraw')}
              </Button>
            )}
            {!operational && <p className="text-xs text-tone-attention">{t('actions.notOperational')}</p>}
            <p className="text-xs text-muted-foreground">{t('detail.oneOffer')}</p>
          </div>
        )}
      </CardBody>

      {dialog && dialog !== 'withdraw' && <OfferDialog request={request} mode={dialog} open onClose={close} />}
      <ConfirmDialog
        open={dialog === 'withdraw'}
        onOpenChange={(o) => !o && close()}
        destructive
        title={t('actions.withdrawTitle')}
        description={t('actions.withdrawDescription')}
        target={
          <span className="flex flex-wrap items-center gap-2">
            {request.requestNumber} · {pick(request.serviceNameAr, request.serviceNameEn)}
            {offer && <Money value={offer.amount} className="text-muted-foreground" />}
          </span>
        }
        confirmLabel={t('actions.withdraw')}
        submitting={withdraw.isPending}
        error={withdraw.error}
        onSubmit={() => withdraw.mutate()}
      />
    </Card>
  )
}
