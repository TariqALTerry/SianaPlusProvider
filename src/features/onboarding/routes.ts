import type { RouteObject } from 'react-router'

/**
 * `/onboarding` (§8.1). No `full` handle: it is the checklist before approval, and stays
 * reachable (read-only) afterwards. `/` renders the same page in onboarding/review mode
 * (`app/HomeRoute.tsx`).
 */
export const onboardingRoutes: RouteObject[] = [
  {
    path: 'onboarding',
    lazy: () => import('./OnboardingPage').then((m) => ({ Component: m.OnboardingPage })),
  },
]
