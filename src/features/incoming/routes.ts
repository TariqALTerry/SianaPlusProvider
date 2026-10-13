import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

const full: RouteAccess = { full: true }

export const incomingRoutes: RouteObject[] = [
  { path: 'incoming', handle: full, lazy: () => import('./IncomingPage').then((m) => ({ Component: m.IncomingPage })) },
]
