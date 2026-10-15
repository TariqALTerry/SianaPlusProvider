import type { FirebaseApp } from 'firebase/app'
import type { Messaging, MessagePayload } from 'firebase/messaging'
import { create } from 'zustand'
import { http } from '@/api/http'
import type { PushDeviceResponse, RegisterPushDeviceRequest } from '@/api/types'
import { readItem, removeItem, writeItem } from '@/lib/storage'

/*
 * Browser notifications for the provider platform (PROVIDER-PLATFORM-PHASE2-PROMPT §8, the dashboard's web push
 * with app 'Provider'). Firebase is imported lazily, only
 * when the feature is configured and the browser can use it; with any VITE_FIREBASE_* value empty
 * the whole feature stays hidden and nothing here loads.
 */

const env = import.meta.env
/** Public values — they ship in the bundle; none of them is a secret. */
const config = {
  apiKey: String(env.VITE_FIREBASE_API_KEY ?? ''),
  projectId: String(env.VITE_FIREBASE_PROJECT_ID ?? ''),
  messagingSenderId: String(env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? ''),
  appId: String(env.VITE_FIREBASE_APP_ID ?? ''),
}
const vapidKey = String(env.VITE_FIREBASE_VAPID_KEY ?? '')

export const webPushConfigured = Object.values(config).every(Boolean) && !!vapidKey

/** No service worker / Push API (e.g. Safari on iOS outside "Add to Home Screen"). */
export function webPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

const TOKEN_KEY = 'push.token'
const SNOOZE_KEY = 'push.promptSnoozedUntil'
const SW_URL = '/firebase-messaging-sw.js'
const SW_SCOPE = '/firebase-cloud-messaging-push-scope'

export type WebPushState = 'hidden' | 'unsupported' | 'blocked' | 'off' | 'on'

function computeState(): WebPushState {
  if (!webPushConfigured) return 'hidden'
  if (!webPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  return Notification.permission === 'granted' && readItem<string | null>(TOKEN_KEY, null) ? 'on' : 'off'
}

/** Shared by the bell prompt, the settings card and the unread-count polling interval. */
export const useWebPush = create<{ state: WebPushState; sync: () => void }>()((set) => ({
  state: computeState(),
  sync: () => set({ state: computeState() }),
}))

// ── Firebase (lazy) ──────────────────────────────────────────────────────────

let messagingPromise: Promise<{ messaging: Messaging; registration: ServiceWorkerRegistration }> | null = null

function loadMessaging() {
  messagingPromise ??= (async () => {
    const [{ initializeApp, getApps }, { getMessaging }] = await Promise.all([import('firebase/app'), import('firebase/messaging')])
    const app: FirebaseApp = getApps()[0] ?? initializeApp(config)
    // The worker can't read import.meta.env: the config travels in its URL (§3.2).
    const registration = await navigator.serviceWorker.register(`${SW_URL}?${new URLSearchParams(config)}`, { scope: SW_SCOPE })
    return { messaging: getMessaging(app), registration }
  })().catch((e: unknown) => {
    messagingPromise = null
    throw e
  })
  return messagingPromise
}

const appVersion = String(env.VITE_APP_VERSION ?? '') || (typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '')

/** getToken + `POST /api/me/push-devices`; renews `lastSeenAt` and follows a changed token. */
async function registerToken(): Promise<string> {
  const { messaging, registration } = await loadMessaging()
  const { getToken } = await import('firebase/messaging')
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })
  const body: RegisterPushDeviceRequest = { token, platform: 'Web', app: 'Provider', appVersion: appVersion || null }
  await http.post<PushDeviceResponse>('/api/me/push-devices', body)
  writeItem(TOKEN_KEY, token)
  return token
}

/** The click on "تفعيل": asks for permission, then registers this browser. */
export async function enableWebPush(): Promise<WebPushState> {
  if (!webPushConfigured || !webPushSupported()) return computeState()
  const permission = await Notification.requestPermission()
  if (permission === 'granted') await registerToken()
  useWebPush.getState().sync()
  return computeState()
}

/** Every load while signed in with permission granted: renew silently. Errors go to the console only (§3.3). */
export async function renewWebPush(): Promise<void> {
  if (!webPushConfigured || !webPushSupported() || Notification.permission !== 'granted') return
  try {
    await registerToken()
  } catch (e) {
    console.warn('[push] silent renewal failed; retrying on the next load', e)
  } finally {
    useWebPush.getState().sync()
  }
}

/**
 * Stops pushes to this browser: unregister on the server (unless the session is already gone),
 * delete the FCM token and forget it locally. Used by "إيقاف" and before sign-out (§3.6).
 */
export async function disableWebPush({ callServer = true }: { callServer?: boolean } = {}): Promise<void> {
  const token = readItem<string | null>(TOKEN_KEY, null)
  if (token && callServer) await http.post('/api/me/push-devices/unregister', { token }).catch(() => undefined)
  if (token && webPushConfigured && webPushSupported()) {
    try {
      const { messaging } = await loadMessaging()
      const { deleteToken } = await import('firebase/messaging')
      await deleteToken(messaging)
    } catch (e) {
      console.warn('[push] deleteToken failed', e)
    }
  }
  removeItem(TOKEN_KEY)
  useWebPush.getState().sync()
}

/** Foreground messages (`onMessage`): only once Firebase is already loaded for this tab. */
export async function listenForeground(handler: (payload: MessagePayload) => void): Promise<() => void> {
  const { messaging } = await loadMessaging()
  const { onMessage } = await import('firebase/messaging')
  return onMessage(messaging, handler)
}

export function myPushDevices(signal?: AbortSignal) {
  return http.get<PushDeviceResponse[]>('/api/me/push-devices', undefined, signal)
}

// ── The bell prompt's "لاحقًا" (7 days) ─────────────────────────────────────

export function promptSnoozed(now = Date.now()): boolean {
  return readItem<number>(SNOOZE_KEY, 0) > now
}

export function snoozePrompt(now = Date.now()): void {
  writeItem(SNOOZE_KEY, now + 7 * 24 * 60 * 60 * 1000)
}
