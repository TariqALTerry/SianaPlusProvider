import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ExternalLink, GripVertical, ImagePlus, Loader2, MoreVertical, RefreshCw, Sparkles, Trash2, XCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { useErrorMessage } from '@/components/States'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Tooltip } from '@/components/ui/menu'
import { fileUrl, MAX_UPLOAD_BYTES } from '@/api/files'
import type { StoreProductImageResponse } from '@/api/types'
import { useAction } from '@/hooks/useAction'
import { cn } from '@/lib/utils'
import { storeImagesApi, storeProductKeys } from '../api'
import { uid, type GalleryItem } from '../productForm'
import '../i18n'

/** The picture pipeline takes these only (§4.4: `ProductImageTypeNotAllowed` otherwise). */
const STORE_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
const STORE_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'

interface ImageGalleryProps {
  items: GalleryItem[]
  setItems: Dispatch<SetStateAction<GalleryItem[]>>
  /** Latest polled state per image id. */
  images: Map<string, StoreProductImageResponse>
  max: number
  /** Sent with each new upload. */
  cleanWithAi: boolean
  readOnly?: boolean
  /** Saved product pictures: removing one deletes it for good on save. */
  savedIds?: ReadonlySet<string>
  /** Shows "الغلاف" on the first picture. */
  showCover?: boolean
  compact?: boolean
}

function extensionOk(file: File) {
  const dot = file.name.lastIndexOf('.')
  return dot >= 0 && STORE_IMAGE_EXTENSIONS.includes(file.name.slice(dot).toLowerCase())
}

/**
 * Drop zone + sortable picture grid (§3.2, §3.3, §4.4). Each file uploads the moment it is
 * dropped and shows as "processing" until the job templates it; the first picture is the cover.
 */
export function ImageGallery({ items, setItems, images, max, cleanWithAi, readOnly, savedIds, showCover = true, compact }: ImageGalleryProps) {
  const { t } = useTranslation('store')
  const queryClient = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const remaining = Math.max(0, max - items.length)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  const addFiles = (list: FileList | File[]) => {
    const files = Array.from(list)
    setNotice(files.length > remaining ? t('images.tooMany', { max }) : null)
    for (const file of files.slice(0, remaining)) {
      const key = uid('img')
      const problem = !extensionOk(file) ? t('errors.ProductImageTypeNotAllowed') : file.size > MAX_UPLOAD_BYTES ? t('errors.FileTooLarge') : null
      setItems((prev) => [...prev, { key, id: null, image: null, file, uploadError: problem ? new Error(problem) : null }])
      if (problem) continue
      storeImagesApi.upload(file, cleanWithAi).then(
        (image) => {
          queryClient.setQueryData(storeProductKeys.image(image.id), image)
          setItems((prev) => prev.map((i) => (i.key === key ? { ...i, id: image.id, image } : i)))
        },
        (error: unknown) => setItems((prev) => prev.map((i) => (i.key === key ? { ...i, uploadError: error } : i))),
      )
    }
  }

  const remove = (key: string) => setItems((prev) => prev.filter((i) => i.key !== key))

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    setItems((prev) => {
      const from = prev.findIndex((i) => i.key === active.id)
      const to = prev.findIndex((i) => i.key === over.id)
      return from < 0 || to < 0 ? prev : arrayMove(prev, from, to)
    })
  }

  const dropZone = !readOnly && remaining > 0 && (
    <div
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return
        e.preventDefault()
        setDragOver(false)
        addFiles(e.dataTransfer.files)
      }}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors',
        dragOver ? 'border-brand-teal bg-brand-wash' : 'border-border',
        compact ? 'aspect-square' : 'min-h-28',
      )}
    >
      <ImagePlus className="size-6 text-brand-teal" aria-hidden />
      <p className="text-xs text-muted-foreground">{t('images.drop', { count: remaining })}</p>
      <Button size="xs" variant="outline" onClick={() => input.current?.click()}>
        {t('images.choose')}
      </Button>
      <input
        ref={input}
        type="file"
        multiple
        accept={STORE_IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )

  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        dropZone || <p className="text-sm text-muted-foreground">{t('images.none')}</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.key)} strategy={rectSortingStrategy} disabled={readOnly}>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {items.map((item, index) => (
                <SortableThumb key={item.key} id={item.key} disabled={readOnly}>
                  {(handle) => (
                    <Thumb
                      item={item}
                      image={item.id ? images.get(item.id) ?? item.image : null}
                      cover={showCover && index === 0}
                      handle={handle}
                      readOnly={readOnly}
                      saved={!!item.id && !!savedIds?.has(item.id)}
                      onRemove={() => remove(item.key)}
                    />
                  )}
                </SortableThumb>
              ))}
              {dropZone && <li>{dropZone}</li>}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <p className="text-xs text-muted-foreground">{t('images.rules', { max })}</p>
      {notice && <p className="text-xs text-tone-attention">{notice}</p>}
    </div>
  )
}

