import type { RouteObject } from 'react-router'

/**
 * ملف المنشأة (§8.9). No `full` handle: the profile, documents, capabilities, coverage and
 * operations are exactly what onboarding (Draft / Rejected) and review modes need.
 * The open tab lives in `?tab=`.
 */
export const organizationRoutes: RouteObject[] = [
  {
    path: 'organization',
    lazy: () => import('./OrganizationPage').then((m) => ({ Component: m.OrganizationPage })),
  },
]
