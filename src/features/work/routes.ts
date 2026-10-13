import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

const full: RouteAccess = { full: true }

export const workRoutes: RouteObject[] = [
  { path: 'work', handle: full, lazy: () => import('./WorkPage').then((m) => ({ Component: m.WorkPage })) },
  { path: 'work/:id', handle: full, lazy: () => import('./WorkItemPage').then((m) => ({ Component: m.WorkItemPage })) },
]
