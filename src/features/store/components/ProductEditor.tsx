import { useQueryClient } from '@tanstack/react-query'
import { Check, CircleAlert, Info, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useBlocker, useNavigate } from 'react-router'
import { ConfirmDialog } from '@/components/ActionDialog'
import { Money, Num } from '@/components/Format'
import { InlineError } from '@/components/States'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Checkbox, CheckboxField, Switch } from '@/components/ui/checkbox'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import type { CreateStoreProductRequest, StoreProductResponse, UpdateStoreProductRequest } from '@/api/types'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { cn } from '@/lib/utils'
import { errorCodeOf, missingOf, productActionInvalidation, storeCategoryKeys, storeProductKeys, storeProductsApi } from '../api'
import { coverOf, readyCount, useGalleryImages } from '../hooks'
import {
  displayPrice,
  draftFromProduct,
  emptyDraft,
  galleryFromImages,
  hasVariants as draftHasVariants,
  LIMITS,
  localMissingForSale,
  parseNumber,
  sectionOfError,
  sectionOfPath,
  syncVariants,
  toRequest,
  uid,
  validateDraft,
  type EditorSection,
  type GalleryItem,
  type OptionDraft,
  type ProductDraft,
  type ReadinessItem,
} from '../productForm'
import { CategoryPicker } from './CategoryPicker'
import { ImageGallery } from './ImageGallery'
import { OptionsEditor } from './OptionsEditor'
import { ProductPreview } from './ProductPreview'
import { ServicePicker } from './ServicePicker'
import { StockDialog } from './StockDialog'
import { AiBadge } from './StoreBits'
import { VariantsTable } from './VariantsTable'
import '../i18n'

interface ProductEditorProps {
  /** Null = a new product (POST); else the saved product (PUT). */
  product: StoreProductResponse | null
  initialDraft: ProductDraft
  initialGallery: GalleryItem[]
  /** The AI draft's notes, shown as a checklist to tick off. */
  aiNotes?: string[]
  /** While the organization can't operate (`ProviderNotOperational`): everything shown, nothing editable. */
  readOnly?: boolean
}

const idsOf = (gallery: GalleryItem[]) => gallery.map((i) => i.id).filter((id): id is string => !!id)
const fingerprint = (draft: ProductDraft, gallery: GalleryItem[]) => JSON.stringify(toRequest(draft, idsOf(gallery)))

function toUpdate(body: CreateStoreProductRequest): UpdateStoreProductRequest {
  const update: Partial<CreateStoreProductRequest> = { ...body }
  delete update.stockQuantity
  delete update.fromAiDraft
  return update as UpdateStoreProductRequest
}

/**
 * Create / edit a store product (§3.3): the form on one side, the live app card and the
 * "ready for sale" checklist on the other (sticky). The full form always sends every field (§4.3).
 */
