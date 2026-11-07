import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeftRight, Archive, CheckCircle2, Clock, Inbox, PackageCheck, PauseCircle, PhoneCall, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { BranchBoardItem, BranchBoardResponse } from '@/api/types'
import { DateTime, Money } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/States'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field } from '@/components/ui/label'
import { useRoleKind } from '@/features/auth/authStore'
import { BranchSelect } from '@/features/branches/BranchSelect'
import { useBranchScope } from '@/features/branches/scope'
import { usePollingInterval } from '@/hooks/usePageVisible'
import { useLang } from '@/hooks/useLang'
import { useUrlState } from '@/hooks/useUrlState'
import { enumLabel } from '@/i18n/enums'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { counterApi, counterKeys } from './api'
import { boardItemHref, stageShares } from './logic'
import './opsI18n'

const schema = { branch: '' }

/**
 * `/counter/board` (phase 5 §3): one branch at a glance — today's numbers, every open device by stage split by age,
 * and the lists that need someone: overdue, awaiting the customer, ready not collected, on hold, abandon candidates.
 * The branch is the switcher's, or picked here when the switcher shows every branch. Polled every 60 s.
 */
export function BoardPage() {
  const { t } = useTranslation('counterOps')
  const { lang } = useLang()
  const scope = useBranchScope()
  const { state, set } = useUrlState(schema)
  const interval = usePollingInterval(60_000)
  const branchId = scope.selected?.id ?? (state.branch || null)

  const query = useQuery({
    queryKey: counterKeys.board(branchId ?? ''),
    queryFn: ({ signal }) => counterApi.board(branchId!, signal),
    enabled: !!branchId,
    refetchInterval: interval,
  })

  return (
    <>
      <PageHeader
        title={t('board.title')}
        description={query.data ? `${query.data.branchName} · ${t('board.updated', { date: formatDateTime(query.data.generatedAt, lang) })}` : t('board.description')}
        actions={
          branchId ? (
            <Button size="lg" variant="outline" onClick={() => void query.refetch()} aria-label={t('common:actions.refresh')}>
              <RefreshCw className={query.isFetching ? 'animate-spin' : undefined} />
            </Button>
          ) : undefined
        }
      />

      {scope.mode === 'none' ? (
        <EmptyState className="mt-10" title={t('board.noBranch')} />
      ) : (
        <>
          {!scope.selected && scope.mode !== 'loading' && (
            <Card className="mb-4">
              <CardBody>
                <Field label={t('board.pickBranch')} htmlFor="board-branch">
                  <BranchSelect id="board-branch" value={branchId} onChange={(b) => set({ branch: b ?? '' })} emptyLabel={t('board.pickBranch')} className="h-11 max-w-sm" />
                </Field>
              </CardBody>
            </Card>
          )}
          {!branchId ? null : query.isPending ? (
            <PageSkeleton />
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} />
          ) : (
            <Board data={query.data} />
          )}
        </>
      )}
    </>
  )
}

function Board({ data }: { data: BranchBoardResponse }) {
  const { t } = useTranslation('counterOps')
  const { lang } = useLang()
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile icon={<Inbox className="size-5" />} label={t('board.receivedToday')} value={data.receivedToday} />
        <Tile icon={<CheckCircle2 className="size-5" />} label={t('board.readyToday')} value={data.readyToday} />
        <Tile icon={<PackageCheck className="size-5" />} label={t('board.deliveredToday')} value={data.deliveredToday} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={t('board.stages')}
            actions={
              <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {t('board.legend')}:
                <Legend tone="bg-tone-success" label={enumLabel('AgingBucket', 'Days0To2', lang)} />
                <Legend tone="bg-tone-attention" label={enumLabel('AgingBucket', 'Days3To7', lang)} />
                <Legend tone="bg-tone-danger" label={enumLabel('AgingBucket', 'Over7Days', lang)} />
              </span>
            }
          />
          <CardBody>
            <StageBars data={data} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t('board.transfers')} />
          <CardBody className="space-y-3">
            <p className="flex items-center justify-between text-sm">
              <span>{t('board.outgoing', { count: data.transfersOutgoing })}</span>
              <span>{t('board.incoming', { count: data.transfersIncoming })}</span>
            </p>
            <Button asChild size="lg" variant="outline" className="w-full">
              <Link to="/counter/transfers">
                <ArrowLeftRight /> {t('board.transfers')}
              </Link>
            </Button>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListCard icon={<AlertTriangle className="size-4 text-tone-danger" />} title={t('board.overdue')} items={data.overdue} extra={(i) => (i.promisedReadyAt ? <DateTime value={i.promisedReadyAt} mode="absolute" className="text-xs text-tone-danger" /> : null)} />
        <ListCard
          icon={<PhoneCall className="size-4 text-tone-attention" />}
          title={t('board.awaitingCustomer')}
          items={data.awaitingCustomer}
          extra={(i) => (i.hoursWaiting !== null ? <Badge tone="attention">{t('board.hoursWaiting', { count: i.hoursWaiting })}</Badge> : null)}
          action={(i) =>
            i.fulfillmentChannel === 'WalkIn' ? (
              <Button asChild size="sm">
                <Link to={boardItemHref(i)}>
                  <PhoneCall /> {t('board.call')}
                </Link>
              </Button>
            ) : null
          }
        />
        <ListCard
          icon={<Clock className="size-4 text-tone-info" />}
          title={t('board.readyNotCollected')}
          items={data.readyNotCollected}
          extra={(i) => (
            <span className="flex items-center gap-2">
              {i.daysWaiting !== null && <Badge tone={i.daysWaiting > 7 ? 'danger' : 'neutral'}>{t('board.daysWaiting', { count: i.daysWaiting })}</Badge>}
              {!!i.storageFee && <Money value={i.storageFee} className="text-xs text-tone-attention" />}
            </span>
          )}
        />
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <PauseCircle className="size-4 text-tone-attention" /> {t('board.onHold')} ({data.onHold.length})
              </span>
            }
          />
          <CardBody className="space-y-3">
            {data.onHoldByReason.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {data.onHoldByReason.map((r) => (
                  <Badge key={r.reason ?? 'none'} tone="neutral">
                    {r.reason ? enumLabel('HoldReason', r.reason, lang) : t('board.noReason')}: <span className="tabular ms-1">{r.count}</span>
                  </Badge>
                ))}
              </div>
            )}
            <ItemRows items={data.onHold} extra={(i) => (i.holdReason ? <StatusBadge enum="HoldReason" value={i.holdReason} dot={false} /> : null)} />
          </CardBody>
        </Card>
        <ListCard icon={<Archive className="size-4 text-muted-foreground" />} title={t('board.abandonCandidates')} items={data.abandonCandidates} extra={(i) => (i.daysWaiting !== null ? <Badge tone="danger">{t('board.daysWaiting', { count: i.daysWaiting })}</Badge> : null)} />
      </div>
    </div>
  )
}

