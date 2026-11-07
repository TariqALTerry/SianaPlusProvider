import { Camera, ClipboardCheck, Tag } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { MAX_UPLOAD_BYTES } from '@/api/files'
import { toApiError } from '@/api/http'
import { qk } from '@/api/keys'
import type { DeviceResponse, IntakeAccessory, IntakeCondition } from '@/api/types'
import { ActionDialog } from '@/components/ActionDialog'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useAction } from '@/hooks/useAction'
import { i18next } from '@/i18n'
import { printPdf } from '@/lib/pdf'
import { counterApi } from '../api'
import { ACCESSORIES, CONDITIONS, INTAKE_LIMITS, MAX_PHOTOS_PER_UPLOAD, toggleFlag } from '../logic'
import { FlagChips } from './FlagChips'
import '../i18n'

interface Target {
  id: string
  itemNumber: string | null
}

/**
 * A platform (pickup and delivery) device that reached the branch (phase 2 §12): the light receipt — accessories,
 * condition and photos — then the label. Shown on the work item once the device is at the branch.
 */
export function PlatformIntakeDialog({ item, device, open, onOpenChange }: { item: Target; device: DeviceResponse | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('counter')
  const uid = useId()
  const input = useRef<HTMLInputElement>(null)
  const [accessories, setAccessories] = useState<IntakeAccessory[]>([])
  const [conditions, setConditions] = useState<IntakeCondition[]>([])
  const [accessoriesNote, setAccessoriesNote] = useState('')
  const [conditionNotes, setConditionNotes] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState<string | null>(null)

  const action = useAction({
    mutationFn: () =>
      counterApi.platformIntake(item.id, device!.id, {
        accessories,
        conditions,
        accessoriesNote: accessoriesNote.trim() || null,
        conditionNotes: conditionNotes.trim() || null,
        files,
      }),
    invalidate: [qk.work, qk.workshop, qk.counter],
    success: (r) => t('platform.saved', { number: r.intakeNumber }),
    onSuccess: () => {
      onOpenChange(false)
      if (device) void printPdf(() => counterApi.deviceLabel(item.id, device.id)).catch(() => undefined)
    },
  })
  const { reset } = action
  useEffect(() => {
    if (open) {
      setAccessories([])
      setConditions([])
      setAccessoriesNote('')
      setConditionNotes('')
      setFiles([])
      setFileError(null)
      reset()
    }
  }, [open, reset])

  const pick = (list: FileList | null) => {
    const picked = Array.from(list ?? [])
    if (input.current) input.current.value = ''
    const bad = picked.find((f) => !/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > MAX_UPLOAD_BYTES)
    if (bad) {
      setFileError(bad.size > MAX_UPLOAD_BYTES ? i18next.t('errors.uploadTooLarge') : i18next.t('errors.uploadBadExtension'))
      return
    }
    setFileError(null)
    setFiles((f) => [...f, ...picked].slice(0, MAX_PHOTOS_PER_UPLOAD))
  }

  return (
    <ActionDialog
      open={open && !!device}
      onOpenChange={onOpenChange}
      size="lg"
      title={t('platform.title')}
      description={t('platform.hint')}
      target={[item.itemNumber, device ? [device.name, device.brand, device.model].filter(Boolean).join(' ') : null].filter(Boolean).join(' · ')}
      submitting={action.isPending}
      error={action.error}
      confirmLabel={t('platform.action')}
      onSubmit={() => action.mutate(undefined)}
    >
      <div className="space-y-2">
        <p className="text-sm font-medium">{t('wizard.accessories')}</p>
        <FlagChips enum="IntakeAccessory" values={ACCESSORIES} selected={accessories} onToggle={(v) => setAccessories((a) => toggleFlag(a, v, ACCESSORIES))} label={t('wizard.accessories')} />
      </div>
      <Field label={t('wizard.accessoriesNote')} htmlFor={`${uid}-anote`} optional>
        <Input id={`${uid}-anote`} value={accessoriesNote} maxLength={INTAKE_LIMITS.accessoriesNote} onChange={(e) => setAccessoriesNote(e.target.value)} />
      </Field>
      <div className="space-y-2">
        <p className="text-sm font-medium">{t('wizard.conditions')}</p>
        <FlagChips enum="IntakeCondition" values={CONDITIONS} selected={conditions} onToggle={(v) => setConditions((c) => toggleFlag(c, v, CONDITIONS))} label={t('wizard.conditions')} />
      </div>
      <Field label={t('wizard.conditionNotes')} htmlFor={`${uid}-cnote`} optional>
        <Textarea id={`${uid}-cnote`} dir="auto" rows={2} value={conditionNotes} maxLength={INTAKE_LIMITS.conditionNotes} onChange={(e) => setConditionNotes(e.target.value)} />
      </Field>
      <div className="space-y-2">
        <p className="text-sm font-medium">{t('platform.files')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => input.current?.click()}>
            <Camera /> {t('done.addPhotos')}
          </Button>
          <span className="tabular text-xs text-muted-foreground">
            {files.length} / {MAX_PHOTOS_PER_UPLOAD}
          </span>
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple capture="environment" className="hidden" onChange={(e) => pick(e.target.files)} />
        {fileError && <p className="text-xs text-destructive">{fileError}</p>}
        {files.length > 0 && <p className="truncate text-xs text-muted-foreground">{files.map((f) => f.name).join('، ')}</p>}
      </div>
    </ActionDialog>
  )
}

/** "سند الوصول" or, once recorded, the receipt number and "الملصق" — the actions of one platform device at a branch. */
export function PlatformDeviceActions({ item, device, onIntake }: { item: Target; device: DeviceResponse; onIntake: () => void }) {
  const { t } = useTranslation('counter')
  const [printing, setPrinting] = useState(false)
  if (device.intakeNumber) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{t('platform.hasIntake', { number: device.intakeNumber })}</span>
        <Button
          size="xs"
          variant="outline"
          loading={printing}
          onClick={() => {
            setPrinting(true)
            printPdf(() => counterApi.deviceLabel(item.id, device.id))
              .catch((e) => toast.error(toApiError(e).message || t('item.pdfFailed')))
              .finally(() => setPrinting(false))
          }}
        >
          <Tag /> {t('platform.label')}
        </Button>
      </span>
    )
  }
  if (device.custodyStage !== 'AtWorkshop') return null
  return (
    <Button size="xs" onClick={onIntake}>
      <ClipboardCheck /> {t('platform.action')}
    </Button>
  )
}
