import type {
  CreateStoreProductRequest,
  StoreOptionKind,
  StoreProductDraftResponse,
  StoreProductImageResponse,
  StoreProductOptionDto,
  StoreProductResponse,
  StoreProductSpecDto,
  StoreProductVariantRequest,
} from '@/api/types'

/**
 * The product editor's state and rules (SMART-STORE-DASHBOARD-PROMPT §3.3, §4.3), kept free of
 * React so they can be tested. Inputs hold strings; `toRequest` turns them into the API body.
 *
 * Options and values carry client ids (`uid`), and each variant points at value uids, so renaming
 * a value (and with it the generated key) or adding an option keeps the saved variants.
 */

export const LIMITS = {
  sku: 60,
  name: 200,
  brand: 100,
  description: 4000,
  keywords: 500,
  highlights: 6,
  highlight: 150,
  specs: 20,
  specLabel: 60,
  specValue: 200,
  galleryImages: 8,
  aiImages: 5,
  hint: 500,
  options: 3,
  optionValuesMin: 2,
  optionValuesMax: 20,
  variants: 100,
} as const

export const OPTION_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/
export const COLOR_HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/
export const DEFAULT_COLOR = '#000000'

/** `missingForSale` values, in checklist order. */
export const READINESS_ITEMS = ['Category', 'Image', 'Price', 'Variants'] as const
export type ReadinessItem = (typeof READINESS_ITEMS)[number]

export interface OptionValueDraft {
  uid: string
  key: string
  /** The key follows the English value until someone edits it (or it was saved). */
  keyTouched: boolean
  valueAr: string
  valueEn: string
  colorHex: string
}

export interface OptionDraft {
  uid: string
  kind: StoreOptionKind
  nameAr: string
  nameEn: string
  values: OptionValueDraft[]
}

export interface VariantDraft {
  /** Saved variant id; null = created by the next save. */
  id: string | null
  /** option uid → value uid. */
  combo: Record<string, string>
  sku: string
  price: string
  compareAtPrice: string
  /** Opening stock of a new variant; a saved one moves with ± only. */
  stockQuantity: string
  imageId: string | null
  isActive: boolean
}

export interface SpecDraft {
  uid: string
  labelAr: string
  labelEn: string
  valueAr: string
  valueEn: string
}

export interface ProductDraft {
  sku: string
  nameAr: string
  nameEn: string
  brand: string
  categoryId: string | null
  descriptionAr: string
  descriptionEn: string
  highlightsAr: string[]
  highlightsEn: string[]
  specs: SpecDraft[]
  keywords: string
  price: string
  compareAtPrice: string
  stockQuantity: string
  requiresDelivery: boolean
  requiresInstallation: boolean
  installationServiceId: string | null
  deliveryServiceId: string | null
  options: OptionDraft[]
  variants: VariantDraft[]
  fromAiDraft: boolean
}

let uidCounter = 0
export function uid(prefix = 'u'): string {
  uidCounter += 1
  return `${prefix}${uidCounter}`
}

/** `Black Matte` → `black-matte`; `50 L` → `50-l`. Empty when nothing usable is left. */
export function keyFromName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
}

const num = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v))

/** Parses a money/quantity input; blank or invalid = NaN. */
export function parseNumber(raw: string): number {
  const t = raw.trim()
  if (t === '') return NaN
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}

export function emptyDraft(): ProductDraft {
  return {
    sku: '',
    nameAr: '',
    nameEn: '',
    brand: '',
    categoryId: null,
    descriptionAr: '',
    descriptionEn: '',
    highlightsAr: [],
    highlightsEn: [],
    specs: [],
    keywords: '',
    price: '',
    compareAtPrice: '',
    stockQuantity: '0',
    requiresDelivery: true,
    requiresInstallation: false,
    installationServiceId: null,
    deliveryServiceId: null,
    options: [],
    variants: [],
    fromAiDraft: false,
  }
}

function optionsFrom(options: StoreProductOptionDto[], keyTouched: boolean): OptionDraft[] {
  return options.map((o) => ({
    uid: uid('o'),
    kind: o.kind,
    nameAr: o.nameAr,
    nameEn: o.nameEn,
    values: o.values.map((v) => ({
      uid: uid('v'),
      key: v.key,
      keyTouched,
      valueAr: v.valueAr,
      valueEn: v.valueEn,
      colorHex: v.colorHex ?? (o.kind === 'Color' ? DEFAULT_COLOR : ''),
    })),
  }))
}

