import { describe, expect, it } from 'vitest'
import type { StoreProductResponse } from '@/api/types'
import {
  combinations,
  discountPercent,
  draftFromAi,
  displayPrice,
  draftFromProduct,
  emptyDraft,
  keyFromName,
  localMissingForSale,
  sectionOfError,
  swatches,
  syncVariants,
  toRequest,
  validateDraft,
  type OptionDraft,
  type ProductDraft,
} from './productForm'

const value = (uid: string, key: string, extra: Partial<OptionDraft['values'][number]> = {}) => ({
  uid,
  key,
  keyTouched: false,
  valueAr: key,
  valueEn: key,
  colorHex: '',
  ...extra,
})

const color: OptionDraft = {
  uid: 'c',
  kind: 'Color',
  nameAr: 'اللون',
  nameEn: 'Colour',
  values: [value('black', 'black', { colorHex: '#000000' }), value('silver', 'silver', { colorHex: '#C0C0C0' })],
}
const size: OptionDraft = { uid: 's', kind: 'Size', nameAr: 'المقاس', nameEn: 'Size', values: [value('m', 'm'), value('l', 'l')] }

function draftWith(patch: Partial<ProductDraft>): ProductDraft {
  return { ...emptyDraft(), sku: 'SP-1', nameAr: 'خلاط', nameEn: 'Blender', ...patch }
}

describe('keyFromName', () => {
  it('makes lowercase dashed keys', () => {
    expect(keyFromName('Black Matte')).toBe('black-matte')
    expect(keyFromName('50 L')).toBe('50-l')
    expect(keyFromName('  XL ')).toBe('xl')
    expect(keyFromName('أسود')).toBe('')
  })
})

describe('variants', () => {
  it('builds every combination in option order', () => {
    expect(combinations([color, size])).toEqual([
      { c: 'black', s: 'm' },
      { c: 'black', s: 'l' },
      { c: 'silver', s: 'm' },
      { c: 'silver', s: 'l' },
    ])
    expect(combinations([{ ...size, values: [] }])).toEqual([])
  })

  it('keeps a saved variant when an option is added, and drops removed values', () => {
    const start = syncVariants([color], [])
    start[0] = { ...start[0]!, id: 'v-black', price: '100' }
    start[1] = { ...start[1]!, id: 'v-silver', price: '120' }

    const withSize = syncVariants([color, size], start)
    expect(withSize).toHaveLength(4)
    expect(withSize[0]).toMatchObject({ id: 'v-black', combo: { c: 'black', s: 'm' }, price: '100' })
    expect(withSize[1]).toMatchObject({ id: null, combo: { c: 'black', s: 'l' }, price: '100' })
    expect(withSize[2]).toMatchObject({ id: 'v-silver', price: '120' })

    const lessColour = syncVariants([{ ...color, values: color.values.slice(0, 1) }, size], withSize)
    expect(lessColour.map((v) => v.id)).toEqual(['v-black', null])
  })

  it('collapses rows when an option is removed', () => {
    const rows = syncVariants([color, size], []).map((v, i) => ({ ...v, id: `v${i}` }))
    const back = syncVariants([color], rows)
    expect(back.map((v) => v.id)).toEqual(['v0', 'v2'])
  })
})

describe('prices and preview', () => {
  it('computes the offer percent like the app', () => {
    expect(discountPercent(75, 100)).toBe(25)
    expect(discountPercent(100, 100)).toBeNull()
    expect(discountPercent(100, null)).toBeNull()
  })

  it('shows the cheapest active priced variant with "from"', () => {
    const variants = syncVariants([color], []).map((v, i) => ({ ...v, price: i === 0 ? '90' : '80', compareAtPrice: i === 1 ? '100' : '' }))
    variants[1] = { ...variants[1]!, isActive: false }
    expect(displayPrice(draftWith({ options: [color], variants }))).toEqual({ price: 90, compareAtPrice: null, from: true })
    expect(displayPrice(draftWith({ price: '50', compareAtPrice: '60' }))).toEqual({ price: 50, compareAtPrice: 60, from: false })
  })

  it('takes the first five swatches of the first colour option', () => {
    expect(swatches({ options: [size, color] })).toEqual(['#000000', '#C0C0C0'])
  })
})

