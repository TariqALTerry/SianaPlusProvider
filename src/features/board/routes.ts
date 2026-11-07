import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

/** Platform work: hidden for a "counter only" shop (PROVIDER-BRANCHES phase 3 §7). */
const full: RouteAccess = { full: true, platform: true }

export const boardRoutes: RouteObject[] = [
  { path: 'board', handle: full, lazy: () => import('./BoardPage').then((m) => ({ Component: m.BoardPage })) },
]
