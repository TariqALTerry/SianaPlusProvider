import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

const full: RouteAccess = { full: true }

export const boardRoutes: RouteObject[] = [
  { path: 'board', handle: full, lazy: () => import('./BoardPage').then((m) => ({ Component: m.BoardPage })) },
]
