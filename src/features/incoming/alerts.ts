import { readItem, writeItem } from '@/lib/storage'

/**
 * Desktop notification + a short chime when new items arrive in Incoming (§8.3). The user turns
 * it on from the Incoming page (browsers only grant permission from a click); the choice is kept
 * per browser.
 */
const PREF_KEY = 'incomingAlerts'

export function desktopAlertsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function desktopAlertsEnabled(): boolean {
  return desktopAlertsSupported() && Notification.permission === 'granted' && readItem<boolean>(PREF_KEY, true)
}

export async function enableDesktopAlerts(): Promise<boolean> {
  if (!desktopAlertsSupported()) return false
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
  writeItem(PREF_KEY, permission === 'granted')
  return permission === 'granted'
}

export function disableDesktopAlerts(): void {
  writeItem(PREF_KEY, false)
}

let audio: AudioContext | null = null

/** Two soft tones; silently skipped when the browser blocks audio before any interaction. */
export function playChime(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    audio ??= new Ctx()
    const start = audio.currentTime
    for (const [i, freq] of [880, 1320].entries()) {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, start + i * 0.18)
      gain.gain.exponentialRampToValueAtTime(0.15, start + i * 0.18 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + i * 0.18 + 0.3)
      osc.connect(gain).connect(audio.destination)
      osc.start(start + i * 0.18)
      osc.stop(start + i * 0.18 + 0.32)
    }
  } catch {
    // Audio is a nicety.
  }
}

export function showDesktopAlert(title: string, body: string, onClick: () => void): void {
  if (!desktopAlertsEnabled()) return
  try {
    const n = new Notification(title, { body, icon: '/logo-mark.png', tag: 'siana-incoming' })
    n.onclick = () => {
      window.focus()
      onClick()
      n.close()
    }
  } catch {
    // Some browsers only allow notifications from a service worker; the badge still updates.
  }
}
