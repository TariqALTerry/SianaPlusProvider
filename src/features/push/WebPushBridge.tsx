import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { qk } from '@/api/keys'
import { useAuthStore } from '@/features/auth/authStore'
import { notificationHref, notificationsApi } from '@/features/notifications/api'
import { referenceQueryKeys } from './logic'
import { listenForeground, renewWebPush, useWebPush } from './webPush'
import './i18n'

/**
 * Mounted once in the shell (PROVIDER-PLATFORM-PHASE2-PROMPT §8): renews this browser's registration on
 * every load, turns foreground messages into a toast (visible tab only) and fresh data (every tab), and
 * follows a notification click relayed by the service worker.
 */
export function WebPushBridge() {
  const { t } = useTranslation('push')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const authenticated = useAuthStore((s) => s.status === 'authenticated')
  const state = useWebPush((s) => s.state)

  const latest = useRef({ navigate, t })
  latest.current = { navigate, t }

  const renewed = useRef(false)
  useEffect(() => {
    if (!authenticated || renewed.current || state === 'hidden' || state === 'unsupported' || typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return
    renewed.current = true
    void renewWebPush()
  }, [authenticated, state])

  useEffect(() => {
    if (!authenticated || state !== 'on') return
    let unsubscribe: (() => void) | undefined
    let cancelled = false
    listenForeground((payload) => {
      const data = payload.data ?? {}
      const ref = { referenceType: data.referenceType ?? null, referenceId: data.referenceId ?? null }
      const { navigate: go, t: tr } = latest.current
      void queryClient.invalidateQueries({ queryKey: qk.notifications })
      for (const key of referenceQueryKeys(ref.referenceType)) void queryClient.invalidateQueries({ queryKey: key })

      // onMessage reaches every open tab; only the visible one shows a toast.
      if (document.visibilityState !== 'visible') return
      const href = notificationHref(ref)
      const show = data.type === 'Success' ? toast.success : data.type === 'Warning' ? toast.warning : data.type === 'Error' ? toast.error : toast.info
      show(payload.notification?.title ?? '', {
        description: payload.notification?.body,
        action: href
          ? {
              label: tr('toast.open'),
              onClick: () => {
                if (data.notificationId) void notificationsApi.markRead(data.notificationId).catch(() => undefined)
                go(href)
              },
            }
          : undefined,
      })
    })
      .then((off) => {
        if (cancelled) off()
        else unsubscribe = off
      })
      .catch((e: unknown) => console.warn('[push] foreground listener unavailable', e))
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [authenticated, state, queryClient])

  useEffect(() => {
    if (state === 'hidden' || state === 'unsupported') return
    const onMessage = (e: MessageEvent) => {
      const msg = e.data as { type?: string; path?: string } | null
      if (msg?.type === 'siana-push-open' && typeof msg.path === 'string' && msg.path.startsWith('/')) latest.current.navigate(msg.path)
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [state])

  return null
}
