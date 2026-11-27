import { Siren } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Tooltip } from '@/components/ui/menu'
import { Badge } from '@/components/ui/badge'
import type { EmergencyItemInfo } from '@/api/types'
import { registerTranslations } from '@/i18n'
import { useLang } from '@/hooks/useLang'
import { formatMoney, formatTime } from '@/lib/format'

registerTranslations('emergencyBadge', {
  ar: {
    badge: 'طارئ',
    arriveBy: 'الوصول قبل {{time}}',
    late: 'متأخر عن الوعد',
    hint: '«فني الآن»: العميل وُعد بوصول الفني قبل {{time}}. رسوم الطوارئ {{fee}} ضمن مبلغ الخدمة لكم.',
  },
  en: {
    badge: 'Emergency',
    arriveBy: 'arrive by {{time}}',
    late: 'late vs promise',
    hint: '«Technician now»: the customer was promised arrival by {{time}}. The {{fee}} emergency fee is in the service amount, yours.',
  },
})

/**
 * «فني الآن» on a service (EMERGENCY-PROVIDER-PLATFORM-PROMPT): a red badge with the promised arrival, or only the siren in a
 * dense row. Nothing for any other service.
 */
export function EmergencyBadge({ emergency, compact }: { emergency: EmergencyItemInfo | null | undefined; compact?: boolean }) {
  const { t } = useTranslation('emergencyBadge')
  const { lang } = useLang()
  if (!emergency) return null
  const time = emergency.arriveBy ? formatTime(emergency.arriveBy) : '—'
  const hint = t('hint', { time, fee: formatMoney(emergency.fee, lang) })

  if (compact)
    return (
      <Tooltip content={hint}>
        <Siren className="size-3.5 shrink-0 text-tone-danger" aria-label={t('badge')} />
      </Tooltip>
    )

  return (
    <Badge tone="danger" title={hint}>
      <Siren className="size-3" aria-hidden /> {t('badge')}
      {emergency.arriveBy && !emergency.arrivedAt && <span className="font-normal">· {t('arriveBy', { time })}</span>}
      {emergency.isLate && !emergency.arrivedAt && <span>· {t('late')}</span>}
    </Badge>
  )
}
