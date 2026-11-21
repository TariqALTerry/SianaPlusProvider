import { describe, expect, it } from 'vitest'
import { deviceLine } from './device'

describe('deviceLine', () => {
  it('skips the brand and model the name already says (case and spacing ignored)', () => {
    expect(deviceLine('Samsung Galaxy A54', 'Samsung', 'Galaxy A54')).toBe('Samsung Galaxy A54')
    expect(deviceLine('samsung  galaxy a54', 'SAMSUNG', 'GalaxyA54')).toBe('samsung  galaxy a54')
  })

  it('keeps what the name lacks', () => {
    expect(deviceLine('جوال', 'Apple', 'iPhone 13')).toBe('جوال · Apple · iPhone 13')
    expect(deviceLine('iPhone 13', 'Apple', 'iPhone 13', ' ')).toBe('iPhone 13 Apple')
    expect(deviceLine(null, 'Apple', 'apple')).toBe('Apple')
    expect(deviceLine('', null, undefined)).toBe('')
  })
})
