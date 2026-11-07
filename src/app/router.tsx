import { createBrowserRouter, type RouteObject } from 'react-router'
import { boardRoutes } from '@/features/board/routes'
import { disputesRoutes } from '@/features/disputes/routes'
import { homeRoutes } from '@/features/home/routes'
import { incomingRoutes } from '@/features/incoming/routes'
import { marketplaceRoutes } from '@/features/marketplace/routes'
import { notificationsRoutes } from '@/features/notifications/routes'
import { onboardingRoutes } from '@/features/onboarding/routes'
import { organizationRoutes } from '@/features/organization/routes'
import { reviewsRoutes } from '@/features/reviews/routes'
import { settlementsRoutes } from '@/features/settlements/routes'
import { storeRoutes } from '@/features/store/routes'
import { teamRoutes } from '@/features/team/routes'
import { workRoutes } from '@/features/work/routes'
import { workshopRoutes } from '@/features/workshop/routes'
import { supportRoutes } from '@/features/support/routes'
import { walletRoutes } from '@/features/wallet/routes'
import { messagesRoutes } from '@/features/messages/routes'
import { insightsRoutes } from '@/features/insights/routes'
import { pushRoutes } from '@/features/push/routes'
import { counterRoutes } from '@/features/counter/routes'
import { subscriptionRoutes } from '@/features/subscription/routes'
import { branchOpsRoutes } from '@/features/branchOps/routes'
import { inventoryRoutes } from '@/features/inventory/routes'
import { whatsappRoutes } from '@/features/whatsapp/routes'
import { AppShell } from './AppShell'
import type { RouteAccess } from './nav'
import { AuthGuard, ProviderGate, Splash } from './AuthGuard'
import { HomeRoute } from './HomeRoute'
import { RouteError } from './RouteError'

/**
 * Route table. Each feature owns a tiny `routes.ts` whose pages are `lazy` (one chunk per page);
 * `handle: RouteAccess` says what a page needs (approved organization, tenders, store).
 */
const featureRoutes: RouteObject[] = [
  ...homeRoutes,
  ...onboardingRoutes,
  ...incomingRoutes,
  ...counterRoutes,
  ...branchOpsRoutes,
  ...workRoutes,
  ...workshopRoutes,
  ...inventoryRoutes,
  ...boardRoutes,
  ...insightsRoutes,
  ...teamRoutes,
  ...messagesRoutes,
  ...walletRoutes,
  ...subscriptionRoutes,
  ...whatsappRoutes,
  ...pushRoutes,
  ...marketplaceRoutes,
  ...settlementsRoutes,
  ...reviewsRoutes,
  ...disputesRoutes,
  ...storeRoutes,
  ...organizationRoutes,
  ...notificationsRoutes,
  ...supportRoutes,
]

export const router = createBrowserRouter([
  {
    path: '/login',
    lazy: () => import('@/features/auth/LoginPage').then((m) => ({ Component: m.LoginPage })),
    hydrateFallbackElement: <Splash />,
  },
  // The public tracking page (phase 4 §6): no session, no shell, no branch switcher. Its links reach customers on WhatsApp.
  {
    path: '/t/:token',
    lazy: () => import('@/features/tracking/PublicTrackingPage').then((m) => ({ Component: m.PublicTrackingPage })),
    hydrateFallbackElement: <Splash />,
  },
  {
    path: '/join',
    lazy: () => import('@/features/join/JoinPage').then((m) => ({ Component: m.JoinPage })),
    hydrateFallbackElement: <Splash />,
  },
  {
    path: '/',
    hydrateFallbackElement: <Splash />,
    element: (
      <AuthGuard>
        <ProviderGate>
          <AppShell />
        </ProviderGate>
      </AuthGuard>
    ),
    children: [
      {
        // Pathless layout: a page that fails to load/render shows its error inside the shell.
        errorElement: <RouteError />,
        children: [
          // A front-desk account lands on the counter (HomeRoute redirects it).
          { index: true, handle: { frontDesk: true } satisfies RouteAccess, element: <HomeRoute /> },
          ...featureRoutes,
          { path: '*', lazy: () => import('./NotFoundPage').then((m) => ({ Component: m.NotFoundPage })) },
        ],
      },
    ],
  },
])
