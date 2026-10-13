import { lazy } from 'react'
import { useProvider } from './provider'

const HomePage = lazy(() => import('@/features/home/HomePage').then((m) => ({ default: m.HomePage })))
const OnboardingPage = lazy(() => import('@/features/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage })))

/**
 * `/` is the dashboard once the organization is Approved/Trial (§8.2), and the onboarding
 * checklist before that (§8: "الرئيسية (as the onboarding checklist)").
 */
export function HomeRoute() {
  const { mode } = useProvider()
  return mode === 'full' ? <HomePage /> : <OnboardingPage />
}
