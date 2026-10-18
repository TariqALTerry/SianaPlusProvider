import { useQuery } from '@tanstack/react-query'
import { CalendarClock, Camera, KeyRound, MessageSquarePlus, Package, Truck, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fileUrl } from '@/api/files'
import type { CustodyEventResponse, DeviceCustodyStage, LegResponse, ProgressUpdateResponse, ServiceItemLegType, ServiceTrackingResponse, TrackedDevice } from '@/api/types'
import { DateTime } from '@/components/Format'
import { EmptyState, ErrorState } from '@/components/States'
import { EnumText, StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { WorkTarget } from '@/features/work/hooks'
import { useLang } from '@/hooks/useLang'
import { enumLabel } from '@/i18n/enums'
import { formatDateTime } from '@/lib/format'
import { trackingApi, trackingKeys } from './api'
import { CancelTripDialog, MoveDeviceDialog, PlanTripDialog, SendUpdateDialog } from './components/TrackingDialogs'
import { isClosedStatus, nextSteps, plannedTrip, tripNeeds } from './logic'
import './i18n'

/**
 * Work item → "التتبع" (SERVICE-TRACKING-PROVIDER-PLATFORM-PROMPT §2): updates sent to the customer, the devices with
 * their custody path, and the pickup/return trips. `handoverCode` is never shown here (always empty on the platform).
 */
export function TrackingTab({ item, refetchInterval }: { item: WorkTarget; refetchInterval: number | false }) {
  const { t } = useTranslation('workshop')
  const query = useQuery({
    queryKey: trackingKeys.tracking(item.id),
    queryFn: ({ signal }) => trackingApi.tracking(item.id, signal),
    refetchInterval,
  })

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    )
  }
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  const data = query.data
  return (
    <div className="space-y-4">
      <UpdatesCard item={item} data={data} />
      {data.hasCustody ? (
        <>
          <DevicesSection item={item} devices={data.devices} />
          <TripsCard item={item} data={data} />
        </>
      ) : (
        data.devices.length > 0 && (
          // Repaired on site so far; planning a pickup is how a device goes to the workshop.
          <>
            <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">{t('tracking.noCustody')}</p>
            <TripsCard item={item} data={data} />
          </>
        )
      )}
    </div>
  )
}

function UpdatesCard({ item, data }: { item: WorkTarget; data: ServiceTrackingResponse }) {
  const { t } = useTranslation('workshop')
  const { lang } = useLang()
  const [open, setOpen] = useState(false)
  const closed = isClosedStatus(data.itemStatus)

  return (
    <Card>
      <CardHeader
        title={t('tracking.updates')}
        description={
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            {data.expectedReadyAt && (
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <CalendarClock className="size-3.5" aria-hidden />
                {t('tracking.expectedReady', { date: formatDateTime(data.expectedReadyAt, lang) })}
              </span>
            )}
            <span>
              {t('tracking.lastUpdate')}: {data.lastUpdateAt ? <DateTime value={data.lastUpdateAt} /> : t('tracking.noUpdateYet')}
            </span>
          </span>
        }
        actions={
          <Button size="sm" onClick={() => setOpen(true)} disabled={closed} title={closed ? t('tracking.closed') : undefined}>
            <MessageSquarePlus /> {t('tracking.sendUpdate')}
          </Button>
        }
      />
      <CardBody>
        {data.updates.length === 0 ? (
          <EmptyState title={t('tracking.updatesEmpty')} />
        ) : (
          <ol className="space-y-3">
            {data.updates.map((u) => (
              <UpdateRow key={u.id} update={u} />
            ))}
          </ol>
        )}
      </CardBody>
      <SendUpdateDialog item={item} open={open} onOpenChange={setOpen} />
    </Card>
  )
}

