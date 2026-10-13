import { describe, expect, it } from 'vitest'
import { checkStockDelta, insufficientStockAvailable, productFieldErrors, productFormDefaults, toProductRequest, type ProductFormValues } from './product'

const valid: ProductFormValues = {
  sku: 'AC-1',
  nameAr: 'مكيف',
  nameEn: 'AC unit',
  descriptionAr: '',
  descriptionEn: '',
  price: '1999.99',
  stockQuantity: '5',
  requiresDelivery: false,
  requiresInstallation: false,
  deliveryServiceId: null,
  installationServiceId: null,
}

describe('product form', () => {
  it('accepts a valid product', () => {
    expect(productFieldErrors(valid)).toEqual({})
  })

  it('enforces the server limits', () => {
    expect(productFieldErrors({ ...valid, sku: ' ' }).sku).toBe('required')
    expect(productFieldErrors({ ...valid, sku: 'x'.repeat(61) }).sku).toBe('tooLong')
    expect(productFieldErrors({ ...valid, nameEn: 'x'.repeat(201) }).nameEn).toBe('tooLong')
    expect(productFieldErrors({ ...valid, descriptionAr: 'x'.repeat(4001) }).descriptionAr).toBe('tooLong')
    expect(productFieldErrors({ ...valid, price: '-1' }).price).toBe('ProductPriceInvalid')
    expect(productFieldErrors({ ...valid, price: '0' })).toEqual({})
    expect(productFieldErrors({ ...valid, stockQuantity: '-1' }).stockQuantity).toBe('StockQuantityInvalid')
    expect(productFieldErrors({ ...valid, stockQuantity: '1.5' }).stockQuantity).toBe('StockQuantityInvalid')
    expect(productFieldErrors({ ...valid, stockQuantity: '' }).stockQuantity).toBe('StockQuantityInvalid')
  })

  it('requires an installation service when installation is on (InstallationServiceRequired)', () => {
    expect(productFieldErrors({ ...valid, requiresInstallation: true }).installationServiceId).toBe('InstallationServiceRequired')
    expect(productFieldErrors({ ...valid, requiresInstallation: true, installationServiceId: 'svc' })).toEqual({})
  })

  it('maps to the request, dropping services whose checkbox is off', () => {
    expect(
      toProductRequest({ ...valid, descriptionAr: '  ', requiresDelivery: false, deliveryServiceId: 'd1', requiresInstallation: true, installationServiceId: 'i1' }),
    ).toEqual({
      sku: 'AC-1',
      nameAr: 'مكيف',
      nameEn: 'AC unit',
      descriptionAr: null,
      descriptionEn: null,
      price: 1999.99,
      requiresDelivery: false,
      requiresInstallation: true,
      deliveryServiceId: null,
      installationServiceId: 'i1',
    })
  })

  it('defaults a new product to empty fields and a valid stock placeholder for edit', () => {
    expect(productFormDefaults(null).price).toBe('')
    expect(productFormDefaults(null).stockQuantity).toBe('0')
  })
})

describe('stock movement', () => {
  it('needs a non-zero whole number that keeps stock at zero or more', () => {
    expect(checkStockDelta('', 4)).toEqual({ ok: false, reason: 'empty', next: 4 })
    expect(checkStockDelta('0', 4)).toEqual({ ok: false, reason: 'invalid', next: 4 })
    expect(checkStockDelta('1.5', 4)).toEqual({ ok: false, reason: 'invalid', next: 4 })
    expect(checkStockDelta('-5', 4)).toEqual({ ok: false, reason: 'negative', next: -1 })
    expect(checkStockDelta('-4', 4)).toEqual({ ok: true, delta: -4, next: 0 })
    expect(checkStockDelta(' +10 ', 4)).toEqual({ ok: true, delta: 10, next: 14 })
  })

  it('reads `available` from InsufficientStock data', () => {
    expect(insufficientStockAvailable({ productId: 'p', available: 3 })).toBe(3)
    expect(insufficientStockAvailable(undefined)).toBeNull()
    expect(insufficientStockAvailable({ available: 'x' })).toBeNull()
  })
})
