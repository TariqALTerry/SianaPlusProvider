import { create } from 'zustand'
import { session } from '@/api/session'
import { writeItem } from '@/lib/storage'
import type { AuthResponse, CurrentUserResponse, Role } from '@/api/types'
import { queryClient } from '@/api/queryClient'
import { authApi } from './api'

/**
 * `unknown` until the startup `GET /api/auth/me` confirms a restored session, so the guard can
 * show a splash instead of flashing either the login page or a stale shell.
 */
type AuthStatus = 'unknown' | 'authenticated' | 'anonymous'

/**
 * Why the user is looking at the sign-in screen (§4, §5.1):
 * `blocked` account inactive/suspended · `tenant` organization suspended · `missing` organization
 * not found · `executor` a technician account · `notProvider` any other role.
 */
export type LogoutNotice = 'expired' | 'idle' | 'blocked' | 'tenant' | 'missing' | 'executor' | 'notProvider' | null

/** The only roles that may use this platform. */
export const PROVIDER_ROLES: readonly Role[] = ['ProviderOwner', 'ProviderSupervisor']

export function noticeForRole(role: Role): LogoutNotice {
  if (PROVIDER_ROLES.includes(role)) return null
  return role === 'Executor' ? 'executor' : 'notProvider'
}

interface AuthState {
  status: AuthStatus
  user: CurrentUserResponse | null
  notice: LogoutNotice
  signIn: (auth: AuthResponse) => void
  setUser: (user: CurrentUserResponse) => void
  /** Ends the session locally (and best-effort on the server), keeping the device id. */
  signOut: (notice?: LogoutNotice, callServer?: boolean) => Promise<void>
  clearNotice: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: session.hasSession ? 'unknown' : 'anonymous',
  user: session.user,
  notice: null,

  signIn: (auth) => {
    session.save(auth)
    writeItem('lastActivityAt', Date.now())
    set({ status: 'authenticated', user: auth.user, notice: null })
  },

  setUser: (user) => {
    session.saveUser(user)
    set({ status: 'authenticated', user })
  },

  signOut: async (notice = null, callServer = true) => {
    if (callServer && session.accessToken) {
      // Network failure is irrelevant: the local session ends either way.
      await authApi.logout().catch(() => undefined)
    }
    session.clear()
    queryClient.clear()
    set({ status: 'anonymous', user: null, notice })
  },

  clearNotice: () => set({ notice: null }),
}))

/**
 * Signs in after a verified code or a registration — unless the account is not an owner or
 * supervisor, in which case the fresh session is revoked on the server and the notice says why.
 */
export async function acceptSession(auth: AuthResponse): Promise<LogoutNotice> {
  const refused = noticeForRole(auth.user.role)
  if (!refused) {
    useAuthStore.getState().signIn(auth)
    return null
  }
  session.save(auth)
  await useAuthStore.getState().signOut(refused, true)
  return refused
}

export function useCurrentUser(): CurrentUserResponse | null {
  return useAuthStore((s) => s.user)
}

/** Owner-only actions (§7) are hidden for supervisors; the server enforces it with `OwnerOnly`. */
export function useIsOwner(): boolean {
  return useAuthStore((s) => s.user?.role === 'ProviderOwner')
}
