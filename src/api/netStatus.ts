import { create } from 'zustand'

/**
 * Transport-level state the UI surfaces quietly: the 429 back-off banner and the sliding
 * one-minute request counter that gates prefetching (§14.3 of the brief).
 */
interface NetStatusState {
  rateLimitedUntil: number | null
  setRateLimitedUntil: (until: number | null) => void
}

export const useNetStatus = create<NetStatusState>()((set) => ({
  rateLimitedUntil: null,
  setRateLimitedUntil: (until) => set({ rateLimitedUntil: until }),
}))

const WINDOW_MS = 60_000
const timestamps: number[] = []

export function recordRequest(now = Date.now()): void {
  timestamps.push(now)
  prune(now)
}

function prune(now: number): void {
  while (timestamps.length && now - timestamps[0]! > WINDOW_MS) timestamps.shift()
}

export function requestsInLastMinute(now = Date.now()): number {
  prune(now)
  return timestamps.length
}

/** Prefetching is a luxury: only when comfortably under the 120/min server budget. */
export const PREFETCH_BUDGET = 60

export function canPrefetch(): boolean {
  return requestsInLastMinute() < PREFETCH_BUDGET && useNetStatus.getState().rateLimitedUntil === null
}