/** option values (keys, in option order) → combo of uids; unknown keys are dropped. */
function comboFromKeys(options: OptionDraft[], keys: readonly string[]): Record<string, string> {
  const combo: Record<string, string> = {}
  options.forEach((o, i) => {
    const value = o.values.find((v) => v.key === keys[i])
    if (value) combo[o.uid] = value.uid
  })
  return combo
}

const specsFrom = (specs: StoreProductSpecDto[]): SpecDraft[] => specs.map((s) => ({ uid: uid('s'), ...s }))

/** The editor state of a saved product. */
export function draftFromProduct(p: StoreProductResponse): ProductDraft {
  const options = optionsFrom(p.options, true)
  return {
    sku: p.sku,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    brand: p.brand ?? '',
    categoryId: p.categoryId,
    descriptionAr: p.descriptionAr ?? '',
    descriptionEn: p.descriptionEn ?? '',
    highlightsAr: [...p.highlightsAr],
    highlightsEn: [...p.highlightsEn],
    specs: specsFrom(p.specs),
    keywords: p.keywords ?? '',
    price: num(p.price),
    compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : '',
    stockQuantity: String(p.stockQuantity),
    requiresDelivery: p.requiresDelivery,
    requiresInstallation: p.requiresInstallation,
    installationServiceId: p.installationServiceId,
    deliveryServiceId: p.deliveryServiceId,
    options,
    variants: p.variants.map((v) => ({
      id: v.id,
      combo: comboFromKeys(options, v.optionValues),
      sku: v.sku,
      price: num(v.price),
      compareAtPrice: v.compareAtPrice ? String(v.compareAtPrice) : '',
      stockQuantity: String(v.stockQuantity),
      imageId: v.imageId,
      isActive: v.isActive,
    })),
    fromAiDraft: false,
  }
}

/** The editor state of an AI draft: prices and stock come as 0 and are left blank for staff to fill. */
export function draftFromAi(d: StoreProductDraftResponse): ProductDraft {
  const p = d.product
  const options = optionsFrom(p.options ?? [], false)
  const blankZero = (v: number | null | undefined) => (v ? String(v) : '')
  return {
    ...emptyDraft(),
    sku: p.sku ?? '',
    nameAr: p.nameAr ?? '',
    nameEn: p.nameEn ?? '',
    brand: p.brand ?? '',
    categoryId: p.categoryId ?? null,
    descriptionAr: p.descriptionAr ?? '',
    descriptionEn: p.descriptionEn ?? '',
    highlightsAr: [...(p.highlightsAr ?? [])],
    highlightsEn: [...(p.highlightsEn ?? [])],
    specs: specsFrom(p.specs ?? []),
    keywords: p.keywords ?? '',
    price: blankZero(p.price),
    compareAtPrice: blankZero(p.compareAtPrice),
    stockQuantity: String(p.stockQuantity ?? 0),
    requiresDelivery: p.requiresDelivery ?? true,
    requiresInstallation: p.requiresInstallation ?? false,
    installationServiceId: p.installationServiceId ?? null,
    deliveryServiceId: p.deliveryServiceId ?? null,
    options,
    variants: (p.variants ?? []).map((v) => ({
      id: null,
      combo: comboFromKeys(options, v.optionValues),
      sku: v.sku ?? '',
      price: blankZero(v.price),
      compareAtPrice: blankZero(v.compareAtPrice),
      stockQuantity: String(v.stockQuantity ?? 0),
      imageId: v.imageId ?? null,
      isActive: v.isActive ?? true,
    })),
    fromAiDraft: true,
  }
}

// ── Options → variants ───────────────────────────────────────────────────────

/** Options that take part in variants: an option without values is ignored (§3.3.1). */
export function usedOptions(options: OptionDraft[]): OptionDraft[] {
  return options.filter((o) => o.values.length > 0)
}

export function hasVariants(draft: Pick<ProductDraft, 'options'>): boolean {
  return usedOptions(draft.options).length > 0
}

export function comboId(options: OptionDraft[], combo: Record<string, string>): string {
  return options.map((o) => combo[o.uid] ?? '?').join('|')
}