function UpdateRow({ update: u }: { update: ProgressUpdateResponse }) {
  const { t } = useTranslation('workshop')
  const { lang } = useLang()
  return (
    <li className="flex gap-3 rounded-lg border p-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge enum="ProgressUpdateKind" value={u.kind} />
          <span className="text-xs text-muted-foreground">
            <DateTime value={u.createdAt} /> · {t('tracking.by')} {u.authorName} (<EnumText enum="ConversationSide" value={u.authorSide} />)
          </span>
        </div>
        {u.note && (
          <p className="whitespace-pre-line text-sm" dir="auto">
            {u.note}
          </p>
        )}
        {u.expectedReadyAt && (
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock className="size-3.5" aria-hidden />
            {t('tracking.expectedReady', { date: formatDateTime(u.expectedReadyAt, lang) })}
          </p>
        )}
      </div>
      {u.photoUrl && <Photo url={u.photoUrl} alt={enumLabel('ProgressUpdateKind', u.kind, lang)} />}
    </li>
  )
}

function DevicesSection({ item, devices }: { item: WorkTarget; devices: TrackedDevice[] }) {
  const { t } = useTranslation('workshop')
  const [move, setMove] = useState<{ device: TrackedDevice; to: DeviceCustodyStage } | null>(null)
  const [moveOpen, setMoveOpen] = useState(false)

  return (
    <Card>
      <CardHeader title={t('tracking.devices')} />
      <CardBody className="space-y-3">
        {devices.map((d) => (
          <DeviceRow
            key={d.deviceId}
            device={d}
            onStep={(to) => {
              setMove({ device: d, to })
              setMoveOpen(true)
            }}
          />
        ))}
      </CardBody>
      {move && <MoveDeviceDialog item={item} device={move.device} to={move.to} open={moveOpen} onOpenChange={setMoveOpen} />}
    </Card>
  )
}

