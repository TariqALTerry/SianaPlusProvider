import { Languages, LogOut, Menu, Monitor, Moon, Sun, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/menu'
import { useAuthStore } from '@/features/auth/authStore'
import { NotificationBell } from '@/features/notifications/NotificationBell'
import { changeLanguage } from '@/i18n'
import { useLang } from '@/hooks/useLang'
import { formatSaudiMobile } from '@/lib/phone'
import { useTheme, type Theme } from './theme'

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { t } = useTranslation()
  const { lang } = useLang()
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const { theme, setTheme } = useTheme()

  const themes: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
    { value: 'light', label: t('shell.themeLight'), icon: Sun },
    { value: 'dark', label: t('shell.themeDark'), icon: Moon },
    { value: 'system', label: t('shell.themeSystem'), icon: Monitor },
  ]
  const ThemeIcon = themes.find((x) => x.value === theme)?.icon ?? Monitor
  const isOwner = user?.role === 'ProviderOwner'

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-surface/90 px-3 backdrop-blur md:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMenu} aria-label={t('shell.openMenu')}>
        <Menu />
      </Button>
      <div className="min-w-0 flex-1 truncate text-sm font-medium lg:hidden">{t('app.name')}</div>

      <div className="ms-auto flex items-center gap-1">
        <NotificationBell />

        <Button variant="ghost" size="sm" onClick={() => void changeLanguage(lang === 'ar' ? 'en' : 'ar')} aria-label={t('shell.language')}>
          <Languages />
          <span className="hidden sm:inline">{t('shell.switchLanguage')}</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t('shell.theme')}>
              <ThemeIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {themes.map((x) => (
              <DropdownMenuCheckboxItem key={x.value} checked={theme === x.value} onCheckedChange={() => setTheme(x.value)}>
                <x.icon className="size-4" /> {x.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 px-2" aria-label={t('shell.account')}>
              <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-primary">
                <User className="size-4" />
              </span>
              <span className="hidden max-w-[10rem] truncate md:inline">{user?.fullName || user?.username}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60">
            <DropdownMenuLabel className="space-y-1">
              <div className="truncate text-sm font-medium text-foreground">{user?.fullName || user?.username}</div>
              {user?.phoneNumber && (
                <div className="ltr-nums truncate font-latin font-normal tabular">{formatSaudiMobile(user.phoneNumber)}</div>
              )}
              <Badge tone={isOwner ? 'active' : 'info'}>{isOwner ? t('shell.owner') : t('shell.supervisor')}</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => void signOut()}>
              <LogOut /> {t('shell.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
