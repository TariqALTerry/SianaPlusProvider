import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CalendarClock, Truck, User } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { DeviceCustodyStage, WorkshopDevice } from '@/api/types'
import { HumanNumber } from '@/components/EntityLink'
import { SearchInput } from '@/components/Filters'
import { DateTime } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, ErrorState } from '@/components/States'
import { Badge, toneDot } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useLang } from '@/hooks/useLang'
import { useUrlState } from '@/hooks/useUrlState'
import { enumLabel, enumTone } from '@/i18n/enums'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { trackingApi, trackingKeys } from './api'
import { PlanTripDialog } from './components/TrackingDialogs'
import { matchesSearch, WORKSHOP_STAGES } from './logic'
import './i18n'

const schema = { q: '', stage: '' }

/**
 * `/workshop` (SERVICE-TRACKING-PROVIDER-PLATFORM-PROMPT §2): one column per stage away from the customer, with the
 * server's counts; each card flags "no update" (48 h) and "plan the return" with a direct action. Search by tag is
 * local (the endpoint filters by stage only).
 */
export function WorkshopPage() {
  const { t } = useTranslation('workshop')
  const { lang } = useLang()
  const { state, set: setState } = useUrlState(schema)
  const stage = (WORKSHOP_STAGES as readonly string[]).includes(state.stage) ? (state.stage as DeviceCustodyStage) : undefined
  const [returnFor, setReturnFor] = useState<WorkshopDevice | null>(null)
  const [returnOpen, setReturnOpen] = useState(false)

  const query = useQuery({
    queryKey: trackingKeys.board(stage),
    queryFn: ({ signal }) => trackingApi.board(stage, signal),
  })

  const devices = (query.data?.devices ?? []).filter((d) => matchesSearch(d, state.q))
  const count = (s: DeviceCustodyStage) => query.data?.counts.find((c) => c.stage === s)?.count ?? 0
  const columns = stage ? [stage] : WORKSHOP_STAGES
  const attention = (query.data?.devices ?? []).filter((d) => d.needsUpdate || d.needsReturnTrip).length

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        meta={
          attention > 0 ? (
            <Badge tone="danger">
              <AlertTriangle className="size-3" /> {t('attention', { count: attention })}
            </Badge>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={state.q} onChange={(q) => setState({ q }, { replace: true })} placeholder={`${t('searchTag')} — ${t('searchHint')}`} className="sm:w-72" />
        <Select
          aria-label={t('stageFilter')}
          value={stage ?? ''}
          onChange={(e) => setState({ stage: e.target.value })}
          className="h-8 w-full sm:w-56"
        >
          <option value="">{t('allStages')}</option>
          {WORKSHOP_STAGES.map((s) => (
            <option key={s} value={s}>
              {enumLabel('DeviceCustodyStage', s, lang)} ({count(s)})
            </option>
          ))}
        </Select>
      </div>

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {WORKSHOP_STAGES.map((s) => (
            <Skeleton key={s} className="h-64" />
          ))}
        </div>
      ) : query.data.devices.length === 0 && !stage ? (
        <Card>
          <EmptyState title={t('empty')} />
        </Card>
      ) : state.q && devices.length === 0 ? (
        <Card>
          <EmptyState title={t('emptySearch')} />
        </Card>
      ) : (
        <div className={cn('grid gap-4', columns.length > 1 && 'md:grid-cols-2 xl:grid-cols-4')}>
          {columns.map((s) => {
            const items = devices.filter((d) => d.stage === s)
            return (
              <section key={s} aria-label={enumLabel('DeviceCustodyStage', s, lang)} className="min-w-0 rounded-xl bg-muted/40 p-2">
                <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold">
                  <span className={cn('size-2 rounded-full', toneDot[enumTone('DeviceCustodyStage', s)])} aria-hidden />
                  {enumLabel('DeviceCustodyStage', s, lang)}
                  <span className="tabular ms-auto rounded-full bg-surface px-2 text-xs">{count(s)}</span>
                </h2>
                {items.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">{t('emptyColumn')}</p>
                ) : (
                  <ul className={cn('space-y-2', columns.length === 1 && 'grid gap-2 space-y-0 sm:grid-cols-2 xl:grid-cols-3')}>
                    {items.map((d) => (
                      <DeviceCard
                        key={d.deviceId}
                        device={d}
                        onArrangeReturn={() => {
                          setReturnFor(d)
                          setReturnOpen(true)
                        }}
                      />
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}

      {returnFor && (
        <PlanTripDialog
          item={{ id: returnFor.serviceItemId, itemNumber: returnFor.itemNumber, serviceNameAr: returnFor.serviceNameAr, serviceNameEn: returnFor.serviceNameEn }}
          type="Return"
          current={null}
          open={returnOpen}
          onOpenChange={setReturnOpen}
        />
      )}
    </>
  )
}

function DeviceCard({ device: d, onArrangeReturn }: { device: WorkshopDevice; onArrangeReturn: () => void }) {
  const { t } = useTranslation('workshop')
  const { lang, pick } = useLang()
  const href = `/work/${d.serviceItemId}?tab=tracking`
  return (
    <li className={cn('rounded-lg border bg-surface p-3 text-sm shadow-sm', d.needsUpdate && 'border-tone-danger/40')}>
      <div className="flex items-start justify-between gap-2">
        <Link to={href} className="min-w-0 hover:underline">
          <span className="ltr-nums block font-mono text-xs font-semibold text-primary">{d.tagCode ?? '—'}</span>
          <span className="block truncate font-medium">{[d.name, d.brand, d.model].filter(Boolean).join(' · ')}</span>
        </Link>
        {d.stageAt && (
          <span className="shrink-0 text-xs text-muted-foreground" title={t('since')}>
            <DateTime value={d.stageAt} />
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        <span className="block truncate">{pick(d.serviceNameAr, d.serviceNameEn)}</span>
        <HumanNumber value={d.itemNumber} />
      </p>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {d.technicianName && (
          <span className="inline-flex items-center gap-1" title={t('technician')}>
            <User className="size-3" aria-hidden /> {d.technicianName}
          </span>
        )}
        {d.holderName && (
          <span className="inline-flex items-center gap-1" title={t('holder')}>
            <Truck className="size-3" aria-hidden /> {d.holderName}
          </span>
        )}
        {d.expectedReadyAt && (
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="size-3" aria-hidden /> {t('expectedReady', { date: formatDateTime(d.expectedReadyAt, lang) })}
          </span>
        )}
      </div>
      {(d.needsUpdate || d.needsReturnTrip) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {d.needsUpdate && (
            <Badge tone="danger" title={t('needsUpdateHint')}>
              {t('needsUpdate')}
            </Badge>
          )}
          {d.needsReturnTrip && (
            <Button size="sm" variant="outline" className="h-6 border-tone-attention/40 bg-tone-attention-soft px-2 text-xs text-tone-attention" title={t('needsReturnHint')} onClick={onArrangeReturn}>
              <Truck className="size-3" /> {t('needsReturn')}
            </Button>
          )}
        </div>
      )}
      <Link to={href} className="mt-2 inline-block text-xs text-primary hover:underline">
        {t('openTracking')}
      </Link>
    </li>
  )
}