export function ProductEditor({ product, initialDraft, initialGallery, aiNotes, readOnly }: ProductEditorProps) {
  const { t } = useTranslation('store')
  const { pick } = useLang()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isCreate = !product

  const [draft, setDraft] = useState(initialDraft)
  const [gallery, setGallery] = useState(initialGallery)
  const [cleanWithAi, setCleanWithAi] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [highlight, setHighlight] = useState<string[]>([])
  const [checkedNotes, setCheckedNotes] = useState<ReadonlySet<number>>(new Set())
  const [stockFor, setStockFor] = useState<string | null>(null)
  const [confirmActive, setConfirmActive] = useState(false)

  const images = useGalleryImages(gallery)
  const imageIds = useMemo(() => idsOf(gallery), [gallery])
  const baseline = useRef(isCreate ? fingerprint(emptyDraft(), []) : fingerprint(initialDraft, initialGallery))
  const current = useMemo(() => fingerprint(draft, gallery), [draft, gallery])
  const uploading = gallery.some((i) => !i.id && !i.uploadError)
  const failedUploads = gallery.some((i) => !!i.uploadError)
  const dirty = current !== baseline.current || uploading || (isCreate && gallery.length > 0)
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  const resetFrom = (p: StoreProductResponse) => {
    const d = draftFromProduct(p)
    const g = galleryFromImages(p.images)
    setDraft(d)
    setGallery(g)
    baseline.current = fingerprint(d, g)
  }

  // A newer server copy (a refetch, a stock move, an image becoming ready) replaces a clean form.
  useEffect(() => {
    if (product && !dirtyRef.current) resetFrom(product)
  }, [product])

  // The server never activates a draft on its own; when a saved picture becomes ready, refetch the
  // product so its cover and `missingForSale` catch up.
  const statuses = useRef(new Map<string, string>())
  useEffect(() => {
    let changed = false
    for (const [id, image] of images) {
      const before = statuses.current.get(id)
      if (before && before !== image.status && image.productId) changed = true
      statuses.current.set(id, image.status)
    }
    if (changed && product) void queryClient.invalidateQueries({ queryKey: storeProductKeys.detail(product.id) })
  }, [images, product, queryClient])

  const allowNavigation = useRef(false)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => !allowNavigation.current && !readOnly && dirty && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (!dirty || readOnly) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty, readOnly])

  const variants = draftHasVariants(draft)
  const errors = useMemo(
    () => (submitted ? validateDraft(draft, { isCreate, imageCount: gallery.length }) : {}),
    [submitted, draft, isCreate, gallery.length],
  )
  const fieldError = (path: string) => (errors[path] ? t(`validation.${errors[path]}`, { max: LIMITS.highlights }) : undefined)

  const update = (patch: Partial<ProductDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const setOptions = (options: OptionDraft[]) => setDraft((d) => ({ ...d, options, variants: syncVariants(options, d.variants) }))

  const scrollTo = (section: EditorSection) => document.getElementById(`store-section-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const save = useAction({
    invalidate: productActionInvalidation,
    success: (saved: StoreProductResponse) => (isCreate ? (saved.isActive ? t('success.createdActive') : t('success.createdDraft')) : t('success.updated')),
    mutationFn: (body: CreateStoreProductRequest) => (product ? storeProductsApi.update(product.id, toUpdate(body)) : storeProductsApi.create(body)),
    onSuccess: (saved) => {
      setSubmitted(false)
      setHighlight([])
      setNotice(null)
      queryClient.setQueryData(storeProductKeys.detail(saved.id), saved)
      resetFrom(saved)
      if (isCreate) {
        allowNavigation.current = true
        navigate(`/store/products/${saved.id}`, { replace: true })
      }
    },
  })

  const activation = useAction({
    invalidate: productActionInvalidation,
    success: (saved: StoreProductResponse) => (saved.isActive ? t('success.activated') : t('success.deactivated')),
    mutationFn: (isActive: boolean) => storeProductsApi.setActive(product!.id, isActive),
    onSuccess: () => {
      setConfirmActive(false)
      setHighlight([])
    },
  })

  // Server errors land in the section they belong to (§4.5); not-ready highlights the checklist.
  const saveCode = errorCodeOf(save.error)
  const saveSection = sectionOfError(saveCode, variants)
  useEffect(() => {
    if (!save.error) return
    const missing = missingOf(save.error)
    if (missing.length) setHighlight(missing)
    if (saveCode === 'StoreCategoryNotFound') void queryClient.invalidateQueries({ queryKey: storeCategoryKeys.tree() })
    if (saveSection) scrollTo(saveSection)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save.error])
  useEffect(() => {
    const missing = missingOf(activation.error)
    if (missing.length) setHighlight(missing)
  }, [activation.error])

  const sectionError = (section: EditorSection) => (saveSection === section ? <InlineError error={save.error} /> : null)

  const submit = () => {
    setSubmitted(true)
    setNotice(null)
    if (uploading) return setNotice(t('editor.waitUploads'))
    if (failedUploads) return setNotice(t('editor.removeFailed'))
    const found = validateDraft(draft, { isCreate, imageCount: gallery.length })
    const first = Object.keys(found)[0]
    if (first) {
      setNotice(t('editor.fixErrors'))
      scrollTo(sectionOfPath(first))
      return
    }
    save.mutate(toRequest(draft, imageIds))
  }

  const ready = readyCount(gallery, images)
  const cover = coverOf(gallery, images)
  const missingNow = localMissingForSale(draft, ready)
  const savedStock = useMemo(() => new Map((product?.variants ?? []).map((v) => [v.id, v.stockQuantity])), [product])
  const savedImageIds = useMemo(() => new Set((product?.images ?? []).map((i) => i.id)), [product])
  const imageChoices = gallery.flatMap((item, index) => (item.id ? [{ id: item.id, label: t('variants.imageN', { n: index + 1 }) }] : []))
  const stockVariant = stockFor && stockFor !== 'product' ? product?.variants.find((v) => v.id === stockFor) ?? null : null
  const canActivate = !!product && !product.isActive && product.missingForSale.length === 0 && !dirty

  const items: ReadinessItem[] = ['Category', 'Image', variants ? 'Variants' : 'Price']

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <fieldset disabled={readOnly} className="min-w-0 space-y-4">
          <legend className="sr-only">{t('editor.form')}</legend>

          {aiNotes && aiNotes.length > 0 && (
            <Card className="border-brand-mint">
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <AiBadge /> {t('ai.notesTitle')}
                  </span>
                }
                description={t('ai.notesHint')}
              />
              <CardBody className="space-y-2">
                {aiNotes.map((note, i) => (
                  <label key={i} className="flex cursor-pointer items-start gap-2 text-sm">
                    <Checkbox
                      className="mt-0.5"
                      checked={checkedNotes.has(i)}
                      onCheckedChange={(v) =>
                        setCheckedNotes((prev) => {
                          const next = new Set(prev)
                          if (v) next.add(i)
                          else next.delete(i)
                          return next
                        })
                      }
                    />
                    <span className={cn(checkedNotes.has(i) && 'text-muted-foreground line-through')}>{note}</span>
                  </label>
                ))}
              </CardBody>
            </Card>
          )}

          <Section id="basics" title={t('editor.basics')} error={sectionError('basics')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('fields.nameAr')} htmlFor="p-name-ar" required error={fieldError('nameAr')}>
                <Input id="p-name-ar" dir="rtl" maxLength={LIMITS.name} value={draft.nameAr} onChange={(e) => update({ nameAr: e.target.value })} aria-invalid={!!errors.nameAr} />
              </Field>
              <Field label={t('fields.nameEn')} htmlFor="p-name-en" required error={fieldError('nameEn')}>
                <Input id="p-name-en" dir="ltr" maxLength={LIMITS.name} value={draft.nameEn} onChange={(e) => update({ nameEn: e.target.value })} aria-invalid={!!errors.nameEn} />
              </Field>
              <Field label={t('fields.sku')} htmlFor="p-sku" required error={saveCode === 'ProductSkuExists' ? t('errors.ProductSkuExists') : fieldError('sku')} hint={t('editor.skuHint')}>
                <Input
                  id="p-sku"
                  dir="ltr"
                  className="font-mono"
                  autoComplete="off"
                  maxLength={LIMITS.sku}
                  value={draft.sku}
                  onChange={(e) => update({ sku: e.target.value })}
                  aria-invalid={!!errors.sku || saveCode === 'ProductSkuExists'}
                />
              </Field>
              <Field label={t('fields.brand')} htmlFor="p-brand" optional error={fieldError('brand')}>
                <Input id="p-brand" maxLength={LIMITS.brand} value={draft.brand} onChange={(e) => update({ brand: e.target.value })} aria-invalid={!!errors.brand} />
              </Field>
            </div>
          </Section>

          <Section id="category" title={t('editor.category')} description={t('editor.categoryHint')} error={sectionError('category')} highlighted={highlight.includes('Category')}>
            <Field label={t('fields.category')} htmlFor="p-category" required>
              <CategoryPicker id="p-category" mode="leaf" value={draft.categoryId} onChange={(id) => id && update({ categoryId: id })} disabled={readOnly} />
            </Field>
          </Section>

          <Section
            id="gallery"
            title={t('editor.gallery')}
            description={t('editor.galleryHint')}
            error={sectionError('gallery')}
            highlighted={highlight.includes('Image')}
            actions={
              !readOnly && (
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={cleanWithAi} onCheckedChange={setCleanWithAi} aria-label={t('images.cleanWithAi')} />
                  {t('images.cleanWithAi')}
                </label>
              )
            }
          >
            <ImageGallery
              items={gallery}
              setItems={setGallery}
              images={images}
              max={LIMITS.galleryImages}
              cleanWithAi={cleanWithAi}
              readOnly={readOnly}
              savedIds={savedImageIds}
            />
            {fieldError('images') && <p className="mt-2 text-xs text-destructive">{fieldError('images')}</p>}
            {product?.isActive && !readOnly && <p className="mt-2 text-xs text-muted-foreground">{t('editor.replaceOnlyImage')}</p>}
          </Section>

          <Section id="content" title={t('editor.content')} error={sectionError('content')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('fields.descriptionAr')} htmlFor="p-desc-ar" optional error={fieldError('descriptionAr')}>
                <Textarea id="p-desc-ar" dir="rtl" rows={4} maxLength={LIMITS.description} value={draft.descriptionAr} onChange={(e) => update({ descriptionAr: e.target.value })} />
              </Field>
              <Field label={t('fields.descriptionEn')} htmlFor="p-desc-en" optional error={fieldError('descriptionEn')}>
                <Textarea id="p-desc-en" dir="ltr" rows={4} maxLength={LIMITS.description} value={draft.descriptionEn} onChange={(e) => update({ descriptionEn: e.target.value })} />
              </Field>
              <ListInput
                label={t('fields.highlightsAr')}
                dir="rtl"
                items={draft.highlightsAr}
                onChange={(highlightsAr) => update({ highlightsAr })}
                error={fieldError('highlightsAr') ?? draft.highlightsAr.map((_, i) => fieldError(`highlightsAr.${i}`)).find(Boolean)}
              />
              <ListInput
                label={t('fields.highlightsEn')}
                dir="ltr"
                items={draft.highlightsEn}
                onChange={(highlightsEn) => update({ highlightsEn })}
                error={fieldError('highlightsEn') ?? draft.highlightsEn.map((_, i) => fieldError(`highlightsEn.${i}`)).find(Boolean)}
              />
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{t('fields.specs')}</h4>
                <span className="text-xs text-muted-foreground">
                  {draft.specs.length}/{LIMITS.specs}
                </span>
              </div>
              {draft.specs.length > 0 && (
                <div className="space-y-2">
                  {draft.specs.map((s) => (
                    <div key={s.uid}>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                        {(['labelAr', 'labelEn', 'valueAr', 'valueEn'] as const).map((k) => (
                          <Input
                            key={k}
                            dir={k.endsWith('Ar') ? 'rtl' : 'ltr'}
                            value={s[k]}
                            maxLength={k.startsWith('label') ? LIMITS.specLabel : LIMITS.specValue}
                            placeholder={t(`specs.${k}`)}
                            aria-label={t(`specs.${k}`)}
                            aria-invalid={!!errors[`specs.${s.uid}`]}
                            onChange={(e) => update({ specs: draft.specs.map((x) => (x.uid === s.uid ? { ...x, [k]: e.target.value } : x)) })}
                          />
                        ))}
                        {!readOnly && (
                          <Button variant="ghost" size="icon-sm" aria-label={t('specs.remove')} onClick={() => update({ specs: draft.specs.filter((x) => x.uid !== s.uid) })}>
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                      {fieldError(`specs.${s.uid}`) && <p className="mt-1 text-xs text-destructive">{fieldError(`specs.${s.uid}`)}</p>}
                    </div>
                  ))}
                </div>
              )}
              {!readOnly && draft.specs.length < LIMITS.specs && (
                <Button variant="outline" size="xs" onClick={() => update({ specs: [...draft.specs, { uid: uid('s'), labelAr: '', labelEn: '', valueAr: '', valueEn: '' }] })}>
                  <Plus /> {t('specs.add')}
                </Button>
              )}
            </div>

            <Field className="mt-4" label={t('fields.keywords')} htmlFor="p-keywords" optional hint={t('editor.keywordsHint')} error={fieldError('keywords')}>
              <Input id="p-keywords" maxLength={LIMITS.keywords} value={draft.keywords} onChange={(e) => update({ keywords: e.target.value })} />
            </Field>
          </Section>

          <Section id="pricing" title={t('editor.pricing')} error={sectionError('pricing')} highlighted={highlight.includes('Price')}>
            {variants ? (
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">{t('editor.computedPrice')}</div>
                  <Money value={displayPrice(draft).price} className="font-semibold" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('editor.computedStock')}</div>
                  <Num
                    value={draft.variants.filter((v) => v.isActive).reduce((sum, v) => sum + (v.id ? savedStock.get(v.id) ?? 0 : Math.max(0, parseNumber(v.stockQuantity) || 0)), 0)}
                    className="font-semibold"
                  />
                </div>
                <p className="basis-full text-xs text-muted-foreground">{t('editor.computedHint')}</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label={t('fields.price')} htmlFor="p-price" required error={fieldError('price')}>
                  <Input id="p-price" type="number" inputMode="decimal" min={0} step="0.01" dir="ltr" value={draft.price} onChange={(e) => update({ price: e.target.value })} aria-invalid={!!errors.price} />
                </Field>
                <Field label={t('fields.compareAtPrice')} htmlFor="p-compare" optional hint={t('editor.compareHint')} error={saveCode === 'CompareAtPriceInvalid' ? t('errors.CompareAtPriceInvalid') : fieldError('compareAtPrice')}>
                  <Input
                    id="p-compare"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    dir="ltr"
                    value={draft.compareAtPrice}
                    onChange={(e) => update({ compareAtPrice: e.target.value })}
                    aria-invalid={!!errors.compareAtPrice}
                  />
                </Field>
                {isCreate ? (
                  <Field label={t('fields.stockQuantity')} htmlFor="p-stock" required hint={t('editor.stockHint')} error={fieldError('stockQuantity')}>
                    <Input
                      id="p-stock"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      dir="ltr"
                      value={draft.stockQuantity}
                      onChange={(e) => update({ stockQuantity: e.target.value })}
                      aria-invalid={!!errors.stockQuantity}
                    />
                  </Field>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">{t('fields.stock')}</span>
                    <span className="flex items-center gap-2">
                      <Num value={product?.hasVariants ? null : product?.stockQuantity} className="text-lg font-semibold" />
                      {!readOnly && product && !product.hasVariants && (
                        <Button size="xs" variant="outline" onClick={() => setStockFor('product')}>
                          {t('actions.adjustStock')}
                        </Button>
                      )}
                    </span>
                    {product?.hasVariants && <span className="text-xs text-muted-foreground">{t('editor.stockAfterSave')}</span>}
                  </div>
                )}
              </div>
            )}
          </Section>

          <Section id="options" title={t('editor.options')} description={t('editor.optionsHint')} error={sectionError('options')}>
            <OptionsEditor options={draft.options} onChange={setOptions} errors={errors} readOnly={readOnly} />
            {errors.options && <p className="mt-2 text-xs text-destructive">{fieldError('options')}</p>}
          </Section>

          {variants && (
            <Section id="variants" title={t('editor.variants')} error={sectionError('variants')} highlighted={highlight.includes('Variants')}>
              {errors.variants && <p className="mb-2 text-xs text-destructive">{t(`validation.${errors.variants}`, { max: LIMITS.variants })}</p>}
              <VariantsTable
                options={draft.options}
                variants={draft.variants}
                onChange={(next) => update({ variants: next })}
                errors={errors}
                imageChoices={imageChoices}
                savedStock={savedStock}
                onAdjustStock={!readOnly && product ? (id) => setStockFor(id) : undefined}
                readOnly={readOnly}
              />
              {saveCode === 'StoreVariantNotFound' && product && (
                <Button
                  variant="outline"
                  size="xs"
                  className="mt-2"
                  onClick={async () => {
                    const fresh = await queryClient.fetchQuery({ queryKey: storeProductKeys.detail(product.id), queryFn: ({ signal }) => storeProductsApi.detail(product.id, signal) })
                    resetFrom(fresh)
                    save.reset()
                  }}
                >
                  <RotateCcw /> {t('editor.reload')}
                </Button>
              )}
            </Section>
          )}

          <Section id="fulfilment" title={t('editor.fulfilment')} error={sectionError('fulfilment')}>
            {/* §5 criterion 9: the platform, not this organization, arranges delivery and installation. */}
            <p className="flex items-start gap-2 rounded-md bg-tone-info-soft px-3 py-2 text-sm text-tone-info" role="note">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              {t('editor.fulfilmentNotice')}
            </p>
            <div className="space-y-3">
              <CheckboxField id="p-req-delivery" checked={draft.requiresDelivery} onCheckedChange={(v) => update({ requiresDelivery: v === true })} label={t('fields.requiresDelivery')} />
              {draft.requiresDelivery && (
                <Field label={t('fields.deliveryService')} htmlFor="p-delivery" optional hint={t('editor.deliveryHint')}>
                  <ServicePicker id="p-delivery" value={draft.deliveryServiceId} onChange={(id) => update({ deliveryServiceId: id })} />
                </Field>
              )}
              <CheckboxField
                id="p-req-installation"
                checked={draft.requiresInstallation}
                onCheckedChange={(v) => update({ requiresInstallation: v === true })}
                label={t('fields.requiresInstallation')}
              />
              {draft.requiresInstallation && (
                <Field
                  label={t('fields.installationService')}
                  htmlFor="p-installation"
                  required
                  error={fieldError('installationServiceId')}
                >
                  <ServicePicker
                    id="p-installation"
                    value={draft.installationServiceId}
                    onChange={(id) => update({ installationServiceId: id })}
                    invalid={!!errors.installationServiceId}
                  />
                </Field>
              )}
            </div>
          </Section>
        </fieldset>

        <aside className="space-y-4 lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:self-start lg:overflow-y-auto">
          <Card>
            <CardBody>
              <ProductPreview draft={draft} coverUrl={cover?.imageUrl ?? null} />
            </CardBody>
          </Card>

          <Card id="store-section-readiness" className={cn(highlight.length > 0 && 'border-destructive ring-1 ring-destructive/40')}>
            <CardHeader title={t('readiness.title')} description={missingNow.length ? t('readiness.notReady') : t('readiness.ready')} />
            <CardBody className="space-y-3">
              <ul className="space-y-1.5">
                {items.map((item) => {
                  const missing = missingNow.includes(item)
                  const flagged = highlight.includes(item)
                  return (
                    <li
                      key={item}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                        missing ? 'text-foreground' : 'bg-tone-success-soft text-tone-success',
                        flagged && 'bg-destructive-soft font-medium text-destructive',
                      )}
                    >
                      {missing ? <X className="size-4 shrink-0 text-destructive" /> : <Check className="size-4 shrink-0" />}
                      {t(`readiness.items.${item}`)}
                    </li>
                  )
                })}
              </ul>
              {saveSection === 'readiness' && <InlineError error={save.error} />}
              <InlineError error={activation.error} />

              {!readOnly && (
                <div className="space-y-2 border-t pt-3">
                  {notice && (
                    <p className="flex items-start gap-1.5 text-xs text-destructive" role="alert">
                      <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
                      {notice}
                    </p>
                  )}
                  {!saveSection && <InlineError error={save.error} />}
                  <Button className="w-full" loading={save.isPending} disabled={!isCreate && !dirty} onClick={submit}>
                    {isCreate ? t('editor.save') : t('editor.saveChanges')}
                  </Button>
                  {isCreate && <p className="text-xs text-muted-foreground">{missingNow.length ? t('editor.willBeDraft') : t('editor.willBeLive')}</p>}

                  {product && !product.isActive && (
                    <>
                      <Button className="w-full" variant="outline" disabled={!canActivate} loading={activation.isPending} onClick={() => activation.mutate(true)}>
                        {t('actions.activate')}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        {product.missingForSale.length
                          ? t('readiness.savedMissing', { items: product.missingForSale.map((m) => t(`readiness.items.${m}`, { defaultValue: m })).join('، ') })
                          : dirty
                            ? t('readiness.saveFirst')
                            : t('readiness.canActivate')}
                      </p>
                    </>
                  )}
                  {product?.isActive && (
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge enum="ActiveFilter" value="Active" />
                      <Button size="xs" variant="destructive-outline" onClick={() => setConfirmActive(true)}>
                        {t('actions.deactivate')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>

      {product && !readOnly && (
        <>
          <StockDialog open={stockFor !== null} onClose={() => setStockFor(null)} product={product} variant={stockVariant} />
          <ConfirmDialog
            open={confirmActive}
            onOpenChange={(o) => !o && setConfirmActive(false)}
            destructive
            title={t('actions.deactivate')}
            target={`${product.sku} · ${pick(product.nameAr, product.nameEn)}`}
            changes={t('actions.deactivateChange')}
            confirmLabel={t('actions.deactivate')}
            submitting={activation.isPending}
            error={activation.error}
            onSubmit={() => activation.mutate(false)}
          />
        </>
      )}

      <Dialog open={blocker.state === 'blocked'} onOpenChange={(o) => !o && blocker.reset?.()}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('editor.leaveTitle')}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-muted-foreground">{t('editor.leaveBody')}</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              {t('editor.stay')}
            </Button>
            <Button variant="destructive" onClick={() => blocker.proceed?.()}>
              {t('editor.leave')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface SectionProps {
  id: EditorSection
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  error?: ReactNode
  highlighted?: boolean
  children: ReactNode
}

function Section({ id, title, description, actions, error, highlighted, children }: SectionProps) {
  return (
    <Card id={`store-section-${id}`} className={cn('scroll-mt-20', highlighted && 'border-destructive ring-1 ring-destructive/40')}>
      <CardHeader title={title} description={description} actions={actions} />
      <CardBody className="space-y-3">
        {error}
        {children}
      </CardBody>
    </Card>
  )
}

/** Up to 6 short lines (highlights), one input each. */
function ListInput({ label, dir, items, onChange, error }: { label: string; dir: 'rtl' | 'ltr'; items: string[]; onChange: (items: string[]) => void; error?: string }) {
  const { t } = useTranslation('store')
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {items.length}/{LIMITS.highlights}
        </span>
      </div>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          <Input dir={dir} value={item} maxLength={LIMITS.highlight} aria-label={`${label} ${i + 1}`} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <Button variant="ghost" size="icon-sm" aria-label={t('highlights.remove')} onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <X />
          </Button>
        </div>
      ))}
      {items.length < LIMITS.highlights && (
        <Button variant="link" size="xs" className="self-start" onClick={() => onChange([...items, ''])}>
          <Plus /> {t('highlights.add')}
        </Button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
