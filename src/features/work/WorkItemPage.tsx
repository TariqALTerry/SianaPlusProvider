import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Gavel, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { HumanNumber } from '@/components/EntityLink'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState, PageSkeleton } from '@/components/States'
import { StatusBadge } from '@/components/StatusBadge'
import { Timeline } from '@/components/Timeline'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { detailQueryOptions } from '@/api/queryClient'
import { useLang } from '@/hooks/useLang'
import { usePollingInterval } from '@/hooks/usePageVisible'
import { enumLabel } from '@/i18n/enums'
import './i18n'
import { workApi, workKeys } from './api'
import { isLiveStatus } from './logic'
import {
  AssignmentsSection,
  CustomerCard,
  DevicesCard,
  MilestonesCard,
  PhotosSection,
  QuotationsSection,
  ScheduleCard,
  SchedulesSection,
  TechnicianCard,
  WorkflowCard,
} from './components/ItemSections'
import { WorkActions } from './components/WorkActions'
import { NetBlock } from './components/widgets'

const TABS = ['timeline', 'photos', 'quotations', 'assignments', 'schedules'] as const
type Tab = (typeof TABS)[number]

/** `/work/:id` (§8.4): everything about one item, polled every 30 s while it can still change. */
export function WorkItemPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation('work')
  const { lang, pick } = useLang()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const interval = usePollingInterval(30_000)
  const tab: Tab = (TABS as readonly string[]).includes(params.get('tab') ?? '') ? (params.get('tab') as Tab) : 'timeline'

  const query = useQuery({
    queryKey: workKeys.detail(id),
    queryFn: ({ signal }) => workApi.detail(id, signal),
    ...detailQueryOptions,
    refetchInterval: (q) => (q.state.data && isLiveStatus(q.state.data.item.status) ? interval : false),
  })

  if (query.isPending) return <PageSkeleton />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  const { item, timeline, evidence, quotations, assignments, schedules, workflow } = query.data
  const live = isLiveStatus(item.status)
  const counts: Partial<Record<Tab, number>> = {
    timeline: timeline.length,
    photos: evidence.length,
    quotations: quotations.length,
    assignments: assignments.length,
    schedules: schedules.length,
  }

  // After "اعتذار" the item belongs to the platform again: leave before anything refetches it.
  const onRejected = () => {
    navigate('/incoming', { replace: true })
    queryClient.removeQueries({ queryKey: workKeys.detail(id) })
  }

  return (
    <>
      <PageHeader
        back={{ to: '/work', label: t('detail.back') }}
        title={
          <span className="flex flex-wrap items-center gap-x-2">
            {pick(item.serviceNameAr, item.serviceNameEn)}
            {(item.issueNameAr || item.issueNameEn) && <span className="text-base font-normal text-muted-foreground">— {pick(item.issueNameAr, item.issueNameEn)}</span>}
          </span>
        }
        meta={
          <>
            <StatusBadge enum="ServiceItemStatus" value={item.status} />
            {item.statusBeforeHold && <span className="text-xs text-muted-foreground">{t('detail.was', { status: enumLabel('ServiceItemStatus', item.statusBeforeHold, lang) })}</span>}
            {item.hasDispute && (
              <Badge tone="danger">
                <ShieldAlert className="size-3" /> {t('icons.dispute')}
              </Badge>
            )}
            {item.isMarketplace && (
              <Badge tone="info">
                <Gavel className="size-3" /> {t('icons.marketplace')}
              </Badge>
            )}
            {item.executorAssignmentDelegated && (
              <Badge tone="active">
                <Sparkles className="size-3" /> {t('icons.delegated')}
              </Badge>
            )}
          </>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <HumanNumber value={item.itemNumber} />
            {item.orderNumber && (
              <span className="inline-flex items-center gap-1">
                {t('detail.order')}: <HumanNumber value={item.orderNumber} />
              </span>
            )}
            {live && (
              <span className="inline-flex items-center gap-1 text-xs">
                <RefreshCw className={query.isFetching ? 'size-3 animate-spin' : 'size-3'} aria-hidden /> {t('detail.live')}
              </span>
            )}
          </span>
        }
      />

      <WorkActions item={item} onRejected={onRejected} />

      {item.pendingQuotation && (
        <p className="mb-4 rounded-lg border border-tone-attention/30 bg-tone-attention-soft px-3 py-2 text-sm text-tone-attention" role="status">
          {t('detail.pendingQuotation')} — <span className="ltr-nums font-mono">{item.pendingQuotation.quotationNumber}</span>
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <CustomerCard item={item} />
          <DevicesCard item={item} />
          <Tabs
            value={tab}
            onValueChange={(v) => {
              const next = new URLSearchParams(params)
              if (v === 'timeline') next.delete('tab')
              else next.set('tab', v)
              setParams(next, { replace: true })
            }}
          >
            <TabsList>
              {TABS.map((k) => (
                <TabsTrigger key={k} value={k}>
                  {t(`detail.tabs.${k}`)}
                  {!!counts[k] && <span className="tabular rounded-full bg-muted px-1.5 text-xs">{counts[k]}</span>}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="timeline">
              <Card className="p-4">
                <Timeline rows={timeline.map((event) => ({ event }))} />
              </Card>
            </TabsContent>
            <TabsContent value="photos">
              <PhotosSection evidence={evidence} />
            </TabsContent>
            <TabsContent value="quotations">
              <QuotationsSection quotations={quotations} />
            </TabsContent>
            <TabsContent value="assignments">
              <AssignmentsSection assignments={assignments} />
            </TabsContent>
            <TabsContent value="schedules">
              <SchedulesSection schedules={schedules} />
            </TabsContent>
          </Tabs>
        </div>
        <aside className="min-w-0 space-y-4">
          <NetBlock item={item} />
          <TechnicianCard item={item} />
          <ScheduleCard item={item} schedules={schedules} />
          <WorkflowCard steps={workflow} item={item} />
          <MilestonesCard item={item} />
        </aside>
      </div>
    </>
  )
}
