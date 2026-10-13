import { FileText, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { InlineError } from '@/components/States'
import { fileUrl, IMAGE_ACCEPT, isPdf, UPLOAD_ACCEPT, validateUpload } from '@/api/files'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  /** Current file URL (relative server path is fine). */
  currentUrl?: string | null
  /** Performs the upload; the component validates size/extension first. */
  onUpload: (file: File) => Promise<unknown>
  imagesOnly?: boolean
  className?: string
  label?: string
}

/** Validates client-side (5 MB, allowed extensions — §3.5) before sending. */
export function FileUpload({ currentUrl, onUpload, imagesOnly = true, className, label }: FileUploadProps) {
  const { t } = useTranslation()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const url = fileUrl(currentUrl)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    const problem = validateUpload(file, imagesOnly ? ['.jpg', '.jpeg', '.png', '.webp', '.gif'] : undefined)
    if (problem) {
      setError(new Error(problem === 'TooLarge' ? t('errors.uploadTooLarge') : t('errors.uploadBadExtension')))
      return
    }
    setBusy(true)
    try {
      await onUpload(file)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
          {url ? (
            isPdf(url) ? (
              <FileText className="size-6 text-muted-foreground" />
            ) : (
              <img src={url} alt="" loading="lazy" className="size-full object-cover" />
            )
          ) : (
            <Upload className="size-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Button variant="outline" size="sm" loading={busy} onClick={() => input.current?.click()}>
            <Upload /> {label ?? (url ? t('actions.replace') : t('actions.upload'))}
          </Button>
          <span className="text-xs text-muted-foreground">{imagesOnly ? 'jpg · png · webp · gif' : 'jpg · png · webp · gif · pdf'} — ≤ 5MB</span>
        </div>
        <input ref={input} type="file" accept={imagesOnly ? IMAGE_ACCEPT : UPLOAD_ACCEPT} className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
      </div>
      <InlineError error={error} />
    </div>
  )
}
