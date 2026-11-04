import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

const handle: RouteAccess = { full: true }

/**
 * PHASE2 §3, §4, §6: demand near you, team performance, one technician's report and the live team map; then the
 * tracking pages: punctuality, quality signals and cash still with technicians.
 */
export const insightsRoutes: RouteObject[] = [
  { path: 'growth/demand', handle, lazy: () => import('./DemandPage').then((m) => ({ Component: m.DemandPage })) },
  { path: 'team/performance', handle, lazy: () => import('./TeamPerformancePage').then((m) => ({ Component: m.TeamPerformancePage })) },
  { path: 'team/:executorId/report', handle, lazy: () => import('./TechnicianReportPage').then((m) => ({ Component: m.TechnicianReportPage })) },
  { path: 'team/map', handle, lazy: () => import('./TeamMapPage').then((m) => ({ Component: m.TeamMapPage })) },
  { path: 'team/punctuality', handle, lazy: () => import('./PunctualityPage').then((m) => ({ Component: m.PunctualityPage })) },
  { path: 'team/quality', handle, lazy: () => import('./QualityPage').then((m) => ({ Component: m.QualityPage })) },
  { path: 'team/cash', handle, lazy: () => import('./CashPage').then((m) => ({ Component: m.CashPage })) },
]
