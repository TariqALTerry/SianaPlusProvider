import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

/**
 * Branch operations (PROVIDER-BRANCHES-PROVIDER-PLATFORM-PROMPT phase 5 §5–§7): transfers, counter warranty claims and
 * the cash close. The owner and supervisors once the organization is Approved/Trial, and the front desk.
 */
const handle: RouteAccess = { full: true, frontDesk: true }

export const branchOpsRoutes: RouteObject[] = [
  { path: 'counter/transfers', handle, lazy: () => import('./TransfersPage').then((m) => ({ Component: m.TransfersPage })) },
  { path: 'counter/transfers/:id', handle, lazy: () => import('./TransferPage').then((m) => ({ Component: m.TransferPage })) },
  { path: 'counter/warranty', handle, lazy: () => import('./WarrantyPage').then((m) => ({ Component: m.WarrantyPage })) },
  { path: 'counter/cash-close', handle, lazy: () => import('./CashClosePage').then((m) => ({ Component: m.CashClosePage })) },
]
