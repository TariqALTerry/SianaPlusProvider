import { describe, expect, it } from 'vitest'
import type { ExecutorLoadResponse, ScheduledItemResponse } from '@/api/types'
import { blockPosition, boardLanes, boardWindow, nowPosition } from './logic'

const item = (id: string, start: string | null, end: string | null, executorId: string | null = null): ScheduledItemResponse => ({
  id,
  itemNumber: null,
  serviceNameAr: 'صيانة',
  serviceNameEn: 'Repair',
  status: 'Scheduled',
  scheduledStart: start,
  scheduledEnd: end,
  executor: executorId ? { id: executorId, fullName: `E-${executorId}`, phoneNumber: null } : null,
  city: null,
  district: null,
})

const executor = (executorId: string, isActive = true): ExecutorLoadResponse => ({
  executorId,
  userId: `u-${executorId}`,
  fullName: `E-${executorId}`,
  phoneNumber: null,
  availability: 'Available',
  isActive,
  maxConcurrentJobs: 3,
  activeJobs: 0,
  averageRating: 0,
})

describe('board timeline (§8.6)', () => {
  it('shows 08:00–20:00 by default and widens to fit the day (Riyadh = UTC+3)', () => {
    expect(boardWindow([])).toEqual({ startHour: 8, endHour: 20 })
    // 06:30–07:15 Riyadh and 21:00 + default hour
    expect(boardWindow([item('a', '2026-10-05T03:30:00Z', '2026-10-05T04:15:00Z'), item('b', '2026-10-05T18:00:00Z', null)])).toEqual({ startHour: 6, endHour: 22 })
  })

  it('positions blocks as percentages of the window', () => {
    const w = { startHour: 8, endHour: 20 }
    // 11:00–14:00 Riyadh → 3h offset and 3h width over 12h
    expect(blockPosition(item('a', '2026-10-05T08:00:00Z', '2026-10-05T11:00:00Z'), w)).toEqual({ start: 25, width: 25 })
    // No end → one hour
    const p = blockPosition(item('b', '2026-10-05T05:00:00Z', null), w)!
    expect(p.start).toBe(0)
    expect(p.width).toBeCloseTo(100 / 12)
    expect(blockPosition(item('c', null, null), w)).toBeNull()
  })

  it('places "now" only inside the window', () => {
    const w = { startHour: 8, endHour: 20 }
    expect(nowPosition(w, '2026-10-05T11:00:00Z')).toBe(50) // 14:00 Riyadh
    expect(nowPosition(w, '2026-10-05T19:00:00Z')).toBeNull() // 22:00 Riyadh
  })

  it('puts unassigned items on top and gives inactive technicians a lane only when busy', () => {
    const lanes = boardLanes(
      [executor('1'), executor('2', false), executor('3', false)],
      [item('a', '2026-10-05T08:00:00Z', null), item('b', '2026-10-05T09:00:00Z', null, '1'), item('c', '2026-10-05T10:00:00Z', null, '3'), item('d', '2026-10-05T10:00:00Z', null, '9')],
    )
    expect(lanes.map((l) => l.key)).toEqual(['unassigned', '1', '3', '9'])
    expect(lanes[0]!.items.map((i) => i.id)).toEqual(['a'])
    expect(lanes[3]!.name).toBe('E-9')
  })
})
