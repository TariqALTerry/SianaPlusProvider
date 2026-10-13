import { http } from '@/api/http'
import type { ProviderOrganizationResponse } from '@/api/types'

export const onboardingApi = {
  /** Owner only. Draft / Rejected → Submitted (§8.1). */
  submit: () => http.post<ProviderOrganizationResponse>('/api/provider/organization/submit'),
}
