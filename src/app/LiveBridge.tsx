import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { startLive, stopLive } from '@/api/live'

/** Opens the live connection for the signed-in session (LIVE-UPDATES-PROMPT) and closes it on the way out. */
export function LiveBridge() {
  const queryClient = useQueryClient()
  useEffect(() => {
    void startLive(queryClient)
    return () => void stopLive()
  }, [queryClient])
  return null
}
