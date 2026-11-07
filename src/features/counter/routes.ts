import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

/**
 * The counter (PROVIDER-BRANCHES-PROVIDER-PLATFORM-PROMPT phase 2): the owner and supervisors once the organization is
 * Approved/Trial, and the front desk. The subscription gate is shown inside the pages, never as a hidden route.
 */
const handle: RouteAccess = { full: true, frontDesk: true }

export const counterRoutes: RouteObject[] = [
  { path: 'counter', handle, lazy: () => import('./CounterPage').then((m) => ({ Component: m.CounterPage })) },
  // Phase 5 §3: the branch board (transfers, warranty and cash close live in features/branchOps).
  { path: 'counter/board', handle, lazy: () => import('./BoardPage').then((m) => ({ Component: m.BoardPage })) },
  { path: 'counter/new', handle, lazy: () => import('./NewIntakePage').then((m) => ({ Component: m.NewIntakePage })) },
  { path: 'counter/items/:id', handle, lazy: () => import('./CounterItemPage').then((m) => ({ Component: m.CounterItemPage })) },
  { path: 'counter/items/:id/done', handle, lazy: () => import('./IntakeDonePage').then((m) => ({ Component: m.IntakeDonePage })) },
]
