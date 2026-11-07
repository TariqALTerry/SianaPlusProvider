import { describe, expect, it } from 'vitest'
import {
  dayOfWeekFromIndex,
  formatCountdown,
  isTokenShaped,
  needsNewCode,
  ownWordsError,
  pageFailure,
  saturdayFirst,
  secondsUntil,
  stepper,
  telHref,
  waDigits,
} from './logic'

const states = (s: ReturnType<typeof stepper>) => (s.kind === 'steps' ? s.steps.map((x) => `${x.key}:${x.state}`) : s.kind)

describe('tracking stage bar (phase 4 §6)', () => {
  it('shades the current stage and every one before it', () => {
    expect(states(stepper('AwaitingApproval'))).toEqual([
      'Received:done',
      'Diagnosing:done',
      'AwaitingApproval:current',
      'InRepair:todo',
      'Ready:todo',
      'Delivered:todo',
    ])
    expect(states(stepper('Received'))[0]).toBe('Received:current')
  })

  it('delivered: everything done', () => {
    expect(states(stepper('Delivered', 'Repaired'))).toEqual(['Received:done', 'Diagnosing:done', 'AwaitingApproval:done', 'InRepair:done', 'Ready:done', 'Delivered:done'])
  })

  it('not repairable replaces repair and ready with one step, also once delivered', () => {
    expect(states(stepper('NotRepairable'))).toEqual(['Received:done', 'Diagnosing:done', 'AwaitingApproval:done', 'NotRepairable:current', 'Delivered:todo'])
    expect(states(stepper('Delivered', 'QuoteRejected'))).toEqual(['Received:done', 'Diagnosing:done', 'AwaitingApproval:done', 'NotRepairable:done', 'Delivered:done'])
  })

  it('cancelled is a grey bar only', () => {
    expect(stepper('Cancelled')).toEqual({ kind: 'cancelled' })
  })
})

describe('branch contacts', () => {
  it('builds wa.me digits', () => {
    expect(waDigits('+966 50 123 4567')).toBe('966501234567')
    expect(waDigits('0501234567')).toBe('966501234567')
    expect(waDigits('00966501234567')).toBe('966501234567')
    expect(waDigits('٠٥٠١٢٣٤٥٦٧')).toBe('966501234567')
    expect(waDigits('')).toBeNull()
    expect(waDigits('123')).toBeNull()
  })

  it('tel links keep + and digits', () => {
    expect(telHref('+966 11 234-5678')).toBe('tel:+966112345678')
    expect(telHref(null)).toBeNull()
  })

  it('orders hours from Saturday and maps day indexes', () => {
    const days = saturdayFirst([{ dayOfWeek: 'Monday' }, { dayOfWeek: 'Saturday' }, { dayOfWeek: 'Friday' }, { dayOfWeek: 'Sunday' }] as const)
    expect(days.map((d) => d.dayOfWeek)).toEqual(['Saturday', 'Sunday', 'Monday', 'Friday'])
    expect(dayOfWeekFromIndex(0)).toBe('Sunday')
    expect(dayOfWeekFromIndex(6)).toBe('Saturday')
  })
})

describe('one-time code', () => {
  it('counts down to the resend time', () => {
    const now = Date.parse('2026-11-07T10:00:00Z')
    expect(secondsUntil('2026-11-07T10:00:45Z', now)).toBe(45)
    expect(secondsUntil('2026-11-07T10:00:45', now)).toBe(45)
    expect(secondsUntil('2026-11-07T09:59:00Z', now)).toBe(0)
    expect(secondsUntil(null, now)).toBe(0)
    expect(formatCountdown(65)).toBe('1:05')
    expect(formatCountdown(0)).toBe('0:00')
  })

  it('classifies errors', () => {
    expect(pageFailure({ status: 404, errorCode: 'TrackingNotFound' })).toBe('notFound')
    expect(pageFailure({ status: 429, errorCode: 'TooManyRequests' })).toBe('rateLimited')
    expect(pageFailure({ status: 0, errorCode: 'NetworkError' })).toBe('other')
    expect(ownWordsError('OtpInvalid')).toBe('OtpInvalid')
    expect(ownWordsError('QuotationNotFound')).toBeNull()
    expect(needsNewCode('OtpExpired')).toBe(true)
    expect(needsNewCode('OtpInvalid')).toBe(false)
  })

  it('accepts only base64url tokens up to 64 characters', () => {
    expect(isTokenShaped('abc_DEF-123')).toBe(true)
    expect(isTokenShaped('a'.repeat(65))).toBe(false)
    expect(isTokenShaped('a/b')).toBe(false)
    expect(isTokenShaped(undefined)).toBe(false)
  })
})
