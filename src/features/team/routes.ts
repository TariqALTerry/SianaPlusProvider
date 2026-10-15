import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

/** §8.7 — technicians, members and (owner only) supervisors, once the organization is Approved/Trial. */
export const teamRoutes: RouteObject[] = [
  {
    path: 'team',
    handle: { full: true } satisfies RouteAccess,
    lazy: () => import('./TeamPage').then((m) => ({ Component: m.TeamPage })),
  },
  // One technician: performance cards and schedule (PHASE2 §4, §5). /team/performance and /team/map are static and win.
  {
    path: 'team/:executorId',
    handle: { full: true } satisfies RouteAccess,
    lazy: () => import('./ExecutorPage').then((m) => ({ Component: m.ExecutorPage })),
  },
]
