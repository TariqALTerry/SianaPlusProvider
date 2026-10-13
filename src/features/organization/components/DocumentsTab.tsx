import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ExternalLink, FileText, FileUp, Lock, Paperclip, Trash2, Upload } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fileUrl, isPdf, UPLOAD_ACCEPT, validateUpload } from '@/api/files'
import { qk } from '@/api/keys'
import type { ProviderDocumentResponse, ProviderDocumentType } from '@/api/types'
import { ActionDialog, ConfirmDialog } from '@/components/ActionDialog'
import { DateTime } from '@/components/Format'
import { EmptyState, ErrorState } from '@/components/States'
import { EnumText, StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { enumLabel, enumOptions } from '@/i18n/enums'
import { riyadhDateToIso } from '@/lib/format'
import { organizationApi, organizationKeys, type UploadDocumentInput } from '../api'
import { canDeleteDocument, expiryState } from '../logic'

/** الوثائق (§8.9): list, upload (multipart), delete while Pending/Rejected. */
export function DocumentsTab() {
  const { t } = useTranslation('organization')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleting, setDeleting] = useState<ProviderDocumentResponse | null>(null)

  const query = useQuery({
    queryKey: organizationKeys.documents,
    queryFn: ({ signal }) => organizationApi.documents(signal),
  })

  const docs = query.data ?? []

  return (
    <Card>
      <CardHeader
        title={t('documents.title')}
        description={t('documents.hint')}
        actions={
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload /> {t('documents.upload')}
          </Button>
        }
      />
      <CardBody>
        {query.isPending ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }, (_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
        ) : docs.length === 0 ? (
          <EmptyState
            icon={<FileUp className="size-5" />}
            title={t('documents.empty')}
            description={t('documents.emptyHint')}
            action={
              <Button onClick={() => setUploadOpen(true)}>
                <Upload /> {t('documents.upload')}
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {docs.map((doc) => (
              <li key={doc.id}>
                <DocumentCard doc={doc} onDelete={() => setDeleting(doc)} />
              </li>
            ))}
          </ul>
        )}
      </CardBody>

      <UploadDocumentDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <DeleteDocumentDialog doc={deleting} onClose={() => setDeleting(null)} />
    </Card>
  )
}

