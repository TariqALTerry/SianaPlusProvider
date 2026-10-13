import { useEffect, useState } from 'react'
import { parseUtc } from '@/lib/format'

/** Whole seconds left until `until` (a UTC ISO string), ticking every second; 0 when passed. */
export function useCountdown(until: string | null | undefined): number {
  const target = until ? (parseUtc(until)?.valueOf() ?? 0) : 0
  const left = () => Math.max(0, Math.ceil((target - Date.now()) / 1000))
  const [seconds, setSeconds] = useState(left)

  useEffect(() => {
    setSeconds(left())
    if (!target) return
    const timer = window.setInterval(() => {
      const s = left()
      setSeconds(s)
      if (s === 0) window.clearInterval(timer)
    }, 1000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return seconds
}
