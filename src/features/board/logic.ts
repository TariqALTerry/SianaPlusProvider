import type { ExecutorLoadResponse, ScheduledItemResponse } from '@/api/types'
import { dayjs, DISPLAY_TZ, parseUtc } from '@/lib/format'

/** Items without an end get this much room on the timeline. */
export const DEFAULT_BLOCK_MINUTES = 60
const DAY_START_HOUR = 8
const DAY_END_HOUR = 20

export interface BoardWindow {
  /** Riyadh hours shown, [startHour, endHour). */
  startHour: number
  endHour: number
}

function riyadhMinutes(iso: string | null | undefined): number | null {
  const d = parseUtc(iso)
  if (!d) return null
  const r = d.tz(DISPLAY_TZ)
  return r.hour() * 60 + r.minute()
}

/** 08:00–20:00 by default, widened to whole hours so every item of the day fits. */
export function boardWindow(items: readonly ScheduledItemResponse[]): BoardWindow {
  let start = DAY_START_HOUR * 60
  let end = DAY_END_HOUR * 60
  for (const item of items) {
    const s = riyadhMinutes(item.scheduledStart)
    if (s === null) continue
    const e = riyadhMinutes(item.scheduledEnd)
    // An end before the start means it crosses midnight: run to the end of the day.
    const endMin = e === null ? s + DEFAULT_BLOCK_MINUTES : e <= s ? 24 * 60 : e
    start = Math.min(start, s)
    end = Math.max(end, endMin)
  }
  return { startHour: Math.max(0, Math.floor(start / 60)), endHour: Math.min(24, Math.ceil(end / 60)) }
}

/** A block's offset and width as percentages of the window (logical start → RTL-safe). */
export function blockPosition(item: Pick<ScheduledItemResponse, 'scheduledStart' | 'scheduledEnd'>, w: BoardWindow): { start: number; width: number } | null {
  const s = riyadhMinutes(item.scheduledStart)
  if (s === null) return null
  const e = riyadhMinutes(item.scheduledEnd)
  const endMin = e === null ? s + DEFAULT_BLOCK_MINUTES : e <= s ? 24 * 60 : e
  const from = w.startHour * 60
  const span = Math.max(60, (w.endHour - w.startHour) * 60)
  const start = Math.max(0, Math.min(100, ((s - from) / span) * 100))
  const width = Math.max(1.5, Math.min(100 - start, ((endMin - s) / span) * 100))
  return { start, width }
}

/** Where "now" sits on the window, or null outside it. */
export function nowPosition(w: BoardWindow, now: dayjs.ConfigType = undefined): number | null {
  const r = dayjs(now).tz(DISPLAY_TZ)
  const m = r.hour() * 60 + r.minute()
  const from = w.startHour * 60
  const to = w.endHour * 60
  if (m < from || m > to) return null
  return ((m - from) / (to - from)) * 100
}

export interface BoardLane {
  /** `null` = the unassigned lane on top. */
  executor: ExecutorLoadResponse | null
  /** For executors not in the list (should not happen): the id and name from the item. */
  key: string
  name: string | null
  items: ScheduledItemResponse[]
}

/**
 * One lane per technician (§8.6), with unassigned items on top. Active technicians always get a
 * lane; inactive ones only when they have items today.
 */
export function boardLanes(executors: readonly ExecutorLoadResponse[], items: readonly ScheduledItemResponse[]): BoardLane[] {
  const byExecutor = new Map<string, ScheduledItemResponse[]>()
  const unassigned: ScheduledItemResponse[] = []
  for (const item of items) {
    if (!item.executor) unassigned.push(item)
    else byExecutor.set(item.executor.id, [...(byExecutor.get(item.executor.id) ?? []), item])
  }
  const lanes: BoardLane[] = [{ executor: null, key: 'unassigned', name: null, items: unassigned }]
  const known = new Set<string>()
  for (const e of executors) {
    known.add(e.executorId)
    const own = byExecutor.get(e.executorId) ?? []
    if (e.isActive || own.length) lanes.push({ executor: e, key: e.executorId, name: e.fullName, items: own })
  }
  for (const [id, own] of byExecutor) {
    if (!known.has(id)) lanes.push({ executor: null, key: id, name: own[0]?.executor?.fullName ?? null, items: own })
  }
  return lanes
}
