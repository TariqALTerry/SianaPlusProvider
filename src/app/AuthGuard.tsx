import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router'
import { toast } from 'sonner'
import { setSessionEndHandler, setStaleStateHandler, toApiError } from '@/api/http'
import { qk } from '@/api/keys'
import { queryClient } from '@/api/queryClient'
import { ErrorState } from '@/components/States'
import { authApi } from '@/features/auth/api'
import { noticeForRole, useAuthStore } from '@/features/auth/authStore'
import { useIdleLogout } from '@/features/auth/useIdleLogout'
import { i18next } from '@/i18n'
import { useOrganizationQuery } from './provider'

// The http layer ends sessions (refresh rejected, account or organization blocked, §4).
setSessionEndHandler((reason) => {
  void useAuthStore.getState().signOut(reason, false)
})

// The organization's state changed under an open page (§4): refetch it and the profile. The
// failing action's dialog shows the server message; these two also get a toast, as the brief asks.
setStaleStateHandler((code) => {
  void queryClient.invalidateQueries({ queryKey: qk.organization })
  void queryClient.invalidateQueries({ queryKey: qk.me })
  if (code === 'OwnerOnly') toast.error(i18next.t('errors.ownerOnly'), { id: 'owner-only' })
  if (code === 'ProviderNotOperational') toast.error(i18next.t('errors.notOperational'), { id: 'not-operational' })
})

export function Splash({ label }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background" aria-busy>
      <div className="size-9 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  )
}

/**
 * Validates a restored session with `GET /api/auth/me` (§5.1), enforces the idle timeout, and lets
 * only owners and supervisors through: a role change on the server signs the user out here.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const location = useLocation()
  const status = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)

  const me = useQuery({
    queryKey: qk.me,
    queryFn: ({ signal }) => authApi.me(signal),
    enabled: status !== 'anonymous',
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  })

  useEffect(() => {
    if (me.data) useAuthStore.getState().setUser(me.data)
  }, [me.data])

  useEffect(() => {
    if (!me.error) return
    const e = toApiError(me.error)
    // 401/403 are handled by the http layer. A network failure at startup keeps the cached
    // profile so the shell renders and each page shows its own error state.
    if (e.status === 0 && useAuthStore.getState().status === 'unknown' && useAuthStore.getState().user) {
      useAuthStore.setState({ status: 'authenticated' })
    }
  }, [me.error])

  useIdleLogout(status === 'authenticated')

  const refused = user ? noticeForRole(user.role) : null
  useEffect(() => {
    if (refused) void useAuthStore.getState().signOut(refused)
  }, [refused])

  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (status === 'unknown' || refused) return <Splash />
  return <>{children}</>
}

/**
 * Loads the provider context (§6) before any shell page renders, so `useProvider()` always has
 * the organization. Refetched on focus and after every organization write.
 */
export function ProviderGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const org = useOrganizationQuery()

  if (org.data) return <>{children}</>
  if (org.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border bg-surface p-6 shadow-sm">
          <ErrorState error={org.error} onRetry={() => void client.invalidateQueries({ queryKey: qk.organization })} />
          <button type="button" className="mx-auto block text-sm text-muted-foreground underline" onClick={() => void useAuthStore.getState().signOut()}>
            {t('shell.logout')}
          </button>
        </div>
      </div>
    )
  }
  return <Splash label={t('shell.loadingOrg')} />
}
