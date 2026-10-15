import type { DayOfWeek, WorkingHoursEntry } from '@/api/types'

/**
 * Executor working hours (PROVIDER-PLATFORM-PHASE2-PROMPT §5), Riyadh time. The server's list holds only
 * working days; an empty list means "no restriction" (assignable any time).
 */

/** The Saudi week starts on Sunday. */
export const WEEK: readonly DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export interface DayRow {
  day: DayOfWeek
  works: boolean
  start: string
  end: string
}

export const DEFAULT_START = '08:00'
export const DEFAULT_END = '17:00'

/** "08:00:00" → "08:00" for `<input type="time">`. */
export function hhmm(value: string): string {
  return value.slice(0, 5)
}

/** The server list → one row per weekday. */
export function toRows(entries: readonly WorkingHoursEntry[]): DayRow[] {
  return WEEK.map((day) => {
    const e = entries.find((x) => x.dayOfWeek === day)
    return e ? { day, works: true, start: hhmm(e.start), end: hhmm(e.end) } : { day, works: false, start: DEFAULT_START, end: DEFAULT_END }
  })
}

/** The rows → what the server stores: working days only. */
export function toEntries(rows: readonly DayRow[]): WorkingHoursEntry[] {
  return rows.filter((r) => r.works).map((r) => ({ dayOfWeek: r.day, start: r.start, end: r.end }))
}

/** A starting week when there are no hours yet: Sunday–Thursday, 08:00–17:00. */
export function defaultWeek(): DayRow[] {
  return WEEK.map((day) => ({ day, works: day !== 'Friday' && day !== 'Saturday', start: DEFAULT_START, end: DEFAULT_END }))
}

/** Days whose end is not after the start (the server answers `WorkingHoursInvalid`). */
export function invalidDays(rows: readonly DayRow[]): DayOfWeek[] {
  return rows.filter((r) => r.works && !(r.start && r.end && r.end > r.start)).map((r) => r.day)
}
