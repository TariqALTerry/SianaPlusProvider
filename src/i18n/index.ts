import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import { readItem, writeItem } from '@/lib/storage'
import ar from './ar.json'
import en from './en.json'

export const LANGUAGES = ['ar', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

export function isLanguage(value: unknown): value is Language {
  return value === 'ar' || value === 'en'
}

/** BCP 47 tags for Intl. Arabic keeps Latin digits: staff copy numbers into other systems. */
export const LOCALES: Record<Language, string> = { ar: 'ar-SA-u-nu-latn', en: 'en-GB' }

function initialLanguage(): Language {
  const stored = readItem<string | null>('language', null)
  if (isLanguage(stored)) return stored
  const env = import.meta.env.VITE_DEFAULT_LANG
  return isLanguage(env) ? env : 'ar'
}

export function applyDocumentLanguage(language: Language): void {
  document.documentElement.lang = language
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
}

const lng = initialLanguage()

void i18next.use(initReactI18next).init({
  resources: { ar: { common: ar }, en: { common: en } },
  lng,
  fallbackLng: 'ar',
  supportedLngs: [...LANGUAGES],
  defaultNS: 'common',
  fallbackNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
})

applyDocumentLanguage(lng)

export async function changeLanguage(language: Language): Promise<void> {
  await i18next.changeLanguage(language)
  writeItem('language', language)
  applyDocumentLanguage(language)
}

/**
 * Feature translations are registered by the feature's own module (loaded with its lazy
 * route), so feature folders never edit a shared locale file:
 *
 *   registerTranslations('orders', { ar: {...}, en: {...} })
 *   const { t } = useTranslation('orders')
 */
export function registerTranslations(ns: string, bundles: { ar: object; en: object }): void {
  if (!i18next.hasResourceBundle('ar', ns)) i18next.addResourceBundle('ar', ns, bundles.ar, true, true)
  if (!i18next.hasResourceBundle('en', ns)) i18next.addResourceBundle('en', ns, bundles.en, true, true)
}

/** `…Ar`/`…En` pair → the one matching the UI language, falling back to the other. */
export function pickLocalized(lang: string, ar: string | null | undefined, en: string | null | undefined): string {
  const primary = lang === 'en' ? en : ar
  const secondary = lang === 'en' ? ar : en
  return (primary && primary.trim()) || (secondary && secondary.trim()) || '—'
}

export { i18next }