/** Every combination of the used options' values, in option order. */
export function combinations(options: OptionDraft[]): Record<string, string>[] {
  const used = usedOptions(options)
  if (used.length === 0) return []
  let out: Record<string, string>[] = [{}]
  for (const o of used) {
    const next: Record<string, string>[] = []
    for (const partial of out) for (const v of o.values) next.push({ ...partial, [o.uid]: v.uid })
    out = next
  }
  return out
}

/** Too many combinations to send (> 100): the table is not regenerated past this. */
export function combinationCount(options: OptionDraft[]): number {
  const used = usedOptions(options)
  return used.length === 0 ? 0 : used.reduce((n, o) => n * o.values.length, 1)
}

function newVariant(combo: Record<string, string>, from?: VariantDraft): VariantDraft {
  return {
    id: null,
    combo,
    sku: '',
    price: from?.price ?? '',
    compareAtPrice: from?.compareAtPrice ?? '',
    stockQuantity: '0',
    imageId: from?.imageId ?? null,
    isActive: true,
  }
}

/**
 * The variant table for the given options: one row per combination, in combination order.
 * A row keeps the variant that already has exactly its combination; otherwise it takes over a
 * variant that agrees with it on every option they share (an option was added or removed), id and
 * all, so the saved variant is updated rather than retired; further matches only copy its price.
 */
export function syncVariants(options: OptionDraft[], current: VariantDraft[]): VariantDraft[] {
  const used = usedOptions(options)
  if (used.length === 0 || combinationCount(used) > LIMITS.variants) return used.length === 0 ? [] : current
  const combos = combinations(used)
  const taken = new Set<VariantDraft>()

  const exact = new Map<string, VariantDraft>()
  for (const v of current) {
    if (used.every((o) => v.combo[o.uid]) && Object.keys(v.combo).length === used.length) exact.set(comboId(used, v.combo), v)
  }

  const compatible = (v: VariantDraft, combo: Record<string, string>) => used.every((o) => !v.combo[o.uid] || v.combo[o.uid] === combo[o.uid])

  const rows: (VariantDraft | null)[] = combos.map((combo) => {
    const hit = exact.get(comboId(used, combo))
    if (hit) {
      taken.add(hit)
      return { ...hit, combo }
    }
    return null
  })

  return rows.map((row, i) => {
    if (row) return row
    const combo = combos[i]!
    const partner = current.find((v) => !taken.has(v) && compatible(v, combo) && Object.keys(v.combo).some((k) => used.some((o) => o.uid === k)))
    if (partner) {
      taken.add(partner)
      return { ...partner, combo }
    }
    const lookalike = current.find((v) => compatible(v, combo) && Object.keys(v.combo).length > 0)
    return newVariant(combo, lookalike)
  })
}

/** "أسود / L" for a variant row. */
export function variantLabel(options: OptionDraft[], combo: Record<string, string>, lang: 'ar' | 'en'): string {
  return usedOptions(options)
    .map((o) => {
      const v = o.values.find((x) => x.uid === combo[o.uid])
      if (!v) return '?'
      return (lang === 'en' ? v.valueEn || v.valueAr : v.valueAr || v.valueEn) || v.key || '?'
    })
    .join(' / ')
}

// ── Derived values (preview, readiness) ──────────────────────────────────────

export interface DisplayPrice {
  price: number
  compareAtPrice: number | null
  /** "من {price}": the product has variants. */
  from: boolean
}

/** What the app card shows: the cheapest active priced variant, or the product price. */
export function displayPrice(draft: ProductDraft): DisplayPrice {
  if (hasVariants(draft)) {
    const active = draft.variants
      .filter((v) => v.isActive)
      .map((v) => ({ price: parseNumber(v.price), was: parseNumber(v.compareAtPrice) }))
      .filter((v) => v.price > 0)
      .sort((a, b) => a.price - b.price)
    const cheapest = active[0]
    return { price: cheapest?.price ?? 0, compareAtPrice: cheapest && cheapest.was > cheapest.price ? cheapest.was : null, from: true }
  }
  const price = parseNumber(draft.price)
  const was = parseNumber(draft.compareAtPrice)
  const p = Number.isNaN(price) ? 0 : price
  return { price: p, compareAtPrice: was > p ? was : null, from: false }
}

/** `round((compareAtPrice - price) / compareAtPrice × 100)` when there is an offer. */
export function discountPercent(price: number, compareAtPrice: number | null | undefined): number | null {
  if (!compareAtPrice || compareAtPrice <= price || compareAtPrice <= 0) return null
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
}

