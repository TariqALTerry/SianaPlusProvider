import { useQueryClient } from '@tanstack/react-query'
import { PenLine, RotateCcw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/PageHeader'
import { InlineError, useErrorMessage } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Switch } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import type { StoreProductDraftResponse } from '@/api/types'
import { useProvider } from '@/app/provider'
import { useAction } from '@/hooks/useAction'
import './i18n'
import { errorCodeOf, isStoreGateError, storeProductKeys, storeProductsApi } from './api'
import { CategoryPicker } from './components/CategoryPicker'
import { ImageGallery } from './components/ImageGallery'
import { ProductEditor } from './components/ProductEditor'
import { AiBadge, NotOperationalNote, StoreUnavailable } from './components/StoreBits'
import { useGalleryImages } from './hooks'
import { draftFromAi, emptyDraft, LIMITS, type GalleryItem, type ProductDraft } from './productForm'

interface EditorStage {
  draft: ProductDraft
  gallery: GalleryItem[]
  notes: string[]
  /** The model was off: manual filling with the same pictures. */
  manual: boolean
}

/**
 * "منتج جديد بالذكاء" (`/store/products/ai`, §3.2): drop pictures (uploaded at once), add a note
 * and maybe a category, then one model call fills the editor. Nothing is saved until "حفظ".
 */
export function AiProductPage() {
  const { t } = useTranslation('store')
  const errorMessage = useErrorMessage()
  const queryClient = useQueryClient()
  const [gallery, setGallery] = useState<GalleryItem[]>([])
  const [cleanWithAi, setCleanWithAi] = useState(true)
  const [hint, setHint] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [stage, setStage] = useState<EditorStage | null>(null)
  const images = useGalleryImages(gallery)
  const { operational } = useProvider()

  const uploaded = gallery.filter((i) => i.id)
  const uploading = gallery.some((i) => !i.id && !i.uploadError)

  // The editor starts from what the pictures look like now (polling carries on there).
  const usable = () => uploaded.map((i) => ({ ...i, image: images.get(i.id!) ?? i.image }))
  const toEditor = (draft: ProductDraft, notes: string[], manual: boolean) => {
    for (const item of uploaded) {
      const image = images.get(item.id!)
      if (image) queryClient.setQueryData(storeProductKeys.image(image.id), image)
    }
    setStage({ draft: { ...draft, categoryId: draft.categoryId ?? categoryId }, gallery: usable(), notes, manual })
  }

  const fill = useAction({
    mutationFn: () => storeProductsApi.aiDraft({ imageIds: uploaded.map((i) => i.id!), hint: hint.trim() || null, categoryId }),
    onSuccess: (res: StoreProductDraftResponse) => toEditor(draftFromAi(res), res.notes, false),
  })

  const code = errorCodeOf(fill.error)
  const run = () =>
    fill.mutate(undefined, {
      // §3.2: the model is off → go on by hand with the same pictures.
      onError: (error) => {
        if (errorCodeOf(error) === 'StoreAiUnavailable') toEditor(emptyDraft(), [], true)
      },
    })

  const header = (
    <PageHeader
      back={{ to: '/store', label: t('products.title') }}
      title={
        <span className="flex items-center gap-2">
          {t('ai.title')} <AiBadge />
        </span>
      }
      description={t('ai.description')}
    />
  )

  if (isStoreGateError(fill.error)) return <StoreUnavailable error={fill.error} />

  if (stage) {
    return (
      <>
        {header}
        {stage.manual && (
          <div className="mb-4 rounded-md border border-brand-yellow bg-tone-attention-soft px-3 py-2 text-sm text-tone-attention" role="status">
            {t('errors.StoreAiUnavailable')} {t('ai.manualFallback')}
          </div>
        )}
        <ProductEditor product={null} initialDraft={stage.draft} initialGallery={stage.gallery} aiNotes={stage.notes} readOnly={!operational} />
      </>
    )
  }

  const imagesError = code === 'StoreAiDraftImagesInvalid' ? errorMessage(fill.error) : undefined
  const hintError = code === 'StoreAiHintTooLong' ? errorMessage(fill.error) : hint.length > LIMITS.hint ? t('validation.tooLong') : undefined
  const failed = code === 'StoreAiDraftFailed'

  return (
    <>
      {header}
      {!operational && <NotOperationalNote />}
      <div className="mx-auto max-w-3xl space-y-4">
        <Card>
          <CardHeader
            title={t('ai.step1')}
            description={t('ai.step1Hint', { max: LIMITS.aiImages })}
            actions={
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={cleanWithAi} onCheckedChange={setCleanWithAi} aria-label={t('images.cleanWithAi')} />
                {t('images.cleanWithAi')}
              </label>
            }
          />
          <CardBody className="space-y-2">
            <ImageGallery items={gallery} setItems={setGallery} images={images} max={LIMITS.aiImages} cleanWithAi={cleanWithAi} showCover={false} readOnly={!operational} />
            <p className="text-xs text-muted-foreground">{cleanWithAi ? t('ai.cleanOn') : t('ai.cleanOff')}</p>
            {imagesError && <p className="text-xs text-destructive">{imagesError}</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('ai.step2')} />
          <CardBody className="space-y-3">
            <Field label={t('ai.hint')} htmlFor="ai-hint" optional hint={`${hint.length}/${LIMITS.hint} · ${t('ai.hintExample')}`} error={hintError}>
              <Textarea id="ai-hint" rows={3} maxLength={LIMITS.hint} value={hint} onChange={(e) => setHint(e.target.value)} placeholder={t('ai.hintPlaceholder')} />
            </Field>
            <Field label={t('fields.category')} htmlFor="ai-category" optional hint={t('ai.categoryHint')}>
              <CategoryPicker id="ai-category" mode="leaf" clearable value={categoryId} onChange={(id) => setCategoryId(id)} />
            </Field>
          </CardBody>
        </Card>

        {failed && (
          <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive-soft px-3 py-2 text-sm text-destructive" role="alert">
            <p>{errorMessage(fill.error)}</p>
            <p className="text-xs">{t('ai.failedHint')}</p>
          </div>
        )}
        {!failed && !imagesError && !hintError && code !== 'StoreAiUnavailable' && <InlineError error={fill.error} />}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" disabled={uploading || fill.isPending} onClick={() => toEditor(emptyDraft(), [], false)}>
            <PenLine /> {t('ai.skip')}
          </Button>
          <Button size="lg" loading={fill.isPending} disabled={!operational || uploaded.length === 0 || uploading || hint.length > LIMITS.hint} onClick={run}>
            {failed ? <RotateCcw /> : <Sparkles />} {failed ? t('ai.retry') : fill.isPending ? t('ai.filling') : t('ai.fill')}
          </Button>
        </div>
        {uploaded.length === 0 && <p className="text-end text-xs text-muted-foreground">{t('ai.needImage')}</p>}
      </div>
    </>
  )
}
