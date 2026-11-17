import { describe, expect, it } from 'vitest'
import { i18next } from '@/i18n'
import { countAr, formatCount, relativeAr } from './arabicCount'
import { formatRelative } from './format'

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

describe('countAr', () => {
  it('agrees the noun with the number', () => {
    expect(countAr(1, 'minute')).toBe('دقيقة')
    expect(countAr(2, 'minute')).toBe('دقيقتين')
    expect(countAr(3, 'minute')).toBe('3 دقائق')
    expect(countAr(10, 'minute')).toBe('10 دقائق')
    expect(countAr(11, 'minute')).toBe('11 دقيقة')
    expect(countAr(22, 'minute')).toBe('22 دقيقة')
    expect(countAr(2, 'hour')).toBe('ساعتين')
    expect(countAr(5, 'hour')).toBe('5 ساعات')
    expect(countAr(7, 'day')).toBe('7 أيام')
    expect(countAr(12, 'day')).toBe('12 يومًا')
    expect(countAr(25, 'day')).toBe('25 يومًا')
    expect(countAr(100, 'day')).toBe('100 يوم')
    expect(countAr(103, 'day')).toBe('103 أيام')
    expect(countAr(115, 'day')).toBe('115 يومًا')
    expect(countAr(12, 'month')).toBe('12 شهرًا')
    expect(countAr(4, 'month')).toBe('4 أشهر')
    expect(countAr(0, 'day')).toBe('0 يوم')
    expect(countAr(1.5, 'hour')).toBe('1.5 ساعة')
  })

  it('has a nominative dual for a subject', () => {
    expect(countAr(2, 'day', { case: 'nominative' })).toBe('يومان')
    expect(countAr(2, 'month', { case: 'nominative' })).toBe('شهران')
    expect(countAr(12, 'day', { case: 'nominative' })).toBe('12 يومًا')
  })
})

describe('formatCount', () => {
  it('reads numbers and numeric strings, and speaks English too', () => {
    expect(formatCount('12', 'day', 'ar')).toBe('12 يومًا')
    expect(formatCount('1,200', 'day', 'ar')).toBe('1,200 يوم')
    expect(formatCount(1, 'day', 'en')).toBe('1 day')
    expect(formatCount(7, 'day', 'en')).toBe('7 days')
    expect(formatCount('—', 'day', 'ar')).toBe('—')
    expect(formatCount(null, 'day', 'ar')).toBe('—')
  })
})

describe('relativeAr', () => {
  it('says how long ago with proper agreement', () => {
    expect(relativeAr(10_000)).toBe('منذ لحظات')
    expect(relativeAr(MIN)).toBe('منذ دقيقة')
    expect(relativeAr(2 * MIN)).toBe('منذ دقيقتين')
    expect(relativeAr(5 * MIN)).toBe('منذ 5 دقائق')
    expect(relativeAr(22 * MIN)).toBe('منذ 22 دقيقة')
    expect(relativeAr(HOUR)).toBe('منذ ساعة')
    expect(relativeAr(2 * HOUR)).toBe('منذ ساعتين')
    expect(relativeAr(12 * HOUR)).toBe('منذ 12 ساعة')
    expect(relativeAr(DAY)).toBe('منذ يوم')
    expect(relativeAr(7 * DAY)).toBe('منذ 7 أيام')
    expect(relativeAr(12 * DAY)).toBe('منذ 12 يومًا')
    expect(relativeAr(25 * DAY)).toBe('منذ 25 يومًا')
    expect(relativeAr(60 * DAY)).toBe('منذ شهرين')
    expect(relativeAr(400 * DAY)).toBe('منذ سنة')
  })

  it('says "in" for the future', () => {
    expect(relativeAr(-3 * DAY)).toBe('بعد 3 أيام')
  })
})

