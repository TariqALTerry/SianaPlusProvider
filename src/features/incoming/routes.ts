import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

/** Platform work: hidden for a "counter only" shop (PROVIDER-BRANCHES phase 3 §7). */
const full: RouteAccess = { full: true, platform: true }

export const incomingRoutes: RouteObject[] = [
  { path: 'incoming', handle: full, lazy: () => import('./IncomingPage').then((m) => ({ Component: m.IncomingPage })) },
]
