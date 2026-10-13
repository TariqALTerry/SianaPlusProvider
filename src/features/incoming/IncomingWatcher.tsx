import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { pickLocalized } from '@/i18n'
import { playChime, showDesktopAlert } from './alerts'
import { useIncoming } from './queries'

/**
 * Lives in the shell (full mode only): compares each Incoming poll with the previous one and
 * announces items that were not there before — chime + desktop notification.
 */
export function IncomingWatcher() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { data } = useIncoming()
  const seen = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (!data) return
    const ids = new Set(data.map((i) => i.id))
    if (seen.current) {
      const fresh = data.filter((i) => !seen.current!.has(i.id))
      if (fresh.length > 0) {
        playChime()
        const first = fresh[0]!
        const service = pickLocalized(i18n.language, first.serviceNameAr, first.serviceNameEn)
        const where = [first.district, first.city].filter(Boolean).join('، ')
        showDesktopAlert(
          t('nav.incoming'),
          fresh.length === 1 ? [service, where].filter(Boolean).join(' — ') : `${fresh.length} × ${service}`,
          () => navigate('/incoming'),
        )
      }
    }
    seen.current = ids
  }, [data, t, i18n.language, navigate])

  return null
}
