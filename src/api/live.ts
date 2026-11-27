import { HubConnectionBuilder, HubConnectionState, HttpTransportType, LogLevel, type HubConnection } from '@microsoft/signalr'
import type { QueryClient } from '@tanstack/react-query'
import { create } from 'zustand'
import type { NotificationType, ServiceItemStatus } from '@/api/types'
import { API_ORIGIN, refreshAccessToken } from '@/api/http'
import { qk } from '@/api/keys'
import { session } from '@/api/session'

/**
 * Live updates (`/hubs/live`, LIVE-UPDATES-PROMPT §33). An event is a hint to refetch, never state: each one invalidates the
 * queries that show it. Polling stays as a slower fallback (`usePollingInterval(liveAware(ms))`).
 */

/** The hub's payloads (`Siana.Core.DTOs.Common.LiveDtos`, records the type generator does not read). */
export interface LiveServiceItemEvent {
  id: string
  orderId: string
  status: ServiceItemStatus
  providerOrganizationId?: string | null
  executorId?: string | null
  branchId?: string | null
  at: string
}

export interface LiveNotificationEvent {
  id: string
  title: string
  body: string
  type: NotificationType
  referenceType?: string | null
  referenceId?: string | null
  createdAt: string
}

export interface LiveLocationEvent {
  executorId: string
  serviceItemId?: string | null
  latitude: number
  longitude: number
  at: string
}

export type LiveStatus = 'off' | 'connecting' | 'live' | 'reconnecting'

interface LiveState {
  status: LiveStatus
  /** Latest position per technician (executor id), from `location`. */
  locations: Record<string, { latitude: number; longitude: number; at: string }>
  setStatus: (s: LiveStatus) => void
  setLocation: (e: LiveLocationEvent) => void
}

export const useLive = create<LiveState>((set) => ({
  status: 'off',
  locations: {},
  setStatus: (status) => set({ status }),
  setLocation: (e) => set((s) => ({ locations: { ...s.locations, [e.executorId]: { latitude: e.latitude, longitude: e.longitude, at: e.at } } })),
}))

/** While live, a page's polling can be this much slower: the hub tells it what changed. */
export const LIVE_POLL_FACTOR = 4

export function liveAware(ms: number, status: LiveStatus): number {
  return status === 'live' ? ms * LIVE_POLL_FACTOR : ms
}

/** What a changed service means for the dashboard's caches. */
export function invalidationsFor(event: 'serviceItem' | 'notification'): ReadonlyArray<readonly string[]> {
  return event === 'serviceItem'
    ? [qk.incoming, qk.work, qk.board, qk.workshop, qk.counter, qk.dashboard]
    : [qk.notifications]
}

/** A token good for at least a minute: SignalR sends it on every (re)connect. */
async function freshToken(): Promise<string> {
  const expires = session.expiresAt ? Date.parse(session.expiresAt) : 0
  if (!session.accessToken || expires - Date.now() < 60_000) {
    try {
      return await refreshAccessToken()
    } catch {
      return session.accessToken ?? ''
    }
  }
  return session.accessToken
}

let connection: HubConnection | null = null

/** Connects once per session; safe to call again. */
export async function startLive(queryClient: QueryClient): Promise<void> {
  if (connection || !session.hasSession) return
  const { setStatus, setLocation } = useLive.getState()

  const hub = new HubConnectionBuilder()
    .withUrl(`${API_ORIGIN}/hubs/live`, { accessTokenFactory: freshToken, transport: HttpTransportType.WebSockets, skipNegotiation: true })
    .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000, 60_000])
    .configureLogging(LogLevel.None)
    .build()
  connection = hub

  const invalidate = (keys: ReadonlyArray<readonly string[]>) => keys.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }))
  hub.on('serviceItem', (_: LiveServiceItemEvent) => invalidate(invalidationsFor('serviceItem')))
  hub.on('notification', (_: LiveNotificationEvent) => invalidate(invalidationsFor('notification')))
  hub.on('location', (e: LiveLocationEvent) => setLocation(e))

  hub.onreconnecting(() => setStatus('reconnecting'))
  hub.onreconnected(() => {
    setStatus('live')
    // Whatever changed while away.
    invalidate(invalidationsFor('serviceItem'))
  })
  hub.onclose(() => {
    setStatus('off')
    connection = null
  })

  setStatus('connecting')
  try {
    await hub.start()
    setStatus('live')
  } catch {
    setStatus('off')
    connection = null
  }
}

export async function stopLive(): Promise<void> {
  const hub = connection
  connection = null
  if (hub && hub.state !== HubConnectionState.Disconnected) await hub.stop()
  useLive.getState().setStatus('off')
}