function Tile({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-surface p-4 shadow-sm">
      <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      <span>
        <span className="tabular block text-2xl font-bold">{value}</span>
        <span className="block text-xs text-muted-foreground">{label}</span>
      </span>
    </div>
  )
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn('size-2.5 rounded-sm', tone)} aria-hidden /> {label}
    </span>
  )
}

/** One bar per stage (always seven, in `BranchBoardStage` order), split by age: green 0–2, orange 3–7, red over 7 days. */
function StageBars({ data }: { data: BranchBoardResponse }) {
  const { lang } = useLang()
  const max = Math.max(1, ...data.stages.map((s) => s.count))
  return (
    <ul className="space-y-2.5">
      {data.stages.map((s) => {
        const shares = stageShares(s, max)
        return (
          <li key={s.stage} className="grid grid-cols-[minmax(6rem,9rem)_1fr_2.5rem] items-center gap-3 text-sm">
            <span className="truncate">{enumLabel('BranchBoardStage', s.stage, lang)}</span>
            <span className="flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${s.days0To2} / ${s.days3To7} / ${s.over7Days}`}>
              <span className="h-full bg-tone-success" style={{ width: `${shares.fresh}%` }} />
              <span className="h-full bg-tone-attention" style={{ width: `${shares.mid}%` }} />
              <span className="h-full bg-tone-danger" style={{ width: `${shares.old}%` }} />
            </span>
            <span className="tabular text-end font-semibold">{s.count}</span>
          </li>
        )
      })}
    </ul>
  )
}

function ListCard({ icon, title, items, extra, action }: { icon: ReactNode; title: string; items: BranchBoardItem[]; extra?: (i: BranchBoardItem) => ReactNode; action?: (i: BranchBoardItem) => ReactNode }) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            {icon} {title} ({items.length})
          </span>
        }
      />
      <CardBody>
        <ItemRows items={items} extra={extra} action={action} />
      </CardBody>
    </Card>
  )
}

/** A board row opens the counter item (walk-in) or the service in work (platform; the front desk never gets those). */
function ItemRows({ items, extra, action }: { items: BranchBoardItem[]; extra?: (i: BranchBoardItem) => ReactNode; action?: (i: BranchBoardItem) => ReactNode }) {
  const { t } = useTranslation('counterOps')
  const { pick } = useLang()
  const role = useRoleKind()
  if (!items.length) return <p className="text-sm text-muted-foreground">{t('board.emptyList')}</p>
  return (
    <ul className="max-h-96 divide-y overflow-y-auto">
      {items.map((i) => {
        const href = i.fulfillmentChannel === 'WalkIn' || role !== 'frontDesk' ? boardItemHref(i) : null
        const body = (
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-1.5">
              <bdi className="ltr-nums font-mono text-sm font-semibold">{i.code ?? i.itemNumber}</bdi>
              {i.fulfillmentChannel !== 'WalkIn' && <Badge tone="info">{t('board.platform')}</Badge>}
              <StatusBadge enum="AgingBucket" value={i.aging} />
              {i.isOverdue && <Badge tone="danger">{t('board.late')}</Badge>}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {[i.deviceName, pick(i.serviceNameAr, i.serviceNameEn), i.customerName, i.executorName].filter(Boolean).join(' · ')}
            </span>
            <span className="block text-[0.6875rem] text-muted-foreground">{t('board.daysInStage', { count: i.daysInStage })}</span>
          </span>
        )
        return (
          <li key={i.serviceItemId} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
            {href ? (
              <Link to={href} className="flex min-w-0 flex-1 rounded-md hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {body}
              </Link>
            ) : (
              body
            )}
            {extra?.(i)}
            {action?.(i)}
          </li>
        )
      })}
    </ul>
  )
}
