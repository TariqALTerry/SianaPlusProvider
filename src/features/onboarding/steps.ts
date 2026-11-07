import type { OnboardingStepsResponse } from '@/api/types'
import type { OrganizationTab } from '@/features/organization/logic'

/** The five checklist cards (§8.1), in order, with the section each one opens. */
export const ONBOARDING_STEPS = [
  { key: 'profileComplete', missing: 'ProfileComplete', tab: 'profile' },
  { key: 'documentsUploaded', missing: 'DocumentsUploaded', tab: 'documents' },
  { key: 'capabilitiesSet', missing: 'CapabilitiesSet', tab: 'capabilities' },
  { key: 'coverageSet', missing: 'CoverageSet', tab: 'coverage' },
  { key: 'capacitySet', missing: 'CapacitySet', tab: 'operations' },
] as const satisfies ReadonlyArray<{ key: keyof OnboardingStepsResponse; missing: string; tab: OrganizationTab }>

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]
export type StepKey = OnboardingStep['key']

export function stepTab(key: StepKey): OrganizationTab {
  return ONBOARDING_STEPS.find((s) => s.key === key)!.tab
}

/**
 * The steps this organization has to finish: a "counter only" shop skips capabilities and coverage areas
 * (`capabilitiesRequired` / `coverageRequired` false, PROVIDER-BRANCHES phase 3 §7). `canSubmit` stays the server's.
 */
export function visibleSteps(steps: OnboardingStepsResponse): OnboardingStep[] {
  return ONBOARDING_STEPS.filter(
    (s) => (s.key !== 'capabilitiesSet' || steps.capabilitiesRequired) && (s.key !== 'coverageSet' || steps.coverageRequired),
  )
}

export function stepProgress(steps: OnboardingStepsResponse): { done: number; total: number } {
  const shown = visibleSteps(steps)
  return { done: shown.filter((s) => steps[s.key]).length, total: shown.length }
}

/**
 * `ProviderSubmissionIncomplete` carries `data: { missingSteps: ["ProfileComplete", …] }` (the
 * `OnboardingStepsResponse` property names). Maps them to step keys; unknown names are ignored.
 */
export function missingStepsFrom(details: unknown): Set<StepKey> {
  const raw = details && typeof details === 'object' ? (details as { missingSteps?: unknown }).missingSteps : undefined
  const names = Array.isArray(raw) ? raw.filter((n): n is string => typeof n === 'string') : []
  const out = new Set<StepKey>()
  for (const name of names) {
    const step = ONBOARDING_STEPS.find((s) => s.missing.toLowerCase() === name.toLowerCase())
    if (step) out.add(step.key)
  }
  return out
}

/** A card is highlighted while the server said it was missing and the organization still shows it undone. */
export function isHighlighted(key: StepKey, missing: ReadonlySet<StepKey>, steps: OnboardingStepsResponse): boolean {
  return missing.has(key) && !steps[key]
}
