import { useTranslation } from 'react-i18next'
import { useLive } from '@/api/live'
import { cn } from '@/lib/utils'

/** «مباشر» while the live connection is up; «تحديث دوري» otherwise (the page polls). */
export function LiveBadge({ className }: { className?: string }) {
  const { t } = useTranslation()
  const status = useLive((s) => s.status)
  const live = status === 'live'
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium', live ? 'bg-tone-success-soft text-tone-success' : 'bg-muted text-muted-foreground', className)}
      title={t(live ? 'live.onHint' : 'live.offHint')}
    >
      <span className={cn('size-1.5 rounded-full', live ? 'animate-pulse bg-tone-success' : 'bg-muted-foreground')} />
      {t(live ? 'live.on' : status === 'reconnecting' ? 'live.reconnecting' : 'live.off')}
    </span>
  )
}
