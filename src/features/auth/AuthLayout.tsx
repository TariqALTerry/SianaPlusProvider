import { Languages, Moon, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/app/theme'
import { useLang } from '@/hooks/useLang'
import { changeLanguage } from '@/i18n'

/** The logo mark sits on light surfaces only (§3), so it gets its own white tile on dark ones. */
export function LogoMark({ className = 'size-10' }: { className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm ${className}`}>
      <img src="/logo-mark.png" alt="" className="size-full object-contain" />
    </span>
  )
}

/**
 * Public pages (sign-in, join): a deep brand hero with the pattern on wide screens, the form on
 * a calm surface. On phones the hero shrinks to a header strip.
 */
export function AuthLayout({ heroTitle, heroBody, children }: { heroTitle: string; heroBody: string; children: ReactNode }) {
  const { t } = useTranslation()
  const { lang } = useLang()
  const { theme, setTheme } = useTheme()
  const dark = theme === 'dark' || (theme === 'system' && document.documentElement.classList.contains('dark'))

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <aside className="hero-gradient relative overflow-hidden text-white lg:flex lg:w-[44%] lg:flex-col lg:justify-between lg:p-12">
        <div className="brand-pattern absolute inset-0 opacity-90" aria-hidden />
        <div className="relative flex items-center gap-3 px-5 py-4 lg:p-0">
          <LogoMark />
          <div className="leading-tight">
            <div className="text-lg font-semibold">{t('app.name')}</div>
            <div className="text-xs text-brand-mint">{t('app.subtitle')}</div>
          </div>
        </div>
        <div className="relative hidden max-w-md space-y-4 lg:block">
          <h2 className="text-3xl font-bold leading-snug">{heroTitle}</h2>
          <p className="text-base leading-relaxed text-white/80">{heroBody}</p>
          <div className="h-1 w-16 rounded-full bg-brand-yellow" aria-hidden />
        </div>
        <div className="relative hidden text-xs text-white/50 lg:block">© {new Date().getFullYear()} {t('app.name')}</div>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-end gap-1 p-3">
          <Button variant="ghost" size="icon" onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={t('shell.theme')}>
            {dark ? <Sun /> : <Moon />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void changeLanguage(lang === 'ar' ? 'en' : 'ar')}>
            <Languages /> {t('shell.switchLanguage')}
          </Button>
        </div>
        <div className="flex flex-1 items-start justify-center px-4 pb-10 pt-2 sm:items-center">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  )
}
