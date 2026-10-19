import { CheckCircle2 } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { SupportTicketCategory, SupportTicketPriority, SupportTicketResponse } from '@/api/types'
import { ActionDialog } from '@/components/ActionDialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { enumLabel, enumOptions } from '@/i18n/enums'
import { SUPPORT_INVALIDATION, supportApi, type NewTicketInput } from '../api'
import { BODY_MAX, SUBJECT_MAX, SUPPORT_CATEGORIES } from '../logic'
import { FilePicker } from './shared'
import '../i18n'

export interface TicketServiceItem {
  id: string
  /** `SI-10053-2 · صيانة غسالة`, restated in the form. */
  label: string
}

/**
 * "تذكرة جديدة": subject, description, category, priority and screenshots (picked, dropped or pasted). From a work item
 * ("مشكلة في هذه الخدمة") the item is linked. On success the dialog shows the reference number.
 */
export function NewTicketDialog({ open, onOpenChange, serviceItem }: { open: boolean; onOpenChange: (open: boolean) => void; serviceItem?: TicketServiceItem }) {
  const { t } = useTranslation('support')
  const { lang } = useLang()
  const ids = { subject: useId(), description: useId(), category: useId(), priority: useId() }
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<SupportTicketCategory | ''>('')
  const [priority, setPriority] = useState<SupportTicketPriority | ''>('')
  const [files, setFiles] = useState<File[]>([])
  const [created, setCreated] = useState<SupportTicketResponse | null>(null)

  const create = useAction({
    mutationFn: (input: NewTicketInput) => supportApi.create(input),
    invalidate: SUPPORT_INVALIDATION,
    onSuccess: (ticket) => setCreated(ticket),
  })

  useEffect(() => {
    if (!open) return
    setSubject('')
    setDescription('')
    setCategory('')
    setPriority('')
    setFiles([])
    setCreated(null)
    create.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (created) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="sr-only">{t('new')}</DialogTitle>
            <DialogDescription className="sr-only">{t('sentHint')}</DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle2 className="size-10 text-tone-success" aria-hidden />
            <p className="text-base font-semibold" role="status">
              {t('sent', { number: created.ticketNumber })}
            </p>
            <p className="text-sm text-muted-foreground">{t('sentHint')}</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('form.done')}
            </Button>
            <Button asChild>
              <Link to={`/support/${created.id}`} onClick={() => onOpenChange(false)}>
                {t('form.viewTicket')}
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const invalid = !subject.trim() || !description.trim() || !category || subject.length > SUBJECT_MAX || description.length > BODY_MAX

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={serviceItem ? t('fromItem') : t('new')}
      description={t('description')}
      target={serviceItem ? `${t('form.item')}: ${serviceItem.label}` : undefined}
      confirmLabel={t('form.send')}
      size="lg"
      submitting={create.isPending}
      submitDisabled={invalid}
      error={create.error}
      onSubmit={() =>
        category && create.mutate({ subject, description, category, priority, serviceItemId: serviceItem?.id ?? null, files })
      }
    >
      <Field label={t('form.subject')} htmlFor={ids.subject} required hint={`${subject.length}/${SUBJECT_MAX}`}>
        <Input id={ids.subject} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={SUBJECT_MAX} placeholder={t('form.subjectPlaceholder')} dir="auto" autoFocus />
      </Field>
      <Field label={t('form.description')} htmlFor={ids.description} required hint={`${description.length}/${BODY_MAX}`}>
        <Textarea
          id={ids.description}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={BODY_MAX}
          rows={5}
          placeholder={t('form.descriptionPlaceholder')}
          dir="auto"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('form.category')} htmlFor={ids.category} required>
          <Select id={ids.category} value={category} onChange={(e) => setCategory(e.target.value as SupportTicketCategory | '')}>
            <option value="" disabled>
              —
            </option>
            {SUPPORT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {enumLabel('SupportTicketCategory', c, lang)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('form.priority')} htmlFor={ids.priority} optional>
          <Select id={ids.priority} value={priority} onChange={(e) => setPriority(e.target.value as SupportTicketPriority | '')}>
            <option value="">{t('form.priorityDefault')}</option>
            {enumOptions('SupportTicketPriority')
              .filter((p) => p !== 'Normal')
              .map((p) => (
                <option key={p} value={p}>
                  {enumLabel('SupportTicketPriority', p, lang)}
                </option>
              ))}
          </Select>
        </Field>
      </div>
      <Field label={t('form.attachments')} optional>
        <FilePicker files={files} onChange={setFiles} disabled={create.isPending} />
      </Field>
    </ActionDialog>
  )
}
