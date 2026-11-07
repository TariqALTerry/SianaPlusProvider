import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

/**
 * `/subscription` (PROVIDER-BRANCHES phase 3): once the organization is Approved/Trial, and before that for a "counter
 * only" shop that wants to look at the plans. Never for the front desk.
 */
const handle: RouteAccess = { full: true, early: (ctx) => ctx.counterOnly }

export const subscriptionRoutes: RouteObject[] = [
  { path: 'subscription', handle, lazy: () => import('./SubscriptionPage').then((m) => ({ Component: m.SubscriptionPage })) },
]
