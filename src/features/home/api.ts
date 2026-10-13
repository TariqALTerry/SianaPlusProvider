import { http } from '@/api/http'
import { qk } from '@/api/keys'
import type { ProviderDashboardResponse } from '@/api/types'

/** `GET /api/provider/dashboard` (§8.2). */
export const homeApi = {
  dashboard: (signal?: AbortSignal) => http.get<ProviderDashboardResponse>('/api/provider/dashboard', undefined, signal),
}

export const homeKeys = {
  dashboard: () => [...qk.dashboard, 'summary'] as const,
}
