import { useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Clock, Cpu, Gavel, MapPin, Sparkles, UserPlus, UserX, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EnumText } from '@/components/StatusBadge'
import type { IncomingWorkItemResponse } from '@/api/types'
import { canPrefetch } from '@/api/netStatus'
import { useLang } from '@/hooks/useLang'
import { formatDateTime, formatDuration, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { prefetchWorkItem } from '@/features/work/api'
import { CoverageBadge, NetInline } from '@/features/work/components/widgets'
import { useDelegateAction, useWriteGate } from '@/features/work/hooks'
import { canRejectIncoming } from '@/features/work/logic'
import { ageTone, waitingMinutes } from '../logic'
import '../i18n'

/** Re-render every minute so the age badges stay honest. */
function useMinuteNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function IncomingCard({
  item,
  onPick,
  onReject,
}: {
  item: IncomingWorkItemResponse
  onPick: () => void
  onReject: () => void
}) {
  const { t } = useTranslation('incoming')
  const { t: tw } = useTranslation('work')
  const { lang, pick } = useLang()
  const queryClient = useQueryClient()
  const gate = useWriteGate()
  const now = useMinuteNow()
  const delegate = useDelegateAction({ errorToast: true })

  const declined = item.status === 'Rejected'
  const minutes = waitingMinutes(item, now)
  const tone = ageTone(minutes)
  const area = [item.district, item.city].filter(Boolean).join('، ')
  const service = pick(item.serviceNameAr, item.serviceNameEn)
  const issue = item.issueNameAr || item.issueNameEn ? pick(item.issueNameAr, item.issueNameEn) : null
  const prefetch = () => canPrefetch() && void prefetchWorkItem(queryClient, item.id)

  return (
    <Card className={cn('flex w-full flex-col', declined && 'border-tone-danger/40')}>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={`incoming-${item.id}`} className="font-semibold leading-snug">
              {service}
              {issue && <span className="font-normal text-muted-foreground"> — {issue}</span>}
            </h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              {item.itemNumber && <span className="ltr-nums font-mono">{item.itemNumber}</span>}
              <EnumText enum="ExecutionMode" value={item.executionMode} />
            </p>
          </div>
          <Badge tone={tone} className="shrink-0" title={formatDateTime(item.assignedAt ?? item.createdAt, lang)}>
            <Clock className="size-3" aria-hidden />
            <span className="tabular">{t('waiting', { age: formatDuration(minutes, lang) })}</span>
          </Badge>
        </div>

        {(declined || item.isMarketplace || item.executorAssignmentDelegated || item.isSubscriptionCovered) && (
          <div className="flex flex-wrap gap-1.5">
            {declined && (
              <Badge tone="danger">
                <UserX className="size-3" aria-hidden /> {t('declinedTag')}
              </Badge>
            )}
            {item.isMarketplace && (
              <Badge tone="info">
                <Gavel className="size-3" aria-hidden /> {t('marketplace')}
              </Badge>
            )}
            {item.executorAssignmentDelegated && (
              <Badge tone="active">
                <Sparkles className="size-3" aria-hidden /> {t('delegated')}
              </Badge>
            )}
            {item.isSubscriptionCovered && <CoverageBadge />}
          </div>
        )}

        <ul className="space-y-1.5 text-sm">
          <li className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span>{area || '—'}</span>
          </li>
          <li className="flex items-center gap-2">
            <CalendarClock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="sr-only">{t('window')}: </span>
            {item.scheduledStart ? (
              <span className="tabular ltr-nums">
                {formatDateTime(item.scheduledStart, lang)}
                {item.scheduledEnd && <span className="text-muted-foreground"> – {formatTime(item.scheduledEnd)}</span>}
              </span>
            ) : (
              <span className="text-muted-foreground">{t('noWindow')}</span>
            )}
          </li>
          <li className="flex items-center gap-2">
            <Cpu className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span>{t('devices', { count: item.deviceCount })}</span>
          </li>
        </ul>

        {item.customerDescription && <p className="line-clamp-2 rounded-md bg-muted/60 px-2.5 py-1.5 text-sm text-muted-foreground">{item.customerDescription}</p>}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <NetInline
            netAmount={item.netAmount}
            finalAmount={item.finalAmount}
            commissionRate={item.commissionRate}
            coverage={item.isSubscriptionCovered ? item : null}
            className="text-base"
          />
          <Link to={`/work/${item.id}`} onMouseEnter={prefetch} onFocus={prefetch} className="text-xs font-medium text-primary hover:underline">
            {t('details')}
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t bg-muted/30 px-4 py-3">
        <Button size="sm" onClick={onPick} disabled={gate.disabled} title={gate.reason} className="flex-1 sm:flex-none">
          <UserPlus /> {tw('actions.assign')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => delegate.mutate({ id: item.id, previousExecutorId: null })}
          loading={delegate.isPending}
          disabled={gate.disabled}
          title={gate.reason}
          className="flex-1 sm:flex-none"
        >
          <Sparkles /> {tw('actions.delegate')}
        </Button>
        {canRejectIncoming(item.status) && (
          <Button size="sm" variant="ghost" onClick={onReject} disabled={gate.disabled} title={gate.reason} className="text-destructive hover:bg-destructive-soft sm:ms-auto">
            <XCircle /> {tw('actions.reject')}
          </Button>
        )}
      </div>
    </Card>
  )
}
