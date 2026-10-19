import { ImagePlus, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { validateUpload } from '@/api/files'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/label'
import '../i18n'

/** What the tracking endpoints accept (`TrackingPhotoInvalid` otherwise): no gif, no pdf. */
export const TRACKING_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const

/** One photo kept locally until the dialog submits it with the form (`file` field). */
export function ImagePicker({
  file,
  onChange,
  label,
  required,
}: {
  file: File | null
  onChange: (file: File | null) => void
  label: string
  required?: boolean
}) {
  const { t } = useTranslation('workshop')
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [invalid, setInvalid] = useState(false)
  // Created and revoked in the same effect: StrictMode's mount/unmount/mount must not leave a revoked URL.
  const [preview, setPreview] = useState<string | null>(null)
  useEffect(() => {
    if (!file) return setPreview(null)
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <Field label={label} htmlFor={id} required={required} optional={!required} hint={t('tracking.imageHint')} error={invalid ? t('tracking.imageInvalid') : undefined}>
      <input
        ref={input}
        id={id}
        type="file"
        accept={TRACKING_IMAGE_EXTENSIONS.join(',')}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          const bad = validateUpload(f, TRACKING_IMAGE_EXTENSIONS)
          setInvalid(!!bad)
          if (!bad) onChange(f)
        }}
      />
      {preview ? (
        <div className="relative inline-block self-start">
          <img src={preview} alt="" className="h-24 rounded-md border object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -end-2 -top-2 rounded-full bg-foreground p-0.5 text-background"
            aria-label={t('tracking.removeImage')}
          >
            <X className="size-3" />
          </button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => input.current?.click()}>
          <ImagePlus /> {t('tracking.chooseImage')}
        </Button>
      )}
    </Field>
  )
}
