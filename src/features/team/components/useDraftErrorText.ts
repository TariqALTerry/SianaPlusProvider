import { useTranslation } from 'react-i18next'
import type { DraftError } from '../utils'
import '../i18n'

/** Client-side error key → message. */
export function useDraftErrorText() {
  const { t } = useTranslation('team')
  return (error: DraftError | undefined): string | undefined => {
    switch (error) {
      case 'required':
        return t('common:validation.required')
      case 'phone':
        return t('validation.phone')
      case 'email':
        return t('common:validation.email')
      case 'range':
        return t('validation.maxJobs')
      default:
        return undefined
    }
  }
}
