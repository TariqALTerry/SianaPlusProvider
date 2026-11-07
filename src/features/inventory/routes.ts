import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

/**
 * The inventory section (PROVIDER-BRANCHES-PROVIDER-PLATFORM-PROMPT phase 6): workshop parts per branch. Open to the
 * owner and supervisors once the organization is Approved/Trial, and to the front desk read-only (the server refuses its
 * writes with 403, and the pages hide them).
 */
const handle: RouteAccess = { full: true, frontDesk: true }

export const inventoryRoutes: RouteObject[] = [
  { path: 'inventory', handle, lazy: () => import('./InventoryIndex').then((m) => ({ Component: m.InventoryIndex })) },
  { path: 'inventory/stock', handle, lazy: () => import('./StockPage').then((m) => ({ Component: m.StockPage })) },
  { path: 'inventory/low-stock', handle, lazy: () => import('./LowStockPage').then((m) => ({ Component: m.LowStockPage })) },
  { path: 'inventory/parts', handle, lazy: () => import('./PartsPage').then((m) => ({ Component: m.PartsPage })) },
  { path: 'inventory/suppliers', handle, lazy: () => import('./SuppliersPage').then((m) => ({ Component: m.SuppliersPage })) },
  { path: 'inventory/movements', handle, lazy: () => import('./MovementsPage').then((m) => ({ Component: m.MovementsPage })) },
  { path: 'inventory/supplier-returns', handle, lazy: () => import('./SupplierReturnsPage').then((m) => ({ Component: m.SupplierReturnsPage })) },
]
