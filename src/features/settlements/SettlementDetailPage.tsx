import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { HumanNumber } from '@/components/EntityLink'
import { DateTime, Money, Num } from '@/components/Format'
import { KeyValue } from '@/components/KeyValue'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState, PageSkeleton } from '@/components/States'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { detailQueryOptions } from '@/api/queryClient'
import { useLang } from '@/hooks/useLang'
import { downloadCsv, toCsv } from '@/lib/csv'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import './i18n'
import { settlementKeys, settlementsApi } from './api'
import { SettlementLinesTable } from './components/SettlementLinesTable'
import { settlementLineCsvColumns } from './csv'

/** `/settlements/:id` (read-only): totals, payment details and the settled services. */
export function SettlementDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation('settlements')
  const { lang } = useLang()

  const query = useQuery({
    queryKey: settlementKeys.detail(id),
    queryFn: ({ signal }) => settlementsApi.detail(id, signal),
    ...detailQueryOptions,
  })

  if (query.isPending) return <PageSkeleton />
  if (query.isError) {
    return (
      <>
        <PageHeader back={{ to: '/settlements', label: t('detail.back') }} title={t('title')} />
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </>
    )
  }

  const s = query.data
  const exportLines = () => {
    downloadCsv(`settlement-${s.settlementNumber}`, toCsv(s.lines, settlementLineCsvColumns((k) => t(k), lang)))
    toast.success(t('detail.exported', { count: s.lines.length }))
  }

  const kpis = [
    { key: 'gross', label: t('columns.gross'), value: <Money value={s.grossAmount} /> },
    { key: 'commission', label: t('columns.commission'), value: <Money value={s.commissionAmount} /> },
    { key: 'net', label: t('columns.net'), value: <Money value={s.netAmount} />, strong: true },
    { key: 'lines', label: t('columns.lines'), value: <Num value={s.linesCount} /> },
  ]

  return (
    <>
      <PageHeader
        back={{ to: '/settlements', label: t('detail.back') }}
        title={<HumanNumber value={s.settlementNumber} className="text-xl" />}
        meta={
          <>
            <StatusBadge enum="SettlementStatus" value={s.status} />
            <StatusBadge enum="SettlementPartyType" value={s.partyType} dot={false} />
          </>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="tabular">
              {t('columns.period')}: {formatDate(s.periodStart, lang)} – {formatDate(s.periodEnd, lang)}
            </span>
            {s.partyType === 'Executor' && s.executorName && <span>{t('detail.executorSettlement', { name: s.executorName })}</span>}
          </span>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.key} className={cn('px-4 py-3', k.strong && 'border-primary/40')}>
            <div className="text-xs text-muted-foreground">{k.label}</div>
            <div className={cn('mt-1 text-lg font-semibold', k.strong && 'text-primary')}>{k.value}</div>
          </Card>
        ))}
      </div>

      <Card className="mb-4">
        <CardHeader title={t('detail.summary')} />
        <CardBody>
          <KeyValue
            columns={3}
            items={[
              { label: t('columns.createdAt'), value: <DateTime value={s.createdAt} mode="absolute" /> },
              { label: t('columns.approvedAt'), value: s.approvedAt && <DateTime value={s.approvedAt} mode="absolute" /> },
              { label: t('columns.paidAt'), value: s.paidAt && <DateTime value={s.paidAt} mode="absolute" /> },
              { label: t('columns.reference'), value: s.paymentReference && <HumanNumber value={s.paymentReference} /> },
              { label: t('columns.notes'), value: s.notes && <span className="whitespace-pre-wrap">{s.notes}</span>, wide: true },
            ]}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={t('detail.linesTitle')}
          actions={
            <Button variant="outline" size="sm" onClick={exportLines} disabled={s.lines.length === 0}>
              <Download /> {t('detail.exportLines')}
            </Button>
          }
        />
        <SettlementLinesTable lines={s.lines} />
      </Card>
    </>
  )
}
