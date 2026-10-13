import { useEffect, useSyncExternalStore } from 'react'
import { create } from 'zustand'

function subscribe(callback: () => void): () => void {
  document.addEventListener('visibilitychange', callback)
  return () => document.removeEventListener('visibilitychange', callback)
}

/** True while the tab is visible. Polling queries pass `refetchInterval: visible ? n : false`. */
export function usePageVisible(): boolean {
  return useSyncExternalStore(subscribe, () => document.visibilityState === 'visible', () => true)
}

/**
 * Pages with a strict idle request budget (the coverage map: ≤ 1 request / 5 min) pause the
 * shell's background polling (sidebar badges, notification bell) while they are open.
 */
const usePollingPause = create<{ pausers: number }>()(() => ({ pausers: 0 }))

export function usePauseBackgroundPolling(): void {
  useEffect(() => {
    usePollingPause.setState((s) => ({ pausers: s.pausers + 1 }))
    return () => usePollingPause.setState((s) => ({ pausers: Math.max(0, s.pausers - 1) }))
  }, [])
}

/**
 * Polling interval that pauses while the tab is hidden (§14.4) or while a page has paused
 * background polling. `refetchIntervalInBackground` stays false in TanStack Query.
 */
export function usePollingInterval(ms: number): number | false {
  const visible = usePageVisible()
  const paused = usePollingPause((s) => s.pausers > 0)
  return visible && !paused ? ms : false
}
