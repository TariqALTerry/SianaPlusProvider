import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ClipboardPlus, ExternalLink, MessageCircle, Printer, Tag } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { detailQueryOptions } from '@/api/queryClient'
import type { CounterItemDetailResponse } from '@/api/types'
import { ErrorState, PageSkeleton } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { useLang } from '@/hooks/useLang'
import { counterApi, counterKeys } from './api'
import { PhotoGrid } from './components/ItemParts'
import { PhotoUploader } from './components/PhotoUploader'
import { useCounterDocuments } from './hooks'
import { MIN_PHOTOS, photosMissing } from './logic'
import './i18n'

/**
 * `/counter/items/:id/done` (phase 2 §4, "تم الاستلام"): the photos first (two at least; until then the receipt is
 * "ناقص"), then print the receipt (A5 or 80 mm), print the label, or send it on WhatsApp.
 */
export function IntakeDonePage() {
  const { id = '' } = useParams()
  const query = useQuery({ queryKey: counterKeys.detail(id), queryFn: ({ signal }) => counterApi.detail(id, signal), ...detailQueryOptions })
  if (query.isPending) return <PageSkeleton />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  return <Done detail={query.data} />
}

function Done({ detail }: { detail: CounterItemDetailResponse }) {
  const { t } = useTranslation('counter')
  const { pick } = useLang()
  const docs = useCounterDocuments(detail)
  const intake = detail.intake
  const missing = photosMissing(intake)
  const device = detail.devices[0]

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="hero-gradient relative overflow-hidden rounded-2xl p-5 text-white shadow-sm sm:p-6">
        <div className="brand-pattern absolute inset-0 opacity-80" aria-hidden />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm text-brand-mint">
              <CheckCircle2 className="size-4" /> {t('done.title')}
            </p>
            <p className="text-xs text-white/75">{t('done.intakeNumber')}</p>
            <p className="ltr-nums font-mono text-3xl font-bold tracking-wide" dir="ltr">
              {intake?.intakeNumber ?? detail.itemNumber}
            </p>
            <p className="text-sm text-white/85">
              {detail.customer.fullName} · {pick(detail.serviceNameAr, detail.serviceNameEn)}
              {device && ` · ${[device.name, device.brand, device.model].filter(Boolean).join(' ')}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link to={`/counter/items/${detail.serviceItemId}`}>
                <ExternalLink /> {t('done.openItem')}
              </Link>
            </Button>
            <Button asChild className="bg-brand-yellow text-brand-deep hover:bg-brand-yellow/90">
              <Link to="/counter/new">
                <ClipboardPlus /> {t('done.another')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Card className={missing > 0 ? 'border-tone-attention/50' : undefined}>
        <CardHeader title={t('done.photosTitle')} description={t('done.photosHint')} />
        <CardBody className="space-y-3">
          {missing > 0 ? (
            <p className="flex items-center gap-2 rounded-lg bg-tone-attention-soft px-3 py-2 text-sm font-medium text-tone-attention" role="status">
              <AlertTriangle className="size-4 shrink-0" /> {t('done.photosMissing', { count: missing })}
            </p>
          ) : (
            <p className="flex items-center gap-2 rounded-lg bg-tone-success-soft px-3 py-2 text-sm font-medium text-tone-success" role="status">
              <CheckCircle2 className="size-4 shrink-0" /> {t('done.photosComplete')}
            </p>
          )}
          <PhotoUploader itemId={detail.serviceItemId} deviceId={intake?.deviceId} />
          <PhotoGrid photos={detail.photos} />
          <p className="text-xs text-muted-foreground">
            {intake?.photosCount ?? 0} / {MIN_PHOTOS}+
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('item.documents')} />
        <CardBody className="space-y-3">
          {missing > 0 && <p className="text-xs text-tone-attention">{t('done.printWarnIncomplete')}</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button size="lg" className="h-14 text-base" onClick={() => void docs.printReceipt('a5')}>
              <Printer /> {t('done.printA5')}
            </Button>
            <Button size="lg" variant="outline" className="h-14 text-base" onClick={() => void docs.printReceipt('thermal')}>
              <Printer /> {t('done.printThermal')}
            </Button>
            <Button size="lg" variant="outline" className="h-14 text-base" onClick={() => void docs.printLabel(intake?.deviceId)}>
              <Tag /> {t('done.printLabel')}
            </Button>
            <Button size="lg" variant="outline" className="h-14 text-base" onClick={() => docs.shareReceipt?.()} disabled={!docs.shareReceipt}>
              <MessageCircle /> {t('done.whatsApp')}
            </Button>
          </div>
          {!docs.shareReceipt && <p className="text-xs text-muted-foreground">{t('done.noWhatsApp')}</p>}
        </CardBody>
      </Card>
    </div>
  )
}

