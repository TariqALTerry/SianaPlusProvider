import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

/** The workshop board (service tracking): devices away from their customers, once the organization is Approved/Trial. */
export const workshopRoutes: RouteObject[] = [
  {
    path: 'workshop',
    // The shelf is also the front desk's (PROVIDER-BRANCHES phase 2 §2), for its branches.
    handle: { full: true, frontDesk: true } satisfies RouteAccess,
    lazy: () => import('./WorkshopPage').then((m) => ({ Component: m.WorkshopPage })),
  },
]
