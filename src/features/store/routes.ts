import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

/** Only when the platform enabled the organization's Store Module (§8.13). Products open as `?open=:id`. */
const handle: RouteAccess = { full: true, store: true }

export const storeRoutes: RouteObject[] = [
  { path: 'store', handle, lazy: () => import('./StorePage').then((m) => ({ Component: m.StorePage })) },
]
