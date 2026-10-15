import { BellRing, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { enableWebPush, promptSnoozed, snoozePrompt, useWebPush } from './webPush'
import './i18n'

/**
 * The bar after sign-in (PHASE2 §8, "أنسب مكان لطلب الإذن"): shown while the feature is configured and
 * the browser hasn't been asked yet. It never asks on its own; "لاحقًا" hides it for 7 days.
 */
export function EnablePrompt() {
  const { t } = useTranslation('push')
  const state = useWebPush((s) => s.state)
  const [hidden, setHidden] = useState(() => promptSnoozed())
  const [busy, setBusy] = useState(false)
  if (hidden || state !== 'off' || typeof Notification === 'undefined' || Notification.permission !== 'default') return null

  const later = () => {
    snoozePrompt()
    setHidden(true)
  }
  return (
    <div role="region" aria-label={t('prompt.text')} className="flex flex-wrap items-center gap-2 border-b bg-tone-info-soft px-4 py-2 text-sm text-tone-info">
      <BellRing className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 font-medium">{t('prompt.text')}</span>
      <Button
        size="xs"
        loading={busy}
        onClick={() => {
          setBusy(true)
          // Failures stay in the console; the notifications page offers a retry.
          enableWebPush()
            .catch((e: unknown) => console.warn('[push] enabling failed', e))
            .finally(() => setBusy(false))
        }}
      >
        {t('prompt.enable')}
      </Button>
      <Button size="xs" variant="ghost" onClick={later}>
        {t('prompt.later')}
      </Button>
      <button type="button" onClick={later} className="rounded p-0.5 hover:bg-white/40" aria-label={t('prompt.later')}>
        <X className="size-3.5" />
      </button>
    </div>
  )
}
