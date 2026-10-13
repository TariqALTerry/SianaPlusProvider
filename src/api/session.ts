import { readItem, removeItem, writeItem } from '@/lib/storage'
import type { AuthResponse, CurrentUserResponse } from './types'

/**
 * Token storage.
 *
 * The access token is held in memory for every request. It is *also* persisted, because the
 * backend's refresh endpoint identifies the user by the (expired) access token's signature:
 * `POST /api/auth/refresh { accessToken, refreshToken, deviceId }`. Without a persisted copy a
 * page reload could not redeem the refresh token and the user would be signed out on every
 * reload. The refresh token is persisted because the API returns it in JSON (no httpOnly cookie).
 */

const KEYS = {
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  expiresAt: 'accessTokenExpiresAt',
  user: 'user',
  deviceId: 'deviceId',
} as const

let accessToken: string | null = readItem<string | null>(KEYS.accessToken, null)
let expiresAt: string | null = readItem<string | null>(KEYS.expiresAt, null)

type Listener = () => void
const listeners = new Set<Listener>()

export const session = {
  get accessToken(): string | null {
    return accessToken
  },
  get refreshToken(): string | null {
    return readItem<string | null>(KEYS.refreshToken, null)
  },
  get expiresAt(): string | null {
    return expiresAt
  },
  get user(): CurrentUserResponse | null {
    return readItem<CurrentUserResponse | null>(KEYS.user, null)
  },
  get hasSession(): boolean {
    return Boolean(readItem<string | null>(KEYS.refreshToken, null))
  },

  save(auth: AuthResponse): void {
    accessToken = auth.accessToken
    expiresAt = auth.accessTokenExpiresAt
    writeItem(KEYS.accessToken, auth.accessToken)
    writeItem(KEYS.refreshToken, auth.refreshToken)
    writeItem(KEYS.expiresAt, auth.accessTokenExpiresAt)
    writeItem(KEYS.user, auth.user)
    listeners.forEach((l) => l())
  },

  saveUser(user: CurrentUserResponse): void {
    writeItem(KEYS.user, user)
    listeners.forEach((l) => l())
  },

  /** Drops the tokens and cached profile. The device id deliberately survives. */
  clear(): void {
    accessToken = null
    expiresAt = null
    removeItem(KEYS.accessToken)
    removeItem(KEYS.refreshToken)
    removeItem(KEYS.expiresAt)
    removeItem(KEYS.user)
    listeners.forEach((l) => l())
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

/** Stable per-browser id. The backend binds the refresh token to it. */
export function deviceId(): string {
  const existing = readItem<string | null>(KEYS.deviceId, null)
  if (existing) return existing

  const generated =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  writeItem(KEYS.deviceId, generated)
  return generated
}
