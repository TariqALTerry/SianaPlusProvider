import { CameraOff, Search, SwitchCamera } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { scanToSearch } from '../logic'
import '../i18n'

type CameraState = 'starting' | 'live' | 'denied' | 'none'

interface ScanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The code read (or typed), already turned into a search term. */
  onResult: (search: string) => void
}

/**
 * Reads the device label / receipt QR (both hold the intake number) from the webcam with `@zxing/browser` (QR and the
 * usual 1D barcodes), loaded only when this dialog opens. Typing the number is always possible.
 */
export function ScanDialog({ open, onOpenChange, onResult }: ScanDialogProps) {
  const { t } = useTranslation('counter')
  const uid = useId()
  const video = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<CameraState>('starting')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceIndex, setDeviceIndex] = useState(0)
  const [manual, setManual] = useState('')

  useEffect(() => {
    if (!open) return
    setManual('')
    let stop: (() => void) | null = null
    let cancelled = false
    setState('starting')

    void (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState('none')
        return
      }
      try {
        const { BrowserMultiFormatReader, BrowserCodeReader } = await import('@zxing/browser')
        const cams = await BrowserCodeReader.listVideoInputDevices().catch(() => [] as MediaDeviceInfo[])
        if (cancelled) return
        setDevices(cams)
        // Prefer the back camera on tablets; the user can switch.
        const preferred = cams.findIndex((c) => /back|rear|environment|خلف/i.test(c.label))
        const index = deviceIndex < cams.length ? deviceIndex : Math.max(0, preferred)
        const reader = new BrowserMultiFormatReader()
        let live: { stop: () => void } | null = null
        const controls = await reader.decodeFromVideoDevice(cams[index]?.deviceId, video.current ?? undefined, (result) => {
          if (!result || cancelled) return
          const term = scanToSearch(result.getText())
          if (!term) return
          cancelled = true
          live?.stop()
          onResult(term)
        })
        if (cancelled) {
          controls.stop()
          return
        }
        live = controls
        stop = () => controls.stop()
        setState('live')
      } catch (e) {
        if (cancelled) return
        const name = (e as { name?: string } | null)?.name
        setState(name === 'NotFoundError' || name === 'OverconstrainedError' ? 'none' : 'denied')
      }
    })()

    return () => {
      cancelled = true
      stop?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deviceIndex])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const term = scanToSearch(manual)
    if (term) onResult(term)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{t('scanner.title')}</DialogTitle>
          <DialogDescription>{t('scanner.hint')}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
            <video ref={video} className="size-full object-cover" muted playsInline aria-label={t('scanner.title')} />
            {state !== 'live' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-white/90">
                {state === 'starting' ? (
                  <span>{t('scanner.starting')}</span>
                ) : (
                  <>
                    <CameraOff className="size-6" aria-hidden />
                    <span>{state === 'none' ? t('scanner.noCamera') : t('scanner.denied')}</span>
                  </>
                )}
              </div>
            )}
            {state === 'live' && <div className="pointer-events-none absolute inset-x-[15%] inset-y-[25%] rounded-lg border-2 border-brand-yellow/90" aria-hidden />}
          </div>
          {devices.length > 1 && state === 'live' && (
            <Button size="sm" variant="outline" onClick={() => setDeviceIndex((i) => (i + 1) % devices.length)}>
              <SwitchCamera /> {t('scanner.switchCamera')}
            </Button>
          )}
          <form onSubmit={submit} className="flex items-end gap-2">
            <Field label={t('scanner.manual')} htmlFor={`${uid}-manual`} className="flex-1">
              <Input
                id={`${uid}-manual`}
                dir="ltr"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder={t('scanner.manualPlaceholder')}
                className="h-11 font-latin text-base"
                autoComplete="off"
              />
            </Field>
            <Button type="submit" size="lg" className="h-11" disabled={!manual.trim()}>
              <Search /> {t('scanner.search')}
            </Button>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
