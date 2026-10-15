import { http } from '@/api/http'
import { qk } from '@/api/keys'
import type { JobBriefResponse, ProviderDemandResponse, TeamMapResponse, TeamPerformanceRequest, TeamPerformanceResponse } from '@/api/types'

/** `api/provider/insights` (PROVIDER-PLATFORM-PHASE2-PROMPT §3, §4, §6, §7). */
const base = '/api/provider/insights'

export const insightsApi = {
  /** Counts only — no customer data. `radiusKm` 1..100. */
  demand: (radiusKm: number, signal?: AbortSignal) => http.get<ProviderDemandResponse>(`${base}/demand`, { radiusKm }, signal),
  /** UTC; default the last 30 days, up to a year. */
  teamPerformance: (params: TeamPerformanceRequest, signal?: AbortSignal) => http.get<TeamPerformanceResponse>(`${base}/team-performance`, params, signal),
  teamMap: (signal?: AbortSignal) => http.get<TeamMapResponse>(`${base}/team-map`, undefined, signal),
  /** Cached 12 h on the server; the same text the technician reads. */
  jobBrief: (serviceItemId: string, signal?: AbortSignal) => http.get<JobBriefResponse>(`${base}/jobs/${serviceItemId}/brief`, undefined, signal),
}

export const insightKeys = {
  demand: (radiusKm: number) => [...qk.insights, 'demand', radiusKm] as const,
  performance: (params: object) => [...qk.insights, 'performance', params] as const,
  map: [...qk.insights, 'team-map'] as const,
  brief: (serviceItemId: string) => [...qk.insights, 'brief', serviceItemId] as const,
}
