import type { StoreProductResponse, StoreWarehouseRequest, StoreWarehouseResponse } from '@/api/types'

/**
 * Store warehouses (2026-11-12): where the organization's products are kept and the courier picks them up. A product
 * without a warehouse is picked up at the organization's main branch. Kept free of React so it can be tested.
 */

/** `StoreWarehouseRequestValidator`'s lengths. */
export const WAREHOUSE_LIMITS = { name: 150, city: 100, district: 100, addressLine: 300, contactName: 150, contactPhone: 20, notes: 500 } as const

export interface WarehouseDraft {
  name: string
  city: string
  district: string
  addressLine: string
  latitude: number | null
  longitude: number | null
  contactName: string
  contactPhone: string
  notes: string
  isActive: boolean
}

export const EMPTY_WAREHOUSE: WarehouseDraft = {
  name: '',
  city: '',
  district: '',
  addressLine: '',
  latitude: null,
  longitude: null,
  contactName: '',
  contactPhone: '',
  notes: '',
  isActive: true,
}

export function warehouseDraft(w: StoreWarehouseResponse): WarehouseDraft {
  return {
    name: w.name,
    city: w.city,
    district: w.district ?? '',
    addressLine: w.addressLine ?? '',
    latitude: w.latitude,
    longitude: w.longitude,
    contactName: w.contactName ?? '',
    contactPhone: w.contactPhone ?? '',
    notes: w.notes ?? '',
    isActive: w.isActive,
  }
}

const text = (v: string) => (v.trim() ? v.trim() : null)
const round6 = (v: number) => Math.round(v * 1e6) / 1e6

/** The full body of a create or an edit (PUT replaces every field). */
export function warehouseRequest(d: WarehouseDraft): StoreWarehouseRequest {
  return {
    name: d.name.trim(),
    city: d.city.trim(),
    district: text(d.district),
    addressLine: text(d.addressLine),
    latitude: d.latitude === null ? null : round6(d.latitude),
    longitude: d.longitude === null ? null : round6(d.longitude),
    contactName: text(d.contactName),
    contactPhone: text(d.contactPhone),
    notes: text(d.notes),
    isActive: d.isActive,
  }
}

export type WarehouseField = keyof WarehouseDraft | 'location'
export type WarehouseFieldError = 'required' | 'tooLong' | 'locationRequired' | 'locationRange'
export type WarehouseErrors = Partial<Record<WarehouseField, WarehouseFieldError>>

/** The server's checks, so mistakes show next to the field before saving. The location is required (`LocationRequired`). */
export function validateWarehouse(d: WarehouseDraft): WarehouseErrors {
  const errors: WarehouseErrors = {}
  for (const k of ['name', 'city'] as const) {
    if (!d[k].trim()) errors[k] = 'required'
    else if (d[k].trim().length > WAREHOUSE_LIMITS[k]) errors[k] = 'tooLong'
  }
  for (const k of ['district', 'addressLine', 'contactName', 'contactPhone', 'notes'] as const) {
    if (d[k].trim().length > WAREHOUSE_LIMITS[k]) errors[k] = 'tooLong'
  }
  if (d.latitude === null || d.longitude === null) errors.location = 'locationRequired'
  else if (Math.abs(d.latitude) > 90 || Math.abs(d.longitude) > 180) errors.location = 'locationRange'
  return errors
}

/** Server validation codes (the first failed rule is the `errorCode`) that belong to one field of the form. */
export function warehouseFieldForError(code: string | null | undefined): WarehouseField | null {
  switch (code) {
    case 'WarehouseNameRequired':
    case 'WarehouseNameTooLong':
      return 'name'
    case 'CityRequired':
    case 'CityTooLong':
      return 'city'
    case 'DistrictTooLong':
      return 'district'
    case 'WarehouseAddressTooLong':
      return 'addressLine'
    case 'LocationRequired':
    case 'LatitudeOutOfRange':
    case 'LongitudeOutOfRange':
      return 'location'
    case 'WarehouseContactTooLong':
      return 'contactName'
    case 'PhoneTooLong':
      return 'contactPhone'
    case 'NotesTooLong':
      return 'notes'
    default:
      return null
  }
}

/**
 * Coordinates pasted as text, the way Google Maps copies them: `24.7136, 46.6753` (also a space, or Arabic digits and
 * comma). Null when it isn't a valid latitude/longitude pair.
 */
export function parseCoordinates(raw: string): { lat: number; lng: number } | null {
  const western = raw.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace(/٫/g, '.').replace(/،/g, ',')
  const match = western.trim().match(/^(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)$/)
  if (!match) return null
  const lat = Number(match[1])
  const lng = Number(match[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

/** "Open in Google Maps" for a point. */
export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${round6(lat)},${round6(lng)}`
}

/** "الرياض · العليا" */
export function warehousePlace(w: Pick<StoreWarehouseResponse, 'city' | 'district'>): string {
  return [w.city, w.district].filter((x) => !!x && x.trim()).join(' · ')
}

export interface WarehouseChoice {
  id: string
  name: string
  isActive: boolean
}

/**
 * The product form's warehouse options: the organization's active warehouses, plus the product's current one even when
 * it was stopped since (the server keeps it usable for that product). A current warehouse missing from the list (the list
 * failed or hasn't loaded) still shows by the name the product carries.
 */
export function warehouseChoices(
  warehouses: StoreWarehouseResponse[] | undefined,
  product: Pick<StoreProductResponse, 'warehouseId' | 'warehouseName'> | null,
): WarehouseChoice[] {
  const currentId = product?.warehouseId ?? null
  const choices: WarehouseChoice[] = (warehouses ?? [])
    .filter((w) => w.isActive || w.id === currentId)
    .map((w) => ({ id: w.id, name: w.name, isActive: w.isActive }))
  if (currentId && !choices.some((c) => c.id === currentId)) {
    choices.push({ id: currentId, name: product?.warehouseName ?? currentId, isActive: true })
  }
  return choices
}
