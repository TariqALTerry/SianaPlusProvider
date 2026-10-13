import { Bell, BellOff } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { desktopAlertsEnabled, desktopAlertsSupported, disableDesktopAlerts, enableDesktopAlerts } from '../alerts'
import '../i18n'

/**
 * Desktop notification + chime for new Incoming items (§8.3). Permission can only be asked from
 * a click; the shell's `IncomingWatcher` does the announcing.
 */
export function AlertsToggle() {
  const { t } = useTranslation('incoming')
  const [enabled, setEnabled] = useState(desktopAlertsEnabled)
  const [busy, setBusy] = useState(false)
  if (!desktopAlertsSupported()) return null

  const toggle = async () => {
    if (enabled) {
      disableDesktopAlerts()
      setEnabled(false)
      toast(t('alerts.disabled'))
      return
    }
    setBusy(true)
    try {
      const ok = await enableDesktopAlerts()
      setEnabled(ok)
      if (ok) toast.success(t('alerts.enabled'))
      else toast.error(t('alerts.denied'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant={enabled ? 'secondary' : 'outline'} size="sm" onClick={() => void toggle()} loading={busy} aria-pressed={enabled} title={t('alerts.hint')}>
      {enabled ? <Bell /> : <BellOff />}
      {enabled ? t('alerts.on') : t('alerts.off')}
    </Button>
  )
}
