import { Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tooltip } from '@/components/ui/menu'
import { useLang } from '@/hooks/useLang'
import { formatDateTime, formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import '../i18n'
import { closingState } from '../offer'

/** Re-renders every 30 s so the countdown stays honest on an open page. */
function useTick(ms = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

/** "يغلق خلال 2ي 4س" with the absolute Riyadh time in a tooltip; red under an hour. */
export function Countdown({ closesAt, className }: { closesAt: string | null | undefined; className?: string }) {
  const { t } = useTranslation('marketplace')
  const { lang } = useLang()
  const now = useTick()
  const state = closingState(closesAt, now)

  if (state.kind === 'none') return <span className={cn('text-xs text-muted-foreground', className)}>{t('countdown.noDeadline')}</span>

  const label =
    state.kind === 'closed'
      ? t('countdown.closed')
      : state.minutes < 1
        ? t('countdown.lessThanMinute')
        : t('countdown.closesIn', { time: formatDuration(state.minutes, lang) })

  const tone =
    state.kind === 'closed'
      ? 'text-muted-foreground'
      : state.tone === 'urgent'
        ? 'text-tone-danger font-medium'
        : state.tone === 'soon'
          ? 'text-tone-attention'
          : 'text-foreground'

  return (
    <Tooltip content={formatDateTime(closesAt, lang)}>
      <span className={cn('tabular inline-flex items-center gap-1 whitespace-nowrap text-xs', tone, className)}>
        <Clock className="size-3.5 shrink-0" aria-hidden />
        {label}
      </span>
    </Tooltip>
  )
}
