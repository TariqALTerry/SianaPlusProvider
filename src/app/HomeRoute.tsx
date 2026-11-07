import { lazy } from 'react'
import { Navigate } from 'react-router'
import { useShellContext } from './provider'

const HomePage = lazy(() => import('@/features/home/HomePage').then((m) => ({ default: m.HomePage })))
const OnboardingPage = lazy(() => import('@/features/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage })))

/**
 * `/` is the dashboard once the organization is Approved/Trial (§8.2), and the onboarding
 * checklist before that (§8: "الرئيسية (as the onboarding checklist)"). A front-desk account
 * has no dashboard: it works from the counter (PROVIDER-BRANCHES phase 2 §2).
 */
export function HomeRoute() {
  const ctx = useShellContext()
  if (ctx.kind === 'frontDesk') return <Navigate to="/counter" replace />
  return ctx.mode === 'full' ? <HomePage /> : <OnboardingPage />
}
