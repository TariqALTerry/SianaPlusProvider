import { useEffect } from 'react'
import { writeItem, readItem, storageKey } from '@/lib/storage'
import { useAuthStore } from './authStore'

const IDLE_MS = 30 * 60_000
const CHECK_EVERY_MS = 30_000
export const ACTIVITY_KEY = 'lastActivityAt'
const EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove'] as const

/**
 * Signs out after 30 idle minutes (§5.1, as in the dashboard). Activity is shared across tabs through localStorage,
 * so working in one tab keeps the others alive; background polling does not count as activity.
 */
export function useIdleLogout(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return

    let lastWrite = 0
    const mark = () => {
      const now = Date.now()
      // Throttle writes: mousemove fires constantly.
      if (now - lastWrite > 5_000) {
        lastWrite = now
        writeItem(ACTIVITY_KEY, now)
      }
    }
    // A tab reopened hours later must not resurrect the session: check before marking.
    const last = readItem<number | null>(ACTIVITY_KEY, null)
    if (last !== null && Date.now() - last >= IDLE_MS) {
      void useAuthStore.getState().signOut('idle')
      return
    }
    mark()

    EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true }))

    const check = () => {
      const last = readItem<number>(ACTIVITY_KEY, Date.now())
      if (Date.now() - last >= IDLE_MS) void useAuthStore.getState().signOut('idle')
    }
    const timer = window.setInterval(check, CHECK_EVERY_MS)
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey(ACTIVITY_KEY)) lastWrite = 0
    }
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', check)

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, mark))
      window.clearInterval(timer)
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', check)
    }
  }, [enabled])
}
