import { useSyncExternalStore } from 'react'

/** Live `matchMedia` result; `true` on the server/tests where matchMedia is missing. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : true),
    () => true,
  )
}

/** Tables collapse to cards below this width (§3 of the brief). */
export const useIsDesktopTable = () => useMediaQuery('(min-width: 768px)')
