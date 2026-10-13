import { useTranslation } from 'react-i18next'
import { pickLocalized, type Language } from '@/i18n'

/** Current UI language plus the `…Ar/…En` picker bound to it. */
export function useLang() {
  const { i18n } = useTranslation()
  const lang: Language = i18n.language === 'en' ? 'en' : 'ar'
  return {
    lang,
    isRtl: lang === 'ar',
    pick: (ar: string | null | undefined, en: string | null | undefined) => pickLocalized(lang, ar, en),
  }
}
