import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

const handle: RouteAccess = { full: true }

/** `/messages` and `/messages/:serviceItemId` (PHASE2 §2): one page, list + open conversation. */
export const messagesRoutes: RouteObject[] = [
  { path: 'messages', handle, lazy: () => import('./MessagesPage').then((m) => ({ Component: m.MessagesPage })) },
  { path: 'messages/:serviceItemId', handle, lazy: () => import('./MessagesPage').then((m) => ({ Component: m.MessagesPage })) },
]