describe('readiness', () => {
  it('mirrors missingForSale', () => {
    expect(localMissingForSale(draftWith({}), 0)).toEqual(['Category', 'Image', 'Price'])
    expect(localMissingForSale(draftWith({ categoryId: 'cat', price: '10' }), 1)).toEqual([])
    const variants = syncVariants([color], [])
    expect(localMissingForSale(draftWith({ categoryId: 'cat', options: [color], variants }), 1)).toEqual(['Variants'])
  })
})

describe('validation', () => {
  it('requires the basics and a positive price per variant', () => {
    const e = validateDraft({ ...emptyDraft(), options: [color], variants: syncVariants([color], []) }, { isCreate: true, imageCount: 0 })
    expect(e).toMatchObject({ sku: 'required', nameAr: 'required', nameEn: 'required', 'variants.0.price': 'variantPrice' })
  })

  it('rejects a compare-at price not above the price, and bad keys', () => {
    const e = validateDraft(draftWith({ price: '100', compareAtPrice: '90' }), { isCreate: true, imageCount: 0 })
    expect(e.compareAtPrice).toBe('compareAbovePrice')
    expect(validateDraft(draftWith({ price: '100', compareAtPrice: '0' }), { isCreate: true, imageCount: 0 }).compareAtPrice).toBeUndefined()

    const bad: OptionDraft = { ...size, values: [value('a', 'Big!'), value('b', 'b'), value('c', 'b')] }
    const e2 = validateDraft(draftWith({ options: [bad], variants: [] }), { isCreate: false, imageCount: 0 })
    expect(e2['values.a.key']).toBe('keyInvalid')
    expect(e2['values.c.key']).toBe('keyDuplicate')
  })

  it('wants at least two values per option', () => {
    const one: OptionDraft = { ...size, values: [value('m', 'm')] }
    expect(validateDraft(draftWith({ options: [one] }), { isCreate: false, imageCount: 0 })['options.s.values']).toBe('tooFewValues')
  })
})

