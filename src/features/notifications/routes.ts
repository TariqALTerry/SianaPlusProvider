import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

export const notificationsRoutes: RouteObject[] = [
  { path: 'notifications', handle: { frontDesk: true } satisfies RouteAccess, lazy: () => import('./NotificationsPage').then((m) => ({ Component: m.NotificationsPage })) },
]