/** The first five swatches of the first colour option. */
export function swatches(draft: Pick<ProductDraft, 'options'>): string[] {
  const color = draft.options.find((o) => o.kind === 'Color')
  return (color?.values ?? []).map((v) => v.colorHex).filter((h) => COLOR_HEX_PATTERN.test(h)).slice(0, 5)
}

/** The checklist computed from the unsaved state, mirroring the server's `missingForSale`. */
export function localMissingForSale(draft: ProductDraft, readyImages: number): ReadinessItem[] {
  const missing: ReadinessItem[] = []
  if (!draft.categoryId) missing.push('Category')
  if (readyImages === 0) missing.push('Image')
  if (hasVariants(draft)) {
    if (!draft.variants.some((v) => v.isActive && parseNumber(v.price) > 0)) missing.push('Variants')
  } else if (!(parseNumber(draft.price) > 0)) {
    missing.push('Price')
  }
  return missing
}

// ── Validation ───────────────────────────────────────────────────────────────

/**
 * Field errors as `path → i18n key` under `store:validation.*`. Paths: `sku`, `price`,
 * `highlightsAr.2`, `specs.<uid>`, `options.<uid>.nameAr`, `values.<uid>.key`, `variants.<index>.price`…
 */
export type DraftErrors = Record<string, string>

export function validateDraft(draft: ProductDraft, opts: { isCreate: boolean; imageCount: number }): DraftErrors {
  const e: DraftErrors = {}
  const req = (path: string, value: string, max: number) => {
    const v = value.trim()
    if (!v) e[path] = 'required'
    else if (v.length > max) e[path] = 'tooLong'
  }
  const max = (path: string, value: string, limit: number) => {
    if (value.trim().length > limit) e[path] = 'tooLong'
  }

  req('sku', draft.sku, LIMITS.sku)
  req('nameAr', draft.nameAr, LIMITS.name)
  req('nameEn', draft.nameEn, LIMITS.name)
  max('brand', draft.brand, LIMITS.brand)
  max('descriptionAr', draft.descriptionAr, LIMITS.description)
  max('descriptionEn', draft.descriptionEn, LIMITS.description)
  max('keywords', draft.keywords, LIMITS.keywords)

  for (const lang of ['Ar', 'En'] as const) {
    const list = lang === 'Ar' ? draft.highlightsAr : draft.highlightsEn
    if (list.filter((h) => h.trim()).length > LIMITS.highlights) e[`highlights${lang}`] = 'tooMany'
    list.forEach((h, i) => max(`highlights${lang}.${i}`, h, LIMITS.highlight))
  }

  if (draft.specs.length > LIMITS.specs) e.specs = 'tooMany'
  for (const s of draft.specs) {
    const any = [s.labelAr, s.labelEn, s.valueAr, s.valueEn].some((x) => x.trim())
    if (!any) continue
    if (!s.labelAr.trim() || !s.valueAr.trim()) e[`specs.${s.uid}`] = 'specIncomplete'
    else if (s.labelAr.trim().length > LIMITS.specLabel || s.labelEn.trim().length > LIMITS.specLabel) e[`specs.${s.uid}`] = 'tooLong'
    else if (s.valueAr.trim().length > LIMITS.specValue || s.valueEn.trim().length > LIMITS.specValue) e[`specs.${s.uid}`] = 'tooLong'
  }

  if (opts.imageCount > LIMITS.galleryImages) e.images = 'tooManyImages'

  const variants = hasVariants(draft)
  if (!variants) {
    const price = parseNumber(draft.price)
    if (draft.price.trim() !== '' && (Number.isNaN(price) || price < 0)) e.price = 'nonNegative'
    const was = parseNumber(draft.compareAtPrice)
    if (draft.compareAtPrice.trim() !== '') {
      if (Number.isNaN(was) || was < 0) e.compareAtPrice = 'nonNegative'
      else if (was > 0 && !(was > (Number.isNaN(price) ? 0 : price))) e.compareAtPrice = 'compareAbovePrice'
    }
    if (opts.isCreate) {
      const stock = parseNumber(draft.stockQuantity)
      if (!Number.isInteger(stock) || stock < 0) e.stockQuantity = 'wholeNonNegative'
    }
  }

  if (draft.options.length > LIMITS.options) e.options = 'tooManyOptions'
  for (const o of draft.options) {
    if (o.values.length === 0) continue
    if (!o.nameAr.trim()) e[`options.${o.uid}.nameAr`] = 'required'
    if (!o.nameEn.trim()) e[`options.${o.uid}.nameEn`] = 'required'
    if (o.values.length < LIMITS.optionValuesMin) e[`options.${o.uid}.values`] = 'tooFewValues'
    if (o.values.length > LIMITS.optionValuesMax) e[`options.${o.uid}.values`] = 'tooManyValues'
    const seen = new Set<string>()
    for (const v of o.values) {
      if (!v.valueAr.trim()) e[`values.${v.uid}.valueAr`] = 'required'
      if (!v.valueEn.trim()) e[`values.${v.uid}.valueEn`] = 'required'
      if (!OPTION_KEY_PATTERN.test(v.key)) e[`values.${v.uid}.key`] = 'keyInvalid'
      else if (seen.has(v.key)) e[`values.${v.uid}.key`] = 'keyDuplicate'
      seen.add(v.key)
      if (o.kind === 'Color' && v.colorHex && !COLOR_HEX_PATTERN.test(v.colorHex)) e[`values.${v.uid}.colorHex`] = 'colorInvalid'
    }
  }

  if (variants) {
    if (combinationCount(draft.options) > LIMITS.variants) e.variants = 'tooManyVariants'
    else if (draft.variants.length === 0) e.variants = 'variantsRequired'
    draft.variants.forEach((v, i) => {
      const price = parseNumber(v.price)
      if (!(price > 0)) e[`variants.${i}.price`] = 'variantPrice'
      const was = parseNumber(v.compareAtPrice)
      if (v.compareAtPrice.trim() !== '' && (Number.isNaN(was) || was < 0)) e[`variants.${i}.compareAtPrice`] = 'nonNegative'
      else if (was > 0 && price > 0 && was <= price) e[`variants.${i}.compareAtPrice`] = 'compareAbovePrice'
      if (!v.id) {
        const stock = parseNumber(v.stockQuantity)
        if (!Number.isInteger(stock) || stock < 0) e[`variants.${i}.stockQuantity`] = 'wholeNonNegative'
      }
      if (v.sku.trim().length > LIMITS.sku) e[`variants.${i}.sku`] = 'tooLong'
    })
  }

  if (draft.requiresInstallation && !draft.installationServiceId) e.installationServiceId = 'installationRequired'
  return e
}

