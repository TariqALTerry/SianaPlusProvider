import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { normalizeGateCode } from './logic'
import './i18n'

/**
 * The sentence for a counter gate code (`CounterModuleDisabled`, `BranchInactive`, …). Importing this registers the
 * `counter` translations, so a page outside the counter (the subscription page) gets the text even when the counter
 * route was never opened. An unknown or empty code reads `gate.fallback`, never the raw key.
 */
export function useGateText(): (code: string | null | undefined) => string {
  const { t } = useTranslation('counter')
  return useCallback(
    (code) => {
      const bare = normalizeGateCode(code)
      const fallback = t('gate.fallback')
      return bare ? t(`gate.${bare}`, { defaultValue: fallback }) : fallback
    },
    [t],
  )
}
