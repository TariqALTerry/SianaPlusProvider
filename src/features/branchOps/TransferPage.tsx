import { useQuery } from '@tanstack/react-query'
import { ExternalLink, MapPin, PackageCheck, Phone, Send, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { detailQueryOptions } from '@/api/queryClient'
import type { BranchTransferResponse, TransferBranchResponse } from '@/api/types'
import { DateTime } from '@/components/Format'
import { KeyValue } from '@/components/KeyValue'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState, PageSkeleton } from '@/components/States'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { usePollingInterval } from '@/hooks/usePageVisible'
import { useLang } from '@/hooks/useLang'
import { branchOpsApi, branchOpsKeys } from './api'
import { CancelTransferDialog, ScanTransferDialog } from './components/TransferDialogs'
import { serviceHref, transferActions, transferTarget } from './logic'
import './i18n'

/** `/counter/transfers/:id` (phase 5 §5): the devices, both branches, the courier, the times and the actions. */
export function TransferPage() {
  const { id = '' } = useParams()
  const interval = usePollingInterval(30_000)
  const query = useQuery({ queryKey: branchOpsKeys.transfer(id), queryFn: ({ signal }) => branchOpsApi.transfer(id, signal), ...detailQueryOptions, refetchInterval: interval })
  if (query.isPending) return <PageSkeleton />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  return <Transfer transfer={query.data} />
}

function BranchCard({ title, branch }: { title: string; branch: TransferBranchResponse }) {
  const { t } = useTranslation('branchOps')
  const address = [branch.city, branch.district, branch.addressLine].filter(Boolean).join('، ')
  const hasPoint = branch.latitude !== null && branch.longitude !== null
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody className="space-y-2">
        <p className="font-semibold">
          {branch.name} <bdi className="font-latin text-xs text-muted-foreground">{branch.code}</bdi>
        </p>
        {address && <p className="text-sm text-muted-foreground">{address}</p>}
        <div className="flex flex-wrap gap-2">
          {branch.phone && (
            <Button asChild size="sm" variant="outline">
              <a href={`tel:${branch.phone}`}>
                <Phone /> <bdi className="ltr-nums font-latin">{branch.phone}</bdi>
              </a>
            </Button>
          )}
          {hasPoint && (
            <Button asChild size="sm" variant="outline">
              <a href={`https://www.google.com/maps?q=${branch.latitude},${branch.longitude}`} target="_blank" rel="noopener noreferrer">
                <MapPin /> {t('transfer.map')}
              </a>
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

function Transfer({ transfer: tr }: { transfer: BranchTransferResponse }) {
  const { t } = useTranslation('branchOps')
  const { pick, isRtl } = useLang()
  const [dialog, setDialog] = useState<'Send' | 'Receive' | 'Cancel' | null>(null)
  const actions = transferActions(tr)
  const target = transferTarget(tr, pick, isRtl)

  return (
    <div className="space-y-4">
      <PageHeader
        back={{ to: '/counter/transfers', label: t('transfer.back') }}
        title={t('transfer.title', { number: tr.intakeNumber ?? tr.itemNumber ?? '' })}
        description={pick(tr.serviceNameAr, tr.serviceNameEn)}
        meta={<StatusBadge enum="BranchTransferStatus" value={tr.status} />}
        actions={
          <Button asChild variant="outline">
            <Link to={serviceHref(tr)}>
              <ExternalLink /> {t('transfer.openService')}
            </Link>
          </Button>
        }
      />

      <Card>
        <CardBody>
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('transfer.noActions')}</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3">
              {actions.includes('Send') && (
                <Button size="lg" className="h-14 text-base" onClick={() => setDialog('Send')}>
                  <Send /> {t('transfer.send')}
                </Button>
              )}
              {actions.includes('Receive') && (
                <Button size="lg" className="h-14 text-base" onClick={() => setDialog('Receive')}>
                  <PackageCheck /> {t('transfer.receive')}
                </Button>
              )}
              {actions.includes('Cancel') && (
                <Button size="lg" variant="outline" className="h-14 text-base text-destructive" onClick={() => setDialog('Cancel')}>
                  <XCircle /> {t('transfer.cancel')}
                </Button>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <BranchCard title={t('transfer.from')} branch={tr.fromBranch} />
        <BranchCard title={t('transfer.to')} branch={tr.toBranch} />
      </div>

      <Card>
        <CardHeader title={t('transfer.devices')} />
        <CardBody>
          <ul className="divide-y text-sm">
            {tr.devices.map((d) => (
              <li key={d.deviceId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {[d.name, d.brand, d.model].filter(Boolean).join(' · ')}
                  {d.tagCode && (
                    <span className="ms-2 text-xs text-muted-foreground">
                      {t('transfer.tag')}: <bdi className="ltr-nums font-mono">{d.tagCode}</bdi>
                    </span>
                  )}
                </span>
                <StatusBadge enum="DeviceCustodyStage" value={d.stage} />
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('transfer.service')} />
        <CardBody>
          <KeyValue
            columns={3}
            items={[
              { label: t('transfer.courier'), value: tr.courierName },
              { label: t('transfer.stageBefore'), value: <StatusBadge enum="DeviceCustodyStage" value={tr.stageBeforeTransit} dot={false} /> },
              { label: t('transfer.requestedBy'), value: tr.requestedByName },
              { label: t('transfer.createdAt'), value: <DateTime value={tr.createdAt} mode="absolute" /> },
              { label: t('transfer.sentAt'), value: tr.sentAt ? <DateTime value={tr.sentAt} mode="absolute" /> : null },
              { label: t('transfer.receivedAt'), value: tr.receivedAt ? <DateTime value={tr.receivedAt} mode="absolute" /> : null },
              { label: t('transfer.receivedBy'), value: tr.receivedByName, hidden: !tr.receivedByName },
              { label: t('transfer.cancelledAt'), value: <DateTime value={tr.cancelledAt} mode="absolute" />, hidden: !tr.cancelledAt },
              { label: t('transfer.reason'), value: tr.reason, wide: true, hidden: !tr.reason },
              { label: t('transfer.cancelReason'), value: tr.cancelReason, wide: true, hidden: !tr.cancelReason },
            ]}
          />
        </CardBody>
      </Card>

      <ScanTransferDialog transfer={tr} target={target} kind="Send" open={dialog === 'Send'} onOpenChange={(o) => !o && setDialog(null)} />
      <ScanTransferDialog transfer={tr} target={target} kind="Receive" open={dialog === 'Receive'} onOpenChange={(o) => !o && setDialog(null)} />
      <CancelTransferDialog transfer={tr} target={target} open={dialog === 'Cancel'} onOpenChange={(o) => !o && setDialog(null)} />
    </div>
  )
}