/** Which editor section a field error belongs to (scrolls there on a failed save). */
export function sectionOfPath(path: string): EditorSection {
  const head = path.split('.')[0]!
  if (['sku', 'nameAr', 'nameEn', 'brand'].includes(head)) return 'basics'
  if (['descriptionAr', 'descriptionEn', 'highlightsAr', 'highlightsEn', 'specs', 'keywords'].includes(head)) return 'content'
  if (['price', 'compareAtPrice', 'stockQuantity'].includes(head)) return 'pricing'
  if (head === 'images') return 'gallery'
  if (head === 'options' || head === 'values') return 'options'
  if (head === 'variants') return 'variants'
  if (head === 'installationServiceId') return 'fulfilment'
  return 'basics'
}

export type EditorSection = 'basics' | 'category' | 'gallery' | 'content' | 'pricing' | 'options' | 'variants' | 'fulfilment' | 'readiness'

/** Where a server error shows (§4.5); anything else shows by the save button. */
export function sectionOfError(code: string | null, hasVariantRows: boolean): EditorSection | null {
  switch (code) {
    case 'ProductNotReadyForSale':
      return 'readiness'
    case 'StoreCategoryNotLeaf':
    case 'StoreCategoryNotFound':
      return 'category'
    case 'StoreImageIdsInvalid':
    case 'StoreImageNotFound':
    case 'ProductImageTypeNotAllowed':
    case 'FileTooLarge':
      return 'gallery'
    case 'StoreOptionsInvalid':
      return 'options'
    case 'StoreVariantsRequired':
    case 'StoreVariantsInvalid':
    case 'StoreVariantNotFound':
      return 'variants'
    case 'CompareAtPriceInvalid':
    case 'ProductPriceInvalid':
      return hasVariantRows ? 'variants' : 'pricing'
    case 'StoreProductContentInvalid':
    case 'KeywordsTooLong':
      return 'content'
    case 'ProductSkuExists':
      return 'basics'
    case 'InstallationServiceRequired':
    case 'CanonicalServiceNotFound':
      return 'fulfilment'
    default:
      return null
  }
}

