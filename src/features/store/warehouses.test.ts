import { describe, expect, it } from 'vitest'
import type { StoreWarehouseResponse } from '@/api/types'
import {
  EMPTY_WAREHOUSE,
  googleMapsUrl,
  parseCoordinates,
  validateWarehouse,
  WAREHOUSE_LIMITS,
  warehouseChoices,
  warehouseDraft,
  warehouseFieldForError,
  warehousePlace,
  warehouseRequest,
} from './warehouses'

const warehouse = (id: string, extra: Partial<StoreWarehouseResponse> = {}): StoreWarehouseResponse => ({
  id,
  providerOrganizationId: 'org',
  providerName: 'منشأة',
  name: `مستودع ${id}`,
  city: 'الرياض',
  district: null,
  addressLine: null,
  latitude: 24.7136,
  longitude: 46.6753,
  contactName: null,
  contactPhone: null,
  notes: null,
  isActive: true,
  productCount: 0,
  createdAt: '2026-11-12T08:00:00Z',
  updatedAt: null,
  ...extra,
})

describe('warehouse form', () => {
  it('requires a name, a city and the location', () => {
    expect(validateWarehouse(EMPTY_WAREHOUSE)).toEqual({ name: 'required', city: 'required', location: 'locationRequired' })
    expect(validateWarehouse({ ...EMPTY_WAREHOUSE, name: ' أ ', city: 'جدة', latitude: 21.5, longitude: null })).toEqual({ location: 'locationRequired' })
    expect(validateWarehouse({ ...EMPTY_WAREHOUSE, name: 'أ', city: 'جدة', latitude: 21.5, longitude: 39.2 })).toEqual({})
  })

  it('keeps the server’s lengths and coordinate ranges', () => {
    const long = (n: number) => 'x'.repeat(n + 1)
    const errors = validateWarehouse({
      ...EMPTY_WAREHOUSE,
      name: long(WAREHOUSE_LIMITS.name),
      city: long(WAREHOUSE_LIMITS.city),
      district: long(WAREHOUSE_LIMITS.district),
      addressLine: long(WAREHOUSE_LIMITS.addressLine),
      contactName: long(WAREHOUSE_LIMITS.contactName),
      contactPhone: long(WAREHOUSE_LIMITS.contactPhone),
      notes: long(WAREHOUSE_LIMITS.notes),
      latitude: 91,
      longitude: 46,
    })
    expect(errors).toEqual({
      name: 'tooLong',
      city: 'tooLong',
      district: 'tooLong',
      addressLine: 'tooLong',
      contactName: 'tooLong',
      contactPhone: 'tooLong',
      notes: 'tooLong',
      location: 'locationRange',
    })
  })

  it('sends trimmed text, nulls for blanks and rounded coordinates', () => {
    const body = warehouseRequest({
      ...EMPTY_WAREHOUSE,
      name: '  مستودع الشمال ',
      city: ' الرياض ',
      district: '  ',
      latitude: 24.71361234567,
      longitude: 46.67531234567,
      contactPhone: ' 0501234567 ',
      isActive: false,
    })
    expect(body).toEqual({
      name: 'مستودع الشمال',
      city: 'الرياض',
      district: null,
      addressLine: null,
      latitude: 24.713612,
      longitude: 46.675312,
      contactName: null,
      contactPhone: '0501234567',
      notes: null,
      isActive: false,
    })
  })

  it('round-trips a saved warehouse', () => {
    const w = warehouse('a', { district: 'العليا', notes: 'البوابة الخلفية', isActive: false })
    const draft = warehouseDraft(w)
    expect(draft).toMatchObject({ name: w.name, district: 'العليا', addressLine: '', notes: 'البوابة الخلفية', isActive: false, latitude: 24.7136 })
    expect(warehouseRequest(draft)).toMatchObject({ district: 'العليا', addressLine: null, isActive: false })
  })

  it('places server validation codes on their fields', () => {
    expect(warehouseFieldForError('WarehouseNameRequired')).toBe('name')
    expect(warehouseFieldForError('CityTooLong')).toBe('city')
    expect(warehouseFieldForError('LocationRequired')).toBe('location')
    expect(warehouseFieldForError('LongitudeOutOfRange')).toBe('location')
    expect(warehouseFieldForError('PhoneTooLong')).toBe('contactPhone')
    expect(warehouseFieldForError('StoreWarehouseNotFound')).toBeNull()
    expect(warehouseFieldForError(null)).toBeNull()
  })
})

describe('coordinates', () => {
  it('reads what Google Maps copies, with Arabic digits too', () => {
    expect(parseCoordinates('24.7136, 46.6753')).toEqual({ lat: 24.7136, lng: 46.6753 })
    expect(parseCoordinates(' 21.5 39.2 ')).toEqual({ lat: 21.5, lng: 39.2 })
    expect(parseCoordinates('-33.9,18.4')).toEqual({ lat: -33.9, lng: 18.4 })
    expect(parseCoordinates('٢٤٫٧١، ٤٦٫٦٧')).toEqual({ lat: 24.71, lng: 46.67 })
  })

  it('refuses anything else', () => {
    expect(parseCoordinates('')).toBeNull()
    expect(parseCoordinates('24.7')).toBeNull()
    expect(parseCoordinates('الرياض')).toBeNull()
    expect(parseCoordinates('95, 46')).toBeNull()
    expect(parseCoordinates('24, 190')).toBeNull()
  })

  it('links to Google Maps and names the place', () => {
    expect(googleMapsUrl(24.71361234567, 46.6753)).toBe('https://www.google.com/maps/search/?api=1&query=24.713612,46.6753')
    expect(warehousePlace({ city: 'الرياض', district: 'العليا' })).toBe('الرياض · العليا')
    expect(warehousePlace({ city: 'الرياض', district: null })).toBe('الرياض')
  })
})

describe('the product form’s warehouse choices', () => {
  const list = [warehouse('a'), warehouse('b', { isActive: false }), warehouse('c')]

  it('offers the active warehouses only', () => {
    expect(warehouseChoices(list, null).map((c) => c.id)).toEqual(['a', 'c'])
    expect(warehouseChoices(list, { warehouseId: null, warehouseName: null }).map((c) => c.id)).toEqual(['a', 'c'])
  })

  it('keeps the product’s current warehouse even after it was stopped', () => {
    expect(warehouseChoices(list, { warehouseId: 'b', warehouseName: 'مستودع b' })).toEqual([
      { id: 'a', name: 'مستودع a', isActive: true },
      { id: 'b', name: 'مستودع b', isActive: false },
      { id: 'c', name: 'مستودع c', isActive: true },
    ])
  })

  it('still shows the current warehouse by its name before the list arrives', () => {
    expect(warehouseChoices(undefined, { warehouseId: 'z', warehouseName: 'مستودع جدة' })).toEqual([{ id: 'z', name: 'مستودع جدة', isActive: true }])
  })
})
