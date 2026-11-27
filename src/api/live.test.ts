import { describe, expect, it } from 'vitest'
import { qk } from './keys'
import { invalidationsFor, liveAware, LIVE_POLL_FACTOR, useLive } from './live'

describe('live updates', () => {
  it('a changed service refreshes every view that shows services, a notification the bell', () => {
    const keys = invalidationsFor('serviceItem')
    for (const k of [qk.incoming, qk.work, qk.board, qk.counter]) expect(keys).toContainEqual(k)
    expect(invalidationsFor('notification')).toEqual([qk.notifications])
  })

  it('polls slower only while live', () => {
    expect(liveAware(30_000, 'live')).toBe(30_000 * LIVE_POLL_FACTOR)
    expect(liveAware(30_000, 'reconnecting')).toBe(30_000)
    expect(liveAware(30_000, 'off')).toBe(30_000)
  })

  it('keeps the latest position per technician', () => {
    useLive.getState().setLocation({ executorId: 'e1', latitude: 24.7, longitude: 46.6, at: '2026-11-27T09:00:00Z' })
    useLive.getState().setLocation({ executorId: 'e1', latitude: 24.8, longitude: 46.7, at: '2026-11-27T09:01:00Z' })
    expect(useLive.getState().locations.e1).toEqual({ latitude: 24.8, longitude: 46.7, at: '2026-11-27T09:01:00Z' })
  })
})