function SortableThumb({ id, disabled, children }: { id: string; disabled?: boolean; children: (handle: ReactNode) => ReactNode }) {
  const { t } = useTranslation('store')
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  const handle = disabled ? null : (
    <button
      ref={setActivatorNodeRef}
      type="button"
      className="cursor-grab rounded bg-white/90 p-0.5 text-brand-ink shadow-sm active:cursor-grabbing"
      aria-label={t('images.drag')}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-3.5" />
    </button>
  )
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn(isDragging && 'z-10 opacity-80')}>
      {children(handle)}
    </li>
  )
}

interface ThumbProps {
  item: GalleryItem
  image: StoreProductImageResponse | null
  cover: boolean
  handle: ReactNode
  readOnly?: boolean
  saved: boolean
  onRemove: () => void
}

function Thumb({ item, image, cover, handle, readOnly, saved, onRemove }: ThumbProps) {
  const { t } = useTranslation('store')
  const errorMessage = useErrorMessage()
  const queryClient = useQueryClient()
  const local = useMemo(() => (item.file ? URL.createObjectURL(item.file) : null), [item.file])
  useEffect(() => () => void (local && URL.revokeObjectURL(local)), [local])

  const reprocess = useAction({
    success: t('images.reprocessed'),
    mutationFn: (cleanWithAi: boolean) => storeImagesApi.reprocess(image!.id, cleanWithAi),
    onSuccess: (next) => queryClient.setQueryData(storeProductKeys.image(next.id), next),
  })

  const uploading = !item.id && !item.uploadError
  const pending = uploading || image?.status === 'Pending'
  const failed = image?.status === 'Failed' || !!item.uploadError
  const warning = image?.status === 'Ready' && image.error ? image.error : null
  const templated = fileUrl(image?.imageUrl)
  // The original is never the product picture: before the template is ready only the local file
  // (this browser's own upload) is shown, dimmed, as a hint of what is processing.
  const src = templated ?? (local && !failed ? local : undefined)
  const failure = item.uploadError ? errorMessage(item.uploadError) : image?.error || t('images.failed')
  const reprocessError = reprocess.error ? errorMessage(reprocess.error) : null

  return (
    <div className={cn('group relative aspect-square overflow-hidden rounded-lg border bg-gradient-to-b from-white to-brand-wash', failed && 'border-destructive/50')}>
      {src && <img src={src} alt="" className={cn('size-full object-cover', !templated && 'opacity-40 blur-[1px]')} />}

      {pending && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-brand-deep/75 py-1 text-[11px] text-white">
          <Loader2 className="size-3 animate-spin" />
          {uploading ? t('images.uploading') : t('images.processing')}
        </div>
      )}
      {pending && <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-brand-teal" />}

      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-center text-[11px] text-destructive">
          <XCircle className="size-5" />
          <span className="line-clamp-3">{failure}</span>
        </div>
      )}

      <div className="absolute inset-x-1 top-1 flex items-start justify-between gap-1">
        <span className="flex items-center gap-1">
          {handle}
          {cover && <span className="rounded bg-brand-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">{t('images.cover')}</span>}
        </span>
        <span className="flex items-center gap-1">
          {image?.aiCleaned && (
            <Tooltip content={t('images.aiCleaned')}>
              <span className="rounded bg-brand-mint p-0.5 text-brand-deep">
                <Sparkles className="size-3" />
              </span>
            </Tooltip>
          )}
          {warning && (
            <Tooltip content={t('images.warning', { error: warning })}>
              <span className="rounded bg-brand-yellow p-0.5 text-brand-ink" aria-label={t('images.warning', { error: warning })}>
                <AlertTriangle className="size-3" />
              </span>
            </Tooltip>
          )}
          {/* Read-only forms sit in a disabled fieldset: a plain link keeps the original reachable for staff. */}
          {readOnly && image?.sourceUrl && (
            <a
              href={fileUrl(image.sourceUrl)}
              target="_blank"
              rel="noreferrer"
              className="rounded bg-white/90 p-0.5 text-brand-ink shadow-sm"
              title={t('images.viewSource')}
              aria-label={t('images.viewSource')}
            >
              <ExternalLink className="size-3.5" />
            </a>
          )}
          {!readOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="rounded bg-white/90 p-0.5 text-brand-ink shadow-sm" aria-label={t('images.menu')}>
                  {reprocess.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <MoreVertical className="size-3.5" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!readOnly && image && (
                  <>
                    <DropdownMenuItem onSelect={() => reprocess.mutate(true)}>
                      <Sparkles /> {t('images.reprocessClean')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => reprocess.mutate(false)}>
                      <RefreshCw /> {t('images.reprocessPlain')}
                    </DropdownMenuItem>
                  </>
                )}
                {image?.sourceUrl && (
                  <DropdownMenuItem asChild>
                    <a href={fileUrl(image.sourceUrl)} target="_blank" rel="noreferrer">
                      <ExternalLink /> {t('images.viewSource')}
                    </a>
                  </DropdownMenuItem>
                )}
                {!readOnly && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem destructive onSelect={onRemove}>
                      <Trash2 /> {saved ? t('images.removeSaved') : t('images.remove')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </span>
      </div>
      {reprocessError && <p className="absolute inset-x-0 bottom-0 bg-destructive px-1 py-0.5 text-[10px] text-white">{reprocessError}</p>}
    </div>
  )
}
