import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

const handle: RouteAccess = { full: true }

export const settlementsRoutes: RouteObject[] = [
  { path: 'settlements', handle, lazy: () => import('./SettlementsPage').then((m) => ({ Component: m.SettlementsPage })) },
  { path: 'settlements/:id', handle, lazy: () => import('./SettlementDetailPage').then((m) => ({ Component: m.SettlementDetailPage })) },
]
