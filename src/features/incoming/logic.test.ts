import { describe, expect, it } from 'vitest'
import { ageTone, waitingMinutes } from './logic'

describe('incoming age badge (§8.3)', () => {
  const now = Date.parse('2026-10-05T10:00:00Z')

  it('counts from assignedAt, falling back to createdAt', () => {
    expect(waitingMinutes({ assignedAt: '2026-10-05T09:30:00Z', createdAt: '2026-10-05T08:00:00Z' }, now)).toBe(30)
    expect(waitingMinutes({ assignedAt: null, createdAt: '2026-10-05T08:00:00' }, now)).toBe(120)
    expect(waitingMinutes({ assignedAt: '2026-10-05T10:05:00Z', createdAt: '2026-10-05T10:05:00Z' }, now)).toBe(0)
  })

  it('turns from fresh to waiting to late', () => {
    expect(ageTone(5)).toBe('success')
    expect(ageTone(15)).toBe('waiting')
    expect(ageTone(59)).toBe('waiting')
    expect(ageTone(60)).toBe('danger')
  })
})
