import { describe, expect, it } from 'vitest'
import { formatSaudiMobile, isSaudiMobile, localMobileDigits, toSaudiE164 } from './phone'

describe('Saudi mobile input', () => {
  it.each([
    ['0501234567', '501234567'],
    ['501234567', '501234567'],
    ['+966501234567', '501234567'],
    ['966 50 123 4567', '501234567'],
    ['00966501234567', '501234567'],
    ['٠٥٠١٢٣٤٥٦٧', '501234567'],
  ])('%s → %s', (input, digits) => {
    expect(localMobileDigits(input)).toBe(digits)
  })

  it('keeps digits when the international number is typed key by key', () => {
    let value = ''
    for (const ch of '+966 55 111 0002') value = localMobileDigits(value + ch)
    expect(value).toBe('551110002')
    value = ''
    for (const ch of '0551110002') value = localMobileDigits(value + ch)
    expect(value).toBe('551110002')
  })

  it('validates and formats', () => {
    expect(isSaudiMobile('501234567')).toBe(true)
    expect(isSaudiMobile('401234567')).toBe(false)
    expect(isSaudiMobile('50123456')).toBe(false)
    expect(toSaudiE164('501234567')).toBe('+966501234567')
    expect(formatSaudiMobile('+966501234567')).toBe('+966 50 123 4567')
  })
})
