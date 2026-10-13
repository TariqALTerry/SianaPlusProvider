import type { RouteObject } from 'react-router'

export const notificationsRoutes: RouteObject[] = [
  { path: 'notifications', lazy: () => import('./NotificationsPage').then((m) => ({ Component: m.NotificationsPage })) },
]
