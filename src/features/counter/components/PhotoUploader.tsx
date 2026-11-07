import { useQueryClient } from '@tanstack/react-query'
import { Camera, ImagePlus } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { MAX_UPLOAD_BYTES } from '@/api/files'
import type { CounterItemDetailResponse } from '@/api/types'
import { InlineError } from '@/components/States'
import { Button } from '@/components/ui/button'
import { i18next } from '@/i18n'
import { COUNTER_INVALIDATION, counterApi } from '../api'
import { batches } from '../logic'
import '../i18n'

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ACCEPT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'

/**
 * Intake photos (phase 2 §4 step 3): pick from the gallery or take one with the camera (`capture`), checked here
 * (JPG/PNG/WEBP, 5 MB) then sent in batches of ten. Each upload returns the item, which replaces the cached detail.
 */
export function PhotoUploader({ itemId, deviceId, onUploaded, size = 'lg' }: { itemId: string; deviceId?: string | null; onUploaded?: (detail: CounterItemDetailResponse) => void; size?: 'lg' | 'sm' }) {
  const { t } = useTranslation('counter')
  const queryClient = useQueryClient()
  const pick = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const upload = async (list: FileList | null) => {
    const files = Array.from(list ?? [])
    if (pick.current) pick.current.value = ''
    if (camera.current) camera.current.value = ''
    if (!files.length) return
    setError(null)
    const bad = files.find((f) => !PHOTO_TYPES.includes(f.type) || f.size > MAX_UPLOAD_BYTES)
    if (bad) {
      setError(new Error(bad.size > MAX_UPLOAD_BYTES ? i18next.t('errors.uploadTooLarge') : i18next.t('errors.uploadBadExtension')))
      return
    }
    setBusy(true)
    try {
      let last: CounterItemDetailResponse | null = null
      for (const group of batches(files)) last = await counterApi.uploadPhotos(itemId, group, deviceId)
      if (last) {
        onUploaded?.(last)
        toast.success(t('done.uploaded'))
      }
      await Promise.all(COUNTER_INVALIDATION.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size={size} onClick={() => camera.current?.click()} loading={busy} className={size === 'lg' ? 'h-12 px-5 text-base' : undefined}>
          <Camera /> {t('done.takePhoto')}
        </Button>
        <Button size={size} variant="outline" onClick={() => pick.current?.click()} disabled={busy} className={size === 'lg' ? 'h-12 px-5 text-base' : undefined}>
          <ImagePlus /> {t('done.addPhotos')}
        </Button>
      </div>
      {busy && <p className="text-xs text-muted-foreground">{t('done.uploading')}</p>}
      <input ref={pick} type="file" accept={ACCEPT} multiple className="hidden" onChange={(e) => void upload(e.target.files)} />
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void upload(e.target.files)} />
      <InlineError error={error} />
    </div>
  )
}
