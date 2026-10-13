import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

const handle: RouteAccess = { full: true }

export const disputesRoutes: RouteObject[] = [
  { path: 'disputes', handle, lazy: () => import('./DisputesPage').then((m) => ({ Component: m.DisputesPage })) },
  { path: 'disputes/:id', handle, lazy: () => import('./DisputeDetailPage').then((m) => ({ Component: m.DisputeDetailPage })) },
]
