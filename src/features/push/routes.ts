import type { RouteObject } from 'react-router'

/** `/n/:id` follows a browser-notification click (PHASE2 §8); open in every shell mode. */
export const pushRoutes: RouteObject[] = [
  { path: 'n/:notificationId', lazy: () => import('./NotificationRedirectPage').then((m) => ({ Component: m.NotificationRedirectPage })) },
]
