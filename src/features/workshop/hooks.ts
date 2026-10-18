import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLang } from '@/hooks/useLang'
import { enumLabel } from '@/i18n/enums'
import { trackingKeys } from './api'
import { trackingError, trackingErrorCode } from './logic'
import './i18n'

/**
 * A tracking dialog's error in the platform's words (`CustodyStepInvalid` names both stages). When the device
 * moved under the dialog (`CustodyStepInvalid`) or the service closed, the tracking view is refetched.
 */
export function useTrackingError(error: unknown, serviceItemId: string) {
  const { t } = useTranslation('workshop')
  const { lang } = useLang()
  const queryClient = useQueryClient()
  const code = trackingErrorCode(error)

  useEffect(() => {
    if (code === 'CustodyStepInvalid' || code === 'ServiceItemClosed') {
      void queryClient.invalidateQueries({ queryKey: trackingKeys.tracking(serviceItemId) })
    }
  }, [code, error, queryClient, serviceItemId])

  return useMemo(
    () =>
      trackingError(error, (c, d) => {
        if (c !== 'CustodyStepInvalid') return t(`errors.${c}`)
        return typeof d.from === 'string' && typeof d.to === 'string'
          ? t('errors.CustodyStepInvalid', { from: enumLabel('DeviceCustodyStage', d.from, lang), to: enumLabel('DeviceCustodyStage', d.to, lang) })
          : t('errors.CustodyStepInvalidPlain')
      }),
    [error, t, lang],
  )
}
