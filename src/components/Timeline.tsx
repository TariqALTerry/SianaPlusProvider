import { ArrowLeft, ArrowRight, Bot, Building2, Shield, User, Wrench } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { DateTime } from '@/components/Format'
import { JsonView } from '@/components/JsonView'
import { EnumText, StatusBadge } from '@/components/StatusBadge'
import { EmptyState } from '@/components/States'
import { useLang } from '@/hooks/useLang'
import type { ActorType, TimelineEventResponse } from '@/api/types'
import { cn } from '@/lib/utils'

const actorIcon: Record<ActorType, typeof Bot> = {
  System: Bot,
  Customer: User,
  Admin: Shield,
  Provider: Building2,
  Executor: Wrench,
}

const actorColor: Record<ActorType, string> = {
  System: 'bg-tone-neutral-soft text-tone-neutral',
  Customer: 'bg-tone-info-soft text-tone-info',
  Admin: 'bg-tone-active-soft text-tone-active',
  Provider: 'bg-tone-success-soft text-tone-success',
  Executor: 'bg-tone-attention-soft text-tone-attention',
}

/** Label for a backend event type (`common:timelineEvents`); unknown types are humanized. */
export function useEventLabel() {
  const { t } = useTranslation()
  return (type: string | null | undefined): string =>
    type ? t(`timelineEvents.${type}`, { defaultValue: type.replace(/([a-z])([A-Z])/g, '$1 $2') }) : '—'
}

export interface TimelineRow {
  event: TimelineEventResponse
  /** Optional context line above the event (e.g. which service item, in a merged order timeline). */
  context?: ReactNode
}

/** Vertical event list, newest first (§4.5). */
export function Timeline({ rows, className }: { rows: TimelineRow[]; className?: string }) {
  const { t } = useTranslation()
  const { isRtl } = useLang()
  const eventLabel = useEventLabel()
  const Arrow = isRtl ? ArrowLeft : ArrowRight

  if (!rows.length) return <EmptyState title={t('common.noData')} />

  const sorted = [...rows].sort((a, b) => (a.event.createdAt < b.event.createdAt ? 1 : -1))

  return (
    <ol className={cn('relative space-y-4 ps-8', className)}>
      <span className="absolute inset-y-1 start-3 w-px bg-border" aria-hidden />
      {sorted.map(({ event, context }) => {
        const Icon = actorIcon[event.actorType] ?? Bot
        return (
          <li key={event.id} className="relative">
            <span
              className={cn('absolute -start-8 top-0 flex size-6 items-center justify-center rounded-full ring-4 ring-surface', actorColor[event.actorType] ?? actorColor.System)}
              aria-hidden
            >
              <Icon className="size-3.5" />
            </span>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {context && <span className="text-xs text-muted-foreground">{context}</span>}
              <span className="text-sm font-medium">{eventLabel(event.eventType)}</span>
              {(event.fromStatus || event.toStatus) && (
                <span className="inline-flex items-center gap-1">
                  {event.fromStatus && <StatusBadge enum="ServiceItemStatus" value={event.fromStatus} dot={false} />}
                  {event.fromStatus && event.toStatus && <Arrow className="size-3 text-muted-foreground" />}
                  {event.toStatus && <StatusBadge enum="ServiceItemStatus" value={event.toStatus} dot={false} />}
                </span>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span>
                <EnumText enum="ActorType" value={event.actorType} />
                {event.actorName ? ` · ${event.actorName}` : ''}
              </span>
              <span aria-hidden>·</span>
              <DateTime value={event.createdAt} />
            </div>
            {event.note && <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/60 px-2 py-1 text-sm">{event.note}</p>}
            {event.metadataJson && <JsonView json={event.metadataJson} collapsible className="mt-1" />}
          </li>
        )
      })}
    </ol>
  )
}
