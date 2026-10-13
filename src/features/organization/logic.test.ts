import { describe, expect, it } from 'vitest'
import type { CoverageAreaResponse, PublicCapabilityResponse } from '@/api/types'
import {
  buildCoverageRequest,
  canDeleteDocument,
  capabilityChanges,
  expiryState,
  groupCapabilities,
  isLastActiveArea,
  parseTab,
} from './logic'

const cap = (id: string, categoryCodes: string[], servicesCount = 1): PublicCapabilityResponse => ({
  id,
  code: id,
  nameAr: id,
  nameEn: id,
  categoryCodes,
  servicesCount,
})

describe('tabs', () => {
  it('falls back to the profile tab', () => {
    expect(parseTab('coverage')).toBe('coverage')
    expect(parseTab('model')).toBe('model')
    expect(parseTab('nope')).toBe('profile')
    expect(parseTab(null)).toBe('profile')
  })
})

describe('capability grouping', () => {
  it('groups by main category, repeating multi-category capabilities', () => {
    const groups = groupCapabilities([cap('ac', ['appliances']), cap('plumb', ['home', 'cleaning', 'home']), cap('misc', []), cap('odd', ['unknown'])])
    expect(groups.appliances.map((c) => c.id)).toEqual(['ac'])
    expect(groups.home.map((c) => c.id)).toEqual(['plumb'])
    expect(groups.cleaning.map((c) => c.id)).toEqual(['plumb'])
    expect(groups.general.map((c) => c.id)).toEqual(['misc', 'odd'])
  })

  it('diffs a full-replace save', () => {
    expect(capabilityChanges(['a', 'b'], ['b', 'c'])).toEqual({ added: ['c'], removed: ['a'] })
    expect(capabilityChanges([], [])).toEqual({ added: [], removed: [] })
  })
})

describe('documents', () => {
  const now = Date.parse('2026-10-05T09:00:00Z')

  it('warns within 30 days and flags expired dates', () => {
    expect(expiryState('2026-10-20T00:00:00Z', now)).toEqual({ kind: 'soon', days: 15 })
    expect(expiryState('2026-10-01T00:00:00Z', now)).toEqual({ kind: 'expired' })
    expect(expiryState('2027-01-01T00:00:00Z', now)).toBeNull()
    expect(expiryState(null, now)).toBeNull()
  })

  it('allows deleting only Pending or Rejected', () => {
    expect(canDeleteDocument('Pending')).toBe(true)
    expect(canDeleteDocument('Rejected')).toBe(true)
    expect(canDeleteDocument('Approved')).toBe(false)
    expect(canDeleteDocument('Expired')).toBe(false)
  })
})

describe('coverage request', () => {
  const labels = { name: '  ', city: ' الرياض ', district: 'النسيم' }
  const ring = [
    { latitude: 24.7445, longitude: 46.8105 },
    { latitude: 24.7445, longitude: 46.8525 },
    { latitude: 24.7155, longitude: 46.8525 },
  ]

  it('sends a polygon only for a real ring', () => {
    const body = buildCoverageRequest('Polygon', labels, { kind: 'Polygon', points: ring })
    expect(body).toEqual({ name: null, city: 'الرياض', district: 'النسيم', polygon: ring })
  })

  it('never sends an empty polygon', () => {
    const body = buildCoverageRequest('Polygon', labels, { kind: 'Polygon', points: [] })
    expect(body).not.toHaveProperty('polygon')
    const city = buildCoverageRequest('CityDistrict', labels, null)
    expect(city).toEqual({ name: null, city: 'الرياض', district: 'النسيم' })
    expect(city).not.toHaveProperty('polygon')
  })

  it('sends centre + clamped radius for a circle, with no polygon', () => {
    const body = buildCoverageRequest('Circle', labels, { kind: 'Circle', latitude: 24.7, longitude: 46.7, radiusKm: 3.456 })
    expect(body).toEqual({ name: null, city: 'الرياض', district: 'النسيم', latitude: 24.7, longitude: 46.7, radiusKm: 3.46 })
  })

  it('keeps a city/district pin without a radius', () => {
    const body = buildCoverageRequest('CityDistrict', { name: 'x', city: 'جدة', district: '' }, null, { latitude: 21.5, longitude: 39.2 })
    expect(body).toEqual({ name: 'x', city: 'جدة', district: null, latitude: 21.5, longitude: 39.2 })
  })

  it('detects the last active area', () => {
    const area = (id: string, isActive: boolean) => ({ id, isActive }) as CoverageAreaResponse
    expect(isLastActiveArea([area('a', true), area('b', false)], 'a')).toBe(true)
    expect(isLastActiveArea([area('a', true), area('b', true)], 'a')).toBe(false)
    expect(isLastActiveArea([area('a', false)], 'a')).toBe(false)
  })
})