function DocumentCard({ doc, onDelete }: { doc: ProviderDocumentResponse; onDelete: () => void }) {
  const { t } = useTranslation('organization')
  const { lang } = useLang()
  const url = fileUrl(doc.url)
  const pdf = url ? isPdf(url) : false
  const expiry = doc.status === 'Expired' ? null : expiryState(doc.expiresAt)
  const deletable = canDeleteDocument(doc.status)

  return (
    <article className="flex h-full gap-3 rounded-lg border bg-surface p-3">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted"
        aria-label={`${t('documents.open')}: ${enumLabel('ProviderDocumentType', doc.type, lang)}`}
      >
        {url && !pdf ? <img src={url} alt="" loading="lazy" className="size-full object-cover" /> : <FileText className="size-6 text-muted-foreground" />}
      </a>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-medium">
            <EnumText enum="ProviderDocumentType" value={doc.type} />
          </h4>
          <StatusBadge enum="ProviderDocumentStatus" value={doc.status} />
        </div>
        <dl className="space-y-0.5 text-xs text-muted-foreground">
          {doc.documentNumber && (
            <div className="flex gap-1">
              <dt>{t('documents.number')}:</dt>
              <dd>
                <bdi className="font-latin tabular text-foreground">{doc.documentNumber}</bdi>
              </dd>
            </div>
          )}
          {doc.expiresAt && (
            <div className="flex flex-wrap items-center gap-1">
              <dt>{t('documents.expires')}:</dt>
              <dd className="flex flex-wrap items-center gap-1.5">
                <DateTime value={doc.expiresAt} mode="date" className="text-foreground" />
                {expiry?.kind === 'soon' && (
                  <Badge tone="waiting">
                    <AlertTriangle className="size-3" aria-hidden /> {t('documents.expiresSoon', { count: expiry.days })}
                  </Badge>
                )}
                {expiry?.kind === 'expired' && <Badge tone="danger">{t('documents.expiredDate')}</Badge>}
              </dd>
            </div>
          )}
          <div className="flex gap-1">
            <dt>{t('documents.uploadedAt')}:</dt>
            <dd>
              <DateTime value={doc.uploadedAt} />
            </dd>
          </div>
        </dl>
        {doc.status === 'Rejected' && doc.reviewNotes && (
          <div className="rounded-md border border-destructive/30 bg-destructive-soft px-2.5 py-1.5 text-xs text-destructive">
            <span className="font-medium">{t('documents.reviewNotes')}: </span>
            <span className="whitespace-pre-line">{doc.reviewNotes}</span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          {url && (
            <Button asChild variant="ghost" size="xs">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink /> {t('documents.open')}
              </a>
            </Button>
          )}
          {deletable ? (
            <Button variant="ghost" size="xs" className="text-destructive hover:bg-destructive-soft" onClick={onDelete}>
              <Trash2 /> {t('documents.delete')}
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 text-xs text-muted-foreground" title={t('documents.locked')}>
              <Lock className="size-3" aria-hidden />
              <span className="sr-only sm:not-sr-only">{t('documents.locked')}</span>
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

function UploadDocumentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('organization')
  const { lang } = useLang()
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [type, setType] = useState<ProviderDocumentType>('CommercialRegistration')
  const [number, setNumber] = useState('')
  const [expires, setExpires] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [tried, setTried] = useState(false)

  const upload = useAction<UploadDocumentInput, ProviderDocumentResponse>({
    mutationFn: organizationApi.uploadDocument,
    invalidate: [qk.organization],
    success: t('documents.uploaded'),
    onSuccess: () => onOpenChange(false),
  })

  useEffect(() => {
    if (!open) return
    setType('CommercialRegistration')
    setNumber('')
    setExpires('')
    setFile(null)
    setFileError(null)
    setTried(false)
  }, [open])

  const pick = (picked: File | undefined) => {
    if (!picked) return
    const problem = validateUpload(picked)
    if (problem) {
      setFile(null)
      setFileError(problem === 'TooLarge' ? t('common:errors.uploadTooLarge') : t('common:errors.uploadBadExtension'))
    } else {
      setFile(picked)
      setFileError(null)
    }
    if (input.current) input.current.value = ''
  }

  const submit = () => {
    setTried(true)
    if (!file) return
    upload.mutate({ file, type, documentNumber: number.trim() || null, expiresAt: riyadhDateToIso(expires, 'end') })
  }

  const missingFile = tried && !file && !fileError

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('documents.uploadTitle')}
      description={t('documents.hint')}
      confirmLabel={
        <>
          <Upload /> {t('documents.upload')}
        </>
      }
      submitting={upload.isPending}
      error={upload.error}
      onSubmit={submit}
    >
      <Field label={t('documents.type')} htmlFor={`${id}-type`} required>
        <Select id={`${id}-type`} value={type} onChange={(e) => setType(e.target.value as ProviderDocumentType)}>
          {enumOptions('ProviderDocumentType').map((v) => (
            <option key={v} value={v}>
              {enumLabel('ProviderDocumentType', v, lang)}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('documents.number')} htmlFor={`${id}-number`} optional>
          <Input id={`${id}-number`} dir="ltr" className="font-latin text-start tabular" maxLength={100} value={number} onChange={(e) => setNumber(e.target.value)} />
        </Field>
        <Field label={t('documents.expiresAt')} htmlFor={`${id}-expires`} optional>
          <Input id={`${id}-expires`} type="date" dir="ltr" className="text-start" value={expires} onChange={(e) => setExpires(e.target.value)} />
        </Field>
      </div>
      <Field
        label={t('documents.file')}
        htmlFor={`${id}-file`}
        required
        hint={t('documents.fileHint')}
        error={fileError ?? (missingFile ? t('common:validation.required') : undefined)}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => input.current?.click()} aria-describedby={`${id}-file-name`}>
            <Paperclip /> {file ? t('documents.changeFile') : t('documents.chooseFile')}
          </Button>
          <span id={`${id}-file-name`} className="min-w-0 truncate text-sm" dir="auto">
            {file?.name}
          </span>
          <input id={`${id}-file`} ref={input} type="file" accept={UPLOAD_ACCEPT} className="sr-only" tabIndex={-1} onChange={(e) => pick(e.target.files?.[0])} />
        </div>
      </Field>
    </ActionDialog>
  )
}

function DeleteDocumentDialog({ doc, onClose }: { doc: ProviderDocumentResponse | null; onClose: () => void }) {
  const { t } = useTranslation('organization')
  const { lang } = useLang()
  const remove = useAction<string, string>({
    mutationFn: organizationApi.deleteDocument,
    invalidate: [qk.organization],
    success: t('documents.deleted'),
    onSuccess: onClose,
  })
  return (
    <ConfirmDialog
      open={!!doc}
      onOpenChange={(o) => !o && onClose()}
      title={t('documents.deleteTitle')}
      description={t('documents.deleteText')}
      target={doc ? [enumLabel('ProviderDocumentType', doc.type, lang), doc.documentNumber].filter(Boolean).join(' · ') : null}
      confirmLabel={t('documents.delete')}
      destructive
      submitting={remove.isPending}
      error={remove.error}
      onSubmit={() => doc && remove.mutate(doc.id)}
    />
  )
}
