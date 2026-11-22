import { describe, expect, it } from 'vitest'
import { enumLabel } from '@/i18n/enums'
import { formatCallDuration } from './calls'

describe('service calls', () => {
  it('formats answered talk time as mm:ss', () => {
    expect(formatCallDuration({ outcome: 'Answered', durationSeconds: 125 })).toBe('02:05')
    expect(formatCallDuration({ outcome: 'Answered', durationSeconds: 0 })).toBe('00:00')
  })
  it('shows a dash for calls never answered', () => {
    expect(formatCallDuration({ outcome: 'Missed', durationSeconds: 30 })).toBe('—')
  })
  it('labels outcome and side in Arabic and English', () => {
    expect(enumLabel('ServiceCallOutcome', 'Missed', 'ar')).toBe('لم يرد')
    expect(enumLabel('ServiceCallOutcome', 'Declined', 'en')).toBe('Declined')
    expect(enumLabel('ServiceCallSide', 'Executor', 'ar')).toBe('الفني')
  })
})
