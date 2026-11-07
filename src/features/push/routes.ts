import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

/** `/n/:id` follows a browser-notification click (PHASE2 §8); open in every shell mode. */
export const pushRoutes: RouteObject[] = [
  { path: 'n/:notificationId', handle: { frontDesk: true } satisfies RouteAccess, lazy: () => import('./NotificationRedirectPage').then((m) => ({ Component: m.NotificationRedirectPage })) },
]
