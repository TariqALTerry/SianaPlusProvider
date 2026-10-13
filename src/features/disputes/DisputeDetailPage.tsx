import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { EntityLink, HumanNumber, routes } from '@/components/EntityLink'
import { DateTime, Money } from '@/components/Format'
import { KeyValue } from '@/components/KeyValue'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState, PageSkeleton } from '@/components/States'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { detailQueryOptions } from '@/api/queryClient'
import { useLang } from '@/hooks/useLang'
import './i18n'
import { disputeKeys, disputesApi } from './api'
import { DisputeNote } from './components/DisputeNote'

/** `/disputes/:id` (read-only): the complaint, its outcome, and a link to the work item. */
export function DisputeDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation('disputes')
  const { pick } = useLang()

  const query = useQuery({
    queryKey: disputeKeys.detail(id),
    queryFn: ({ signal }) => disputesApi.detail(id, signal),
    ...detailQueryOptions,
  })

  if (query.isPending) return <PageSkeleton />
  if (query.isError) {
    return (
      <>
        <PageHeader back={{ to: '/disputes', label: t('detail.back') }} title={t('title')} />
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </>
    )
  }

  const d = query.data
  const serviceName = d.serviceNameAr || d.serviceNameEn ? pick(d.serviceNameAr, d.serviceNameEn) : null
  const closed = d.status === 'Resolved' || d.status === 'Rejected'

  return (
    <>
      <PageHeader
        back={{ to: '/disputes', label: t('detail.back') }}
        title={<span dir="auto">{d.subject}</span>}
        meta={<StatusBadge enum="DisputeStatus" value={d.status} />}
        description={<HumanNumber value={d.disputeNumber} />}
        actions={
          d.serviceItemId && (
            <Button asChild variant="outline" size="sm">
              <Link to={routes.workItem(d.serviceItemId)}>
                <ExternalLink /> {t('detail.openWork')}
              </Link>
            </Button>
          )
        }
      />

      <DisputeNote className="mb-4" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('detail.complaint')} />
          <CardBody className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground">{t('detail.description')}</div>
              <p dir="auto" className="mt-1 whitespace-pre-line text-sm leading-relaxed">
                {d.description}
              </p>
            </div>
            <KeyValue
              items={[
                { label: t('columns.service'), value: serviceName },
                { label: t('columns.item'), value: d.itemNumber && <EntityLink kind="workItem" id={d.serviceItemId} label={d.itemNumber} copy={d.itemNumber} mono /> },
                { label: t('columns.order'), value: d.orderNumber && <HumanNumber value={d.orderNumber} /> },
                { label: t('columns.createdAt'), value: <DateTime value={d.createdAt} mode="absolute" /> },
                { label: t('detail.updatedAt'), value: d.updatedAt && <DateTime value={d.updatedAt} mode="absolute" />, hidden: !d.updatedAt },
              ]}
            />
          </CardBody>
        </Card>

        <Card className="h-fit">
          <CardHeader title={t('detail.resolution')} />
          <CardBody>
            {closed || d.resolutionType !== 'None' ? (
              <KeyValue
                columns={1}
                items={[
                  {
                    label: t('columns.resolution'),
                    value: d.resolutionType === 'None' ? null : <StatusBadge enum="DisputeResolutionType" value={d.resolutionType} dot={false} />,
                  },
                  { label: t('columns.refund'), value: d.refundAmount ? <Money value={d.refundAmount} /> : null, hidden: !d.refundAmount },
                  { label: t('detail.resolutionNote'), value: d.resolutionNote && <span className="whitespace-pre-line">{d.resolutionNote}</span> },
                  { label: t('columns.resolvedAt'), value: d.resolvedAt && <DateTime value={d.resolvedAt} mode="absolute" /> },
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">{t('detail.notResolved')}</p>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  )
}
