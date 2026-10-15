import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

/** `/wallet` (PHASE2 §1): owner and supervisor; owner-only actions are hidden in place. */
export const walletRoutes: RouteObject[] = [
  { path: 'wallet', handle: { full: true } satisfies RouteAccess, lazy: () => import('./WalletPage').then((m) => ({ Component: m.WalletPage })) },
]
