import { http } from '@/api/http'
import { qk } from '@/api/keys'
import type {
  CashHandoverRequest,
  CashHandoverResponse,
  CashHoldingsResponse,
  CashItem,
  CounterReportResponse,
  JobBriefResponse,
  PunctualityReportResponse,
  QualityReportResponse,
  ProviderDemandResponse,
  TeamMapResponse,
  TeamPerformanceRequest,
  TeamPerformanceResponse,
  TechnicianReportRequest,
  TechnicianReportResponse,
} from '@/api/types'

/** `api/provider/insights` (PROVIDER-PLATFORM-PHASE2-PROMPT §3, §4, §6, §7). */
const base = '/api/provider/insights'

export const insightsApi = {
  /** Counts only — no customer data. `radiusKm` 1..100. */
  demand: (radiusKm: number, signal?: AbortSignal) => http.get<ProviderDemandResponse>(`${base}/demand`, { radiusKm }, signal),
  /** UTC; default the last 30 days, up to a year. */
  teamPerformance: (params: TeamPerformanceRequest, signal?: AbortSignal) => http.get<TeamPerformanceResponse>(`${base}/team-performance`, params, signal),
  /** Whole Riyadh days as `yyyy-MM-dd`, both included, up to a year. */
  technicianReport: (executorId: string, params: TechnicianReportRequest, signal?: AbortSignal) =>
    http.get<TechnicianReportResponse>(`${base}/technicians/${executorId}/report`, params, signal),
  technicianReportPdf: (executorId: string, params: TechnicianReportRequest) => http.blob(`${base}/technicians/${executorId}/report.pdf`, params, { timeout: 60_000 }),
  teamMap: (signal?: AbortSignal) => http.get<TeamMapResponse>(`${base}/team-map`, undefined, signal),
  /** Cached 12 h on the server; the same text the technician reads. */
  jobBrief: (serviceItemId: string, signal?: AbortSignal) => http.get<JobBriefResponse>(`${base}/jobs/${serviceItemId}/brief`, undefined, signal),

  // ── Tracking (SERVICE-TRACKING-PROVIDER-PLATFORM-PROMPT): always the caller's own company ──
  /** Whole Riyadh days as `yyyy-MM-dd`, both included; default the last 30, up to a year. */
  punctuality: (params: TrackingParams, signal?: AbortSignal) => http.get<PunctualityReportResponse>(`${base}/punctuality`, params, signal),
  quality: (params: TrackingParams, signal?: AbortSignal) => http.get<QualityReportResponse>(`${base}/quality`, params, signal),
  /** Current state, no period. */
  cash: (branchId: string | undefined, signal?: AbortSignal) => http.get<CashHoldingsResponse>(`${base}/cash`, { branchId }, signal),
  /** `handedOver: true`: what was recorded as received in the last 30 days instead of what is held. */
  cashItems: (executorId: string, handedOver: boolean, branchId: string | undefined, signal?: AbortSignal) =>
    http.get<CashItem[]>(`${base}/cash/items`, { executorId, handedOver, branchId }, signal),
  /** `CashHandoverInvalid` (an item is no longer cash held by this company's technicians), `CashHandoverTooMany` (> 200). */
  cashHandover: (body: CashHandoverRequest) => http.post<CashHandoverResponse>(`${base}/cash/handover`, body),

  /**
   * The counter report (PROVIDER-BRANCHES phase 5 §8, parts in phase 6 §12): local days `yyyy-MM-dd`, both included, default
   * the last 30, up to 366 (`ReportRangeInvalid`, `ReportRangeTooLong`). A counter service counts for the branch that received it.
   */
  counter: (params: CounterReportParams, signal?: AbortSignal) => http.get<CounterReportResponse>(`${base}/counter`, params, signal),
}

export interface CounterReportParams {
  from: string
  to: string
  branchId?: string
}

export interface TrackingParams {
  from: string
  to: string
  executorId?: string
  /** The branch switcher scope (PROVIDER-BRANCHES phase 1 §5). */
  branchId?: string
}

export const insightKeys = {
  demand: (radiusKm: number) => [...qk.insights, 'demand', radiusKm] as const,
  performance: (params: object) => [...qk.insights, 'performance', params] as const,
  report: (executorId: string, params: object) => [...qk.insights, 'report', executorId, params] as const,
  map: [...qk.insights, 'team-map'] as const,
  brief: (serviceItemId: string) => [...qk.insights, 'brief', serviceItemId] as const,
  punctuality: (params: TrackingParams) => [...qk.insights, 'punctuality', params] as const,
  quality: (params: TrackingParams) => [...qk.insights, 'quality', params] as const,
  /** Prefix of the holdings and every technician's items: a handover refreshes all of them. */
  cash: [...qk.insights, 'cash'] as const,
  cashHoldings: (branchId?: string) => [...qk.insights, 'cash', 'holdings', branchId ?? 'all'] as const,
  counter: (params: CounterReportParams) => [...qk.insights, 'counter', params] as const,
  cashItems: (executorId: string, handedOver: boolean, branchId?: string) => [...qk.insights, 'cash', 'items', executorId, handedOver, branchId ?? 'all'] as const,
}
