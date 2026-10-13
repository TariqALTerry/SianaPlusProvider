import { describe, expect, it } from 'vitest'
import type { OnboardingStepsResponse } from '@/api/types'
import { isHighlighted, missingStepsFrom, ONBOARDING_STEPS, stepProgress, stepTab } from './steps'

const steps = (over: Partial<OnboardingStepsResponse> = {}): OnboardingStepsResponse => ({
  profileComplete: false,
  documentsUploaded: false,
  capabilitiesSet: false,
  coverageSet: false,
  capacitySet: false,
  businessModelSet: true,
  canSubmit: false,
  ...over,
})

describe('onboarding steps', () => {
  it('has the five cards of the brief, each opening its section', () => {
    expect(ONBOARDING_STEPS.map((s) => s.key)).toEqual(['profileComplete', 'documentsUploaded', 'capabilitiesSet', 'coverageSet', 'capacitySet'])
    expect(stepTab('profileComplete')).toBe('profile')
    expect(stepTab('documentsUploaded')).toBe('documents')
    expect(stepTab('capabilitiesSet')).toBe('capabilities')
    expect(stepTab('coverageSet')).toBe('coverage')
    expect(stepTab('capacitySet')).toBe('operations')
  })

  it('counts progress over the five steps only', () => {
    expect(stepProgress(steps())).toEqual({ done: 0, total: 5 })
    // A fresh company: capacity defaults to 3 and the profile is filled at registration.
    expect(stepProgress(steps({ profileComplete: true, capacitySet: true }))).toEqual({ done: 2, total: 5 })
  })

  it('maps ProviderSubmissionIncomplete missingSteps to cards', () => {
    const missing = missingStepsFrom({ missingSteps: ['DocumentsUploaded', 'CoverageSet', 'Bogus'] })
    expect([...missing]).toEqual(['documentsUploaded', 'coverageSet'])
    expect(missingStepsFrom(undefined).size).toBe(0)
    expect(missingStepsFrom({ missingSteps: 'CoverageSet' }).size).toBe(0)
    expect([...missingStepsFrom({ missingSteps: ['capacityset'] })]).toEqual(['capacitySet'])
  })

  it('highlights a missing card until the organization shows it done', () => {
    const missing = missingStepsFrom({ missingSteps: ['CoverageSet'] })
    expect(isHighlighted('coverageSet', missing, steps())).toBe(true)
    expect(isHighlighted('coverageSet', missing, steps({ coverageSet: true }))).toBe(false)
    expect(isHighlighted('documentsUploaded', missing, steps())).toBe(false)
  })
})