function DeviceRow({ device: d, onStep }: { device: TrackedDevice; onStep: (to: DeviceCustodyStage) => void }) {
  const { t } = useTranslation('workshop')
  const steps = nextSteps(d.stage)
  return (
    <section className="rounded-lg border p-3" aria-label={d.name}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Package className="size-4 text-muted-foreground" aria-hidden />
            <span className="font-medium">{[d.name, d.brand, d.model].filter(Boolean).join(' · ')}</span>
            {d.tagCode && (
              <Badge tone="neutral" className="ltr-nums font-mono" title={t('tracking.tag')}>
                {d.tagCode}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <StatusBadge enum="DeviceCustodyStage" value={d.stage} />
            {d.stageAt && (
              <span title={t('tracking.stageSince')}>
                <DateTime value={d.stageAt} />
              </span>
            )}
            {d.holderName && <span>{t('tracking.holder', { name: d.holderName })}</span>}
          </div>
        </div>
        {steps.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {steps.map((s) => (
              <Button key={s.to} size="sm" variant={s.to === 'OutForReturn' || steps.length === 1 ? 'default' : 'outline'} onClick={() => onStep(s.to)}>
                {s.handover && <KeyRound />}
                {t(`tracking.step.${s.to}`)}
              </Button>
            ))}
          </div>
        )}
      </div>
      {d.events.length > 0 && (
        <details className="mt-3 group" open={d.events.length <= 4}>
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            {t('tracking.history')} <span className="tabular">({d.events.length})</span>
          </summary>
          <ol className="mt-2 space-y-2 border-s ps-3">
            {d.events.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </ol>
        </details>
      )}
    </section>
  )
}

function EventRow({ event: e }: { event: CustodyEventResponse }) {
  const { t } = useTranslation('workshop')
  const { lang } = useLang()
  return (
    <li className="flex items-start gap-3 text-sm">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge enum="DeviceCustodyStage" value={e.stage} />
          {e.codeVerified && (
            <Badge tone="success">
              <KeyRound className="size-3" /> {t('tracking.codeVerified')}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {e.actorName} · <DateTime value={e.createdAt} />
        </p>
        {e.note && (
          <p className="mt-0.5 text-xs" dir="auto">
            {e.note}
          </p>
        )}
      </div>
      {e.photoUrl && <Photo url={e.photoUrl} alt={enumLabel('DeviceCustodyStage', e.stage, lang)} small />}
    </li>
  )
}

function TripsCard({ item, data }: { item: WorkTarget; data: ServiceTrackingResponse }) {
  const { t } = useTranslation('workshop')
  const [plan, setPlan] = useState<ServiceItemLegType>('Pickup')
  const [planOpen, setPlanOpen] = useState(false)
  const [cancel, setCancel] = useState<LegResponse | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const needs = tripNeeds(data.devices)
  const planned = { Pickup: plannedTrip(data.legs, 'Pickup'), Return: plannedTrip(data.legs, 'Return') }
  const openPlan = (type: ServiceItemLegType) => {
    setPlan(type)
    setPlanOpen(true)
  }

  return (
    <Card>
      <CardHeader
        title={t('tracking.trips')}
        actions={
          <div className="flex flex-wrap gap-2">
            {/* A planned trip is changed from its own row. */}
            {needs.Pickup && !planned.Pickup && (
              <Button size="sm" variant="outline" onClick={() => openPlan('Pickup')}>
                <Truck /> {t('tracking.arrangePickup')}
              </Button>
            )}
            {needs.Return && !planned.Return && (
              <Button size="sm" variant="outline" onClick={() => openPlan('Return')}>
                <Truck className="-scale-x-100" /> {t('tracking.arrangeReturn')}
              </Button>
            )}
          </div>
        }
      />
      <CardBody>
        {data.legs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('tracking.tripsEmpty')}</p>
        ) : (
          <ul className="space-y-2">
            {data.legs.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border p-3 text-sm">
                <span className="font-medium">
                  <EnumText enum="ServiceItemLegType" value={l.type} />
                </span>
                <StatusBadge enum="ServiceItemLegStatus" value={l.status} />
                <span>{l.executorName}</span>
                <span className="text-xs text-muted-foreground">
                  {l.status === 'Done' && l.completedAt ? (
                    <>
                      {t('tracking.completedAt')} <DateTime value={l.completedAt} />
                    </>
                  ) : l.scheduledStart ? (
                    <>
                      {t('tracking.scheduled')}: <DateTime value={l.scheduledStart} mode="absolute" />
                      {l.scheduledEnd && (
                        <>
                          {' – '}
                          <DateTime value={l.scheduledEnd} mode="absolute" />
                        </>
                      )}
                    </>
                  ) : (
                    t('tracking.noSchedule')
                  )}
                </span>
                {l.status === 'Planned' && (
                  <span className="ms-auto flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openPlan(l.type)}>
                      {t('tracking.changeTrip')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        setCancel(l)
                        setCancelOpen(true)
                      }}
                    >
                      <X /> {t('tracking.cancelTrip')}
                    </Button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
      <PlanTripDialog item={item} type={plan} current={planned[plan]} open={planOpen} onOpenChange={setPlanOpen} />
      <CancelTripDialog item={item} leg={cancel} open={cancelOpen} onOpenChange={setCancelOpen} />
    </Card>
  )
}

/** A thumbnail that opens full size; a click never leaves the page. */
function Photo({ url, alt, small }: { url: string; alt: string; small?: boolean }) {
  const { t } = useTranslation('workshop')
  const [open, setOpen] = useState(false)
  const src = fileUrl(url)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={small ? 'relative size-12 shrink-0 overflow-hidden rounded-md border' : 'relative size-20 shrink-0 overflow-hidden rounded-md border'}
        aria-label={t('tracking.photo')}
      >
        <img src={src} alt={alt} loading="lazy" className="size-full object-cover" />
        <Camera className="absolute bottom-0.5 end-0.5 size-3 text-white drop-shadow" aria-hidden />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="2xl" className="bg-black p-2" aria-describedby={undefined}>
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <img src={src} alt={alt} className="max-h-[80vh] w-full object-contain" />
        </DialogContent>
      </Dialog>
    </>
  )
}