describe('formatRelative', () => {
  it('use the Arabic agreement', () => {
    const now = '2026-11-16T12:00:00Z'
    expect(formatRelative('2026-11-16T11:58:00Z', 'ar', now)).toBe('منذ دقيقتين')
    expect(formatRelative('2026-11-04T12:00:00Z', 'ar', now)).toBe('منذ 12 يومًا')
  })
})

describe('i18next count formatters', () => {
  it('format {{count, days}} in a translation', () => {
    const ar = i18next.getFixedT('ar')
    expect(ar('x', { defaultValue: 'ينتهي خلال {{count, days}}', count: 7 })).toBe('ينتهي خلال 7 أيام')
    expect(ar('x', { defaultValue: 'ينتهي خلال {{count, days}}', count: 2 })).toBe('ينتهي خلال يومين')
    expect(ar('x', { defaultValue: 'بقي {{count, days(case: nominative)}}', count: 2 })).toBe('بقي يومان')
    expect(ar('x', { defaultValue: '{{n, minutes}}', n: 22 })).toBe('22 دقيقة')
  })
})

describe('counted nouns (tester B41: "9 دفعة")', () => {
  it('agrees payments with the number', () => {
    expect(countAr(1, 'payment')).toBe('دفعة واحدة')
    expect(countAr(2, 'payment')).toBe('دفعتين')
    expect(countAr(2, 'payment', { case: 'nominative' })).toBe('دفعتان')
    expect(countAr(9, 'payment')).toBe('9 دفعات')
    expect(countAr(10, 'payment')).toBe('10 دفعات')
    expect(countAr(16, 'payment')).toBe('16 دفعة')
    expect(countAr(100, 'payment')).toBe('100 دفعة')
    expect(countAr(0, 'payment')).toBe('0 دفعة')
  })

  it('handles masculine nouns with the accusative tanween and broken plurals', () => {
    expect(countAr(1, 'order')).toBe('طلب واحد')
    expect(countAr(5, 'order')).toBe('5 طلبات')
    expect(countAr(12, 'order')).toBe('12 طلبًا')
    expect(countAr(3, 'technician')).toBe('3 فنيين')
    expect(countAr(15, 'technician')).toBe('15 فنيًا')
    expect(countAr(4, 'offer')).toBe('4 عروض')
    expect(countAr(7, 'message')).toBe('7 رسائل')
    expect(countAr(3, 'claim')).toBe('3 مطالبات')
    expect(countAr(6, 'notification')).toBe('6 إشعارات')
    expect(countAr(11, 'notification')).toBe('11 إشعارًا')
    expect(countAr(5, 'service')).toBe('5 خدمات')
    expect(countAr(5, 'rating')).toBe('5 تقييمات')
    expect(countAr(5, 'product')).toBe('5 منتجات')
    expect(countAr(2, 'device', { case: 'nominative' })).toBe('جهازان')
  })

  it('takes any noun as forms', () => {
    const forms = { one: 'كوب واحد', two: 'كوبين', twoNom: 'كوبان', few: 'أكواب', many: 'كوبًا', other: 'كوب' }
    expect(countAr(1, forms)).toBe('كوب واحد')
    expect(countAr(4, forms)).toBe('4 أكواب')
    expect(countAr(40, forms)).toBe('40 كوبًا')
  })

  it('keeps a formatted number as it came and speaks English', () => {
    expect(formatCount('1,203', 'order', 'ar')).toBe('1,203 طلبات')
    expect(formatCount(9, 'payment', 'en')).toBe('9 payments')
    expect(formatCount(1, 'payment', 'en')).toBe('1 payment')
  })

  it('works as an i18next formatter', () => {
    const ar = i18next.getFixedT('ar')
    expect(ar('x', { defaultValue: '{{count, payments(case: nominative)}}', count: 9 })).toBe('9 دفعات')
    expect(ar('x', { defaultValue: '{{count, payments(case: nominative)}}', count: 2 })).toBe('دفعتان')
    expect(ar('x', { defaultValue: 'يسري على {{count, employees}}', count: 1 })).toBe('يسري على موظف واحد')
  })
})
