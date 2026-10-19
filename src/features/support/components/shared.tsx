import { FileText, ImagePlus, Paperclip, X } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { fileUrl } from '@/api/files'
import type { SupportAttachmentResponse, SupportMessageResponse } from '@/api/types'
import { DateTime } from '@/components/Format'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { addFiles, namePastedFile, SUPPORT_FILE_EXTENSIONS, SUPPORT_MAX_FILES, type FileProblem } from '../logic'
import '../i18n'

const isImage = (a: SupportAttachmentResponse) => a.contentType.startsWith('image/')

/** Thumbnails that open the full file in a new tab; PDFs as a named icon. */
export function Attachments({ items, className }: { items: readonly SupportAttachmentResponse[]; className?: string }) {
  const { t } = useTranslation('support')
  if (!items.length) return null
  return (
    <ul className={cn('flex flex-wrap gap-2', className)}>
      {items.map((a) => (
        <li key={a.id}>
          <a
            href={fileUrl(a.url)}
            target="_blank"
            rel="noreferrer"
            title={a.fileName}
            aria-label={t('files.open', { name: a.fileName })}
            className="flex size-20 items-center justify-center overflow-hidden rounded-md border bg-muted hover:ring-2 hover:ring-primary/40"
          >
            {isImage(a) ? (
              <img src={fileUrl(a.url)} alt={a.fileName} loading="lazy" className="size-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 px-1 text-center">
                <FileText className="size-6 text-muted-foreground" />
                <span className="line-clamp-2 break-all text-[0.625rem] text-muted-foreground">{a.fileName}</span>
              </span>
            )}
          </a>
        </li>
      ))}
    </ul>
  )
}

/**
 * Up to 5 files (jpg/png/webp/pdf, ≤ 5 MB), checked before the multipart request: picked, dropped on the zone, or
 * pasted (a screenshot) anywhere inside the surrounding form or dialog.
 */
export function FilePicker({ files, onChange, disabled }: { files: File[]; onChange: (files: File[]) => void; disabled?: boolean }) {
  const { t } = useTranslation('support')
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [problem, setProblem] = useState<FileProblem | null>(null)
  const [dragging, setDragging] = useState(false)
  const latest = useRef({ files, onChange, disabled })
  latest.current = { files, onChange, disabled }

  const add = (incoming: File[]) => {
    const { files: current, onChange: change, disabled: off } = latest.current
    if (off || !incoming.length) return
    const result = addFiles(current, incoming)
    setProblem(result.problem)
    change(result.files)
  }

  // Ctrl+V of a screenshot while typing in the same form/dialog. Text pastes pass through untouched.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const scope = root.current?.closest('form, [role=dialog]') ?? root.current
      if (!scope || !(e.target instanceof Node) || !scope.contains(e.target)) return
      const pasted = Array.from(e.clipboardData?.files ?? [])
      if (!pasted.length) return
      e.preventDefault()
      add(pasted.map((f) => namePastedFile(f)))
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    add(Array.from(e.dataTransfer.files))
  }

  return (
    <div ref={root} className="space-y-2">
      <div
        tabIndex={disabled ? -1 : 0}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-wrap items-center gap-3 rounded-lg border border-dashed px-3 py-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
          dragging ? 'border-primary bg-primary-soft' : 'bg-muted/30',
        )}
      >
        <Button type="button" variant="outline" size="sm" disabled={disabled || files.length >= SUPPORT_MAX_FILES} onClick={() => input.current?.click()}>
          <Paperclip /> {t('files.attach')}
        </Button>
        <span className="flex-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ImagePlus className="size-3.5" aria-hidden /> {t('files.drop')}
          </span>
          <span className="block">{t('files.hint')}</span>
        </span>
        <input
          ref={input}
          type="file"
          multiple
          accept={SUPPORT_FILE_EXTENSIONS.join(',')}
          className="hidden"
          onChange={(e) => {
            add(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
        />
      </div>
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <PickedFile key={`${f.name}-${i}`} file={f} disabled={disabled} onRemove={() => onChange(files.filter((_, j) => j !== i))} />
          ))}
        </ul>
      )}
      {problem && (
        <p role="alert" className="text-xs text-destructive">
          {t(`files.problem.${problem}`)}
        </p>
      )}
    </div>
  )
}

function PickedFile({ file, disabled, onRemove }: { file: File; disabled?: boolean; onRemove: () => void }) {
  const { t } = useTranslation('support')
  const image = file.type.startsWith('image/')
  // Created and revoked in the same effect: StrictMode's mount/unmount/mount must not leave a revoked URL.
  const [preview, setPreview] = useState<string | null>(null)
  useEffect(() => {
    if (!image) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file, image])
  return (
    <li className="relative">
      <div className="flex size-16 items-center justify-center overflow-hidden rounded-md border bg-muted" title={file.name}>
        {preview ? (
          <img src={preview} alt={file.name} className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-0.5 px-1 text-center">
            <FileText className="size-5 text-muted-foreground" />
            <span className="line-clamp-2 break-all text-[0.5625rem] text-muted-foreground">{file.name}</span>
          </span>
        )}
      </div>
      <button
        type="button"
        className="absolute -end-1.5 -top-1.5 rounded-full bg-foreground p-0.5 text-background disabled:opacity-50"
        onClick={onRemove}
        aria-label={t('files.remove', { name: file.name })}
        disabled={disabled}
      >
        <X className="size-3" />
      </button>
    </li>
  )
}

/** One message: mine on one side, "فريق الدعم" on the other. */
export function MessageBubble({ message, own, author }: { message: SupportMessageResponse; own: boolean; author: ReactNode }) {
  return (
    <li className={cn('flex', own ? 'justify-start' : 'justify-end')}>
      <div className={cn('max-w-[85%] rounded-lg border px-3 py-2 text-sm shadow-sm', own ? 'bg-primary-soft/60' : 'bg-surface')}>
        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{author}</span>
          <DateTime value={message.createdAt} />
        </div>
        {message.body && (
          <p className="whitespace-pre-wrap break-words" dir="auto">
            {message.body}
          </p>
        )}
        <Attachments items={message.attachments} className={message.body ? 'mt-2' : undefined} />
      </div>
    </li>
  )
}

/** The opening description and its files, at the top of the conversation. */
export function DescriptionBlock({ createdAt, description, attachments }: { createdAt: string; description: string; attachments: readonly SupportAttachmentResponse[] }) {
  const { t } = useTranslation('support')
  return (
    <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{t('detail.description')}</span>
        <span>· {t('you')}</span>
        <DateTime value={createdAt} />
      </div>
      <p className="whitespace-pre-wrap break-words" dir="auto">
        {description}
      </p>
      <Attachments items={attachments} className="mt-2" />
    </div>
  )
}
