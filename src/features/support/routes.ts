import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

/**
 * `/support` "الدعم الفني": the owner's or supervisor's own tickets. Open in every shell mode — a problem with
 * onboarding or review is exactly when support is needed.
 */
const always: RouteAccess = {}

export const supportRoutes: RouteObject[] = [
  { path: 'support', handle: always, lazy: () => import('./SupportPage').then((m) => ({ Component: m.SupportPage })) },
  { path: 'support/:id', handle: always, lazy: () => import('./SupportTicketPage').then((m) => ({ Component: m.SupportTicketPage })) },
]
