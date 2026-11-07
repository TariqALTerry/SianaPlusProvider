import { MapPin, MessageCircle, Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { PublicTrackingBranchResponse } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLang } from '@/hooks/useLang'
import { enumLabel } from '@/i18n/enums'
import { nowRiyadh } from '@/lib/format'
import { cn } from '@/lib/utils'
import { dayOfWeekFromIndex, saturdayFirst, telHref, waHref } from '../logic'
import '../i18n'

/** Opening hours, Saturday first, today highlighted (Riyadh). */
export function OpeningHours({ branch }: { branch: Pick<PublicTrackingBranchResponse, 'openingHours'> }) {
  const { t } = useTranslation('publicTracking')
  const { lang } = useLang()
  const today = dayOfWeekFromIndex(nowRiyadh().day())
  if (!branch.openingHours.length) return null
  return (
    <dl className="space-y-1 text-sm">
      {saturdayFirst(branch.openingHours).map((d) => (
        <div key={d.dayOfWeek} className={cn('flex justify-between gap-3 rounded px-2 py-0.5', d.dayOfWeek === today && 'bg-muted font-medium')}>
          <dt>
            {enumLabel('DayOfWeek', d.dayOfWeek, lang)}
            {d.dayOfWeek === today && <span className="ms-1 text-xs text-muted-foreground">({t('branch.today')})</span>}
          </dt>
          <dd className="ltr-nums font-latin tabular">{d.isClosed || !d.opens || !d.closes ? <span className="font-sans text-muted-foreground">{t('branch.closed')}</span> : `${d.opens} – ${d.closes}`}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The branch: call, WhatsApp, address and map, and its hours. */
export function BranchCard({ branch }: { branch: PublicTrackingBranchResponse }) {
  const { t } = useTranslation('publicTracking')
  const tel = telHref(branch.phone)
  const wa = waHref(branch.whatsAppNumber)
  const address = [branch.addressLine, branch.district, branch.city].filter(Boolean).join('، ')
  return (
    <section className="space-y-3 rounded-2xl border bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{t('branch.title')}</p>
          <h2 className="text-base font-semibold">{branch.name}</h2>
          {address && <p className="text-sm text-muted-foreground">{address}</p>}
        </div>
        {branch.closedToday && <Badge tone="danger">{t('branch.closedToday')}</Badge>}
      </div>
      {(tel || wa || branch.mapUrl) && (
        <div className="grid grid-cols-3 gap-2">
          {tel && (
            <Button asChild variant="outline" className="h-11">
              <a href={tel}>
                <Phone /> {t('branch.call')}
              </a>
            </Button>
          )}
          {wa && (
            <Button asChild variant="outline" className="h-11">
              <a href={wa} target="_blank" rel="noopener noreferrer">
                <MessageCircle /> {t('branch.whatsapp')}
              </a>
            </Button>
          )}
          {branch.mapUrl && (
            <Button asChild variant="outline" className="h-11">
              <a href={branch.mapUrl} target="_blank" rel="noopener noreferrer">
                <MapPin /> {t('branch.map')}
              </a>
            </Button>
          )}
        </div>
      )}
      {branch.openingHours.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">{t('branch.hours')}</p>
          <OpeningHours branch={branch} />
        </div>
      )}
    </section>
  )
}
