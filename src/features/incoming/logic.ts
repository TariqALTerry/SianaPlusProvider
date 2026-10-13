import type { IncomingWorkItemResponse } from '@/api/types'
import type { Tone } from '@/i18n/enums'
import { dayjs, minutesSince } from '@/lib/format'

/** How long the item has waited with the organization: since `assignedAt`, else `createdAt`. */
export function waitingMinutes(item: Pick<IncomingWorkItemResponse, 'assignedAt' | 'createdAt'>, nowMs: number = Date.now()): number {
  return Math.max(0, minutesSince(item.assignedAt ?? item.createdAt, dayjs(nowMs)) ?? 0)
}

/** Age badge tone: fresh < 15 min, then waiting, and late after an hour. */
export function ageTone(minutes: number): Tone {
  if (minutes < 15) return 'success'
  if (minutes < 60) return 'waiting'
  return 'danger'
}
