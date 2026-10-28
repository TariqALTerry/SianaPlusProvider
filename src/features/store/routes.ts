import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

/** Only when the platform enabled the organization's Store Module (SMART-STORE-PROVIDER-PLATFORM-PROMPT §2). */
const handle: RouteAccess = { full: true, store: true }

export const storeRoutes: RouteObject[] = [
  { path: 'store', handle, lazy: () => import('./StorePage').then((m) => ({ Component: m.StorePage })) },
  { path: 'store/products/new', handle, lazy: () => import('./ProductCreatePage').then((m) => ({ Component: m.ProductCreatePage })) },
  { path: 'store/products/ai', handle, lazy: () => import('./AiProductPage').then((m) => ({ Component: m.AiProductPage })) },
  { path: 'store/products/:id', handle, lazy: () => import('./ProductEditPage').then((m) => ({ Component: m.ProductEditPage })) },
]