describe('toRequest', () => {
  it('sends every smart-store field, clears with "" and [], and 0 = no offer', () => {
    const body = toRequest(draftWith({ price: '100', stockQuantity: '7' }), ['img1', 'img2'])
    expect(body).toMatchObject({
      price: 100,
      compareAtPrice: 0,
      brand: '',
      keywords: '',
      highlightsAr: [],
      specs: [],
      options: [],
      variants: [],
      imageIds: ['img1', 'img2'],
      stockQuantity: 7,
      fromAiDraft: false,
      descriptionAr: null,
    })
  })

  it('sends options and variants together with keys in option order', () => {
    const variants = syncVariants([color, size], []).map((v) => ({ ...v, price: '50', compareAtPrice: '0', imageId: 'gone' }))
    const body = toRequest(draftWith({ options: [color, size], variants }), ['img1'])
    expect(body.options?.map((o) => o.values.map((v) => v.key))).toEqual([
      ['black', 'silver'],
      ['m', 'l'],
    ])
    expect(body.options?.[0]?.values[0]?.colorHex).toBe('#000000')
    expect(body.options?.[1]?.values[0]?.colorHex).toBeNull()
    expect(body.variants?.[1]).toMatchObject({ id: null, sku: null, optionValues: ['black', 'l'], price: 50, compareAtPrice: null, imageId: null })
    expect(body.compareAtPrice).toBeNull()
    expect(body.price).toBe(50)
  })

  it('round-trips a saved product', () => {
    const product = {
      id: 'p1',
      sku: 'SP-9',
      nameAr: 'سخان',
      nameEn: 'Heater',
      descriptionAr: null,
      descriptionEn: null,
      price: 80,
      compareAtPrice: 100,
      stockQuantity: 4,
      imageUrl: null,
      providerOrganizationId: null,
      providerName: null,
      requiresDelivery: true,
      requiresInstallation: false,
      installationServiceId: null,
      deliveryServiceId: null,
      isActive: false,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: null,
      categoryId: 'cat',
      categoryNameAr: null,
      categoryNameEn: null,
      sectionId: null,
      sectionNameAr: null,
      sectionNameEn: null,
      brand: 'Ariston',
      highlightsAr: ['سريع'],
      highlightsEn: ['Fast'],
      specs: [],
      keywords: null,
      images: [],
      options: [{ kind: 'Size', nameAr: 'السعة', nameEn: 'Capacity', values: [{ key: '50-l', valueAr: '50 لتر', valueEn: '50 L', colorHex: null }, { key: '80-l', valueAr: '80 لتر', valueEn: '80 L', colorHex: null }] }],
      variants: [
        { id: 'v1', sku: 'SP-9-1', optionValues: ['50-l'], labelAr: '', labelEn: '', price: 80, compareAtPrice: 100, stockQuantity: 3, imageId: null, imageUrl: null, isActive: true },
        { id: 'v2', sku: 'SP-9-2', optionValues: ['80-l'], labelAr: '', labelEn: '', price: 95, compareAtPrice: null, stockQuantity: 1, imageId: null, imageUrl: null, isActive: true },
      ],
      hasVariants: true,
      soldCount: 0,
      isAiGenerated: false,
      missingForSale: ['Image'],
    } satisfies StoreProductResponse
    const draft = draftFromProduct(product)
    expect(draft.variants.map((v) => v.id)).toEqual(['v1', 'v2'])
    const body = toRequest(draft, [])
    expect(body.variants?.map((v) => [v.id, v.optionValues[0], v.price, v.compareAtPrice, v.stockQuantity])).toEqual([
      ['v1', '50-l', 80, 100, 0],
      ['v2', '80-l', 95, null, 0],
    ])
  })
})

describe('sectionOfError', () => {
  it('routes server errors to their section', () => {
    expect(sectionOfError('StoreCategoryNotLeaf', false)).toBe('category')
    expect(sectionOfError('ProductPriceInvalid', true)).toBe('variants')
    expect(sectionOfError('ProductPriceInvalid', false)).toBe('pricing')
    expect(sectionOfError('ProductNotReadyForSale', false)).toBe('readiness')
    expect(sectionOfError('Whatever', false)).toBeNull()
  })
})

describe('draftFromAi', () => {
  it('leaves prices blank for staff, keeps the variants and marks the draft', () => {
    const draft = draftFromAi({
      product: {
        sku: 'SP-123456',
        nameAr: 'خلاط',
        nameEn: 'Mixer',
        price: 0,
        requiresDelivery: true,
        requiresInstallation: false,
        stockQuantity: 0,
        fromAiDraft: true,
        imageIds: ['a', 'b'],
        options: [{ kind: 'Color', nameAr: 'اللون', nameEn: 'Colour', values: [{ key: 'silver', valueAr: 'فضي', valueEn: 'Silver', colorHex: '#C0C0C0' }, { key: 'black', valueAr: 'أسود', valueEn: 'Black', colorHex: null }] }],
        variants: [
          { optionValues: ['silver'], price: 0, stockQuantity: 0, isActive: true },
          { optionValues: ['black'], price: 0, stockQuantity: 0, isActive: true },
        ],
      },
      categoryNameAr: null,
      categoryNameEn: null,
      notes: ['حدّد السعر'],
    })
    expect(draft.fromAiDraft).toBe(true)
    expect(draft.price).toBe('')
    expect(draft.variants.map((v) => [v.id, v.price])).toEqual([
      [null, ''],
      [null, ''],
    ])
    expect(draft.options[0]!.values[1]!.colorHex).toBe('#000000')
    expect(toRequest(draft, ['a', 'b'])).toMatchObject({ fromAiDraft: true, imageIds: ['a', 'b'], variants: [{ optionValues: ['silver'] }, { optionValues: ['black'] }] })
  })
})
