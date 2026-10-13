import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

const handle: RouteAccess = { full: true }

export const reviewsRoutes: RouteObject[] = [
  { path: 'reviews', handle, lazy: () => import('./ReviewsPage').then((m) => ({ Component: m.ReviewsPage })) },
]