// ── Request ──────────────────────────────────────────────────────────────────

function toOptions(options: OptionDraft[]): StoreProductOptionDto[] {
  return usedOptions(options).map((o) => ({
    kind: o.kind,
    nameAr: o.nameAr.trim(),
    nameEn: o.nameEn.trim(),
    values: o.values.map((v) => ({
      key: v.key.trim(),
      valueAr: v.valueAr.trim(),
      valueEn: v.valueEn.trim(),
      colorHex: o.kind === 'Color' && v.colorHex ? v.colorHex.toUpperCase() : null,
    })),
  }))
}

function toVariants(draft: ProductDraft): StoreProductVariantRequest[] {
  const used = usedOptions(draft.options)
  return draft.variants.map((v) => {
    const was = parseNumber(v.compareAtPrice)
    return {
      id: v.id,
      sku: v.sku.trim() || null,
      optionValues: used.map((o) => o.values.find((x) => x.uid === v.combo[o.uid])?.key ?? ''),
      price: parseNumber(v.price) || 0,
      // Blank or 0 = no offer on a variant (not "keep").
      compareAtPrice: was > 0 ? was : null,
      stockQuantity: v.id ? 0 : Math.max(0, Math.trunc(parseNumber(v.stockQuantity) || 0)),
      imageId: v.imageId,
      isActive: v.isActive,
    }
  })
}

/**
 * The full save body (§4.3): basic fields always, every smart-store field sent (`""`/`[]` clear,
 * `compareAtPrice: 0` = no offer), `imageIds` in gallery order, options and variants together.
 * `stockQuantity` and `fromAiDraft` only matter on create.
 */
export function toRequest(draft: ProductDraft, imageIds: string[]): CreateStoreProductRequest {
  const variants = hasVariants(draft)
  const shown = displayPrice(draft)
  const price = parseNumber(draft.price)
  const was = parseNumber(draft.compareAtPrice)
  const imageSet = new Set(imageIds)
  return {
    sku: draft.sku.trim(),
    nameAr: draft.nameAr.trim(),
    nameEn: draft.nameEn.trim(),
    descriptionAr: draft.descriptionAr.trim() || null,
    descriptionEn: draft.descriptionEn.trim() || null,
    // With variants the server computes the shelf price; send the cheapest so the shape stays valid.
    price: variants ? shown.price : Number.isNaN(price) ? 0 : price,
    requiresDelivery: draft.requiresDelivery,
    requiresInstallation: draft.requiresInstallation,
    installationServiceId: draft.requiresInstallation ? draft.installationServiceId : null,
    deliveryServiceId: draft.requiresDelivery ? draft.deliveryServiceId : null,
    categoryId: draft.categoryId,
    brand: draft.brand.trim(),
    compareAtPrice: variants ? null : was > 0 ? was : 0,
    highlightsAr: draft.highlightsAr.map((h) => h.trim()).filter(Boolean),
    highlightsEn: draft.highlightsEn.map((h) => h.trim()).filter(Boolean),
    specs: draft.specs
      .map((s) => ({ labelAr: s.labelAr.trim(), labelEn: s.labelEn.trim(), valueAr: s.valueAr.trim(), valueEn: s.valueEn.trim() }))
      .filter((s) => s.labelAr && s.valueAr),
    keywords: draft.keywords.trim(),
    imageIds,
    options: toOptions(draft.options),
    variants: variants ? toVariants(draft).map((v) => (v.imageId && !imageSet.has(v.imageId) ? { ...v, imageId: null } : v)) : [],
    stockQuantity: variants ? 0 : Math.max(0, Math.trunc(parseNumber(draft.stockQuantity) || 0)),
    fromAiDraft: draft.fromAiDraft,
  }
}

/** The gallery as the server knows it: images keep their latest polled state. */
export interface GalleryItem {
  /** Client key (stable across the upload → server id swap). */
  key: string
  /** Server id once uploaded. */
  id: string | null
  /** The last server state (product images, upload response). */
  image: StoreProductImageResponse | null
  /** A local preview while uploading. */
  file: File | null
  uploadError: unknown
}

export function galleryFromImages(images: StoreProductImageResponse[]): GalleryItem[] {
  return [...images]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((image) => ({ key: image.id, id: image.id, image, file: null, uploadError: null }))
}
