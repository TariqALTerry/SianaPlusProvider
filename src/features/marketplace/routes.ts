import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

/** Tenders exist only for MarketplacePartner / Both, once the organization is Approved/Trial (§8.8). */
const handle: RouteAccess = { full: true, marketplace: true }

export const marketplaceRoutes: RouteObject[] = [
  { path: 'marketplace', handle, lazy: () => import('./MarketplacePage').then((m) => ({ Component: m.MarketplacePage })) },
  { path: 'marketplace/:id', handle, lazy: () => import('./MarketplaceDetailPage').then((m) => ({ Component: m.MarketplaceDetailPage })) },
]
