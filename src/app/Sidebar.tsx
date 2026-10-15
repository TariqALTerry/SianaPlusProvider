import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { Tooltip } from '@/components/ui/menu'
import { StatusBadge } from '@/components/StatusBadge'
import { useIncoming } from '@/features/incoming/queries'
import { useUnreadMessages } from '@/features/messages/api'
import { LogoMark } from '@/features/auth/AuthLayout'
import { useLang } from '@/hooks/useLang'
import { cn } from '@/lib/utils'
import { visibleNav, type NavBadge, type NavItem } from './nav'
import { useProvider } from './provider'

function matches(item: NavItem, pathname: string): boolean {
  if (item.end) return pathname === item.to
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

/** Only the most specific match lights up: /team/map highlights الخريطة, not الفريق too. */
function isActive(item: NavItem, pathname: string, all: readonly NavItem[]): boolean {
  if (!matches(item, pathname)) return false
  return !all.some((other) => other !== item && other.to.length > item.to.length && other.to.startsWith(item.to) && matches(other, pathname))
}

/** The deep sidebar (§3, §8). */
export function Sidebar({ collapsed, onToggle, onNavigate }: { collapsed: boolean; onToggle?: () => void; onNavigate?: () => void }) {
  const { t } = useTranslation()
  const { isRtl } = useLang()
  const { pathname } = useLocation()
  const ctx = useProvider()
  const incoming = useIncoming(ctx.mode === 'full')
  const unreadMessages = useUnreadMessages(ctx.mode === 'full')
  const badges: Record<NavBadge, number | undefined> = { incoming: incoming.data?.length, messages: unreadMessages.data }
  const items = visibleNav(ctx)
  const CollapseIcon = collapsed !== isRtl ? ChevronsRight : ChevronsLeft

  return (
    <nav className="flex h-full flex-col bg-sidebar text-sidebar-foreground" aria-label="Main">
      <div className={cn('flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-4', collapsed && 'justify-center px-2')}>
        <LogoMark className="size-9" />
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold text-white">{t('app.name')}</div>
            <div className="truncate text-xs text-brand-mint">{t('app.subtitle')}</div>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="mx-3 mt-3 rounded-lg bg-white/5 px-3 py-2.5">
          <div className="truncate text-sm font-medium text-white" title={ctx.org.displayName}>
            {ctx.org.displayName}
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="ltr-nums truncate font-latin text-[0.6875rem] text-sidebar-muted">{ctx.org.tenantCode}</span>
            <StatusBadge enum="ProviderVerificationStatus" value={ctx.org.verificationStatus} className="bg-white/90" />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 [scrollbar-width:thin]">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active = isActive(item, pathname, items)
            const count = item.badge ? badges[item.badge] : undefined
            const label = t(`nav.${item.label}`)
            const link = (
              <Link
                to={item.to}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors',
                  active ? 'bg-primary font-medium text-white shadow-sm' : 'text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-white',
                  collapsed && 'justify-center px-2',
                  item.sub && !collapsed && 'h-9 ps-9 text-[0.8125rem]',
                )}
              >
                <item.icon className="size-[1.125rem] shrink-0" aria-hidden />
                {!collapsed && <span className="flex-1 truncate">{label}</span>}
                {!!count && count > 0 && (
                  <span
                    className={cn(
                      'tabular rounded-full bg-brand-yellow px-1.5 text-[0.6875rem] font-bold leading-5 text-brand-deep',
                      collapsed && 'absolute -top-0.5 end-0.5 px-1 leading-4',
                    )}
                    aria-label={`${count}`}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </Link>
            )
            return (
              <li key={item.to}>
                {collapsed ? (
                  <Tooltip content={label} side={isRtl ? 'left' : 'right'}>
                    {link}
                  </Tooltip>
                ) : (
                  link
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="flex h-11 shrink-0 items-center justify-center gap-2 border-t border-white/10 text-xs text-sidebar-muted hover:text-white"
          aria-label={collapsed ? t('shell.expand') : t('shell.collapse')}
        >
          <CollapseIcon className="size-4" />
          {!collapsed && t('shell.collapse')}
        </button>
      )}
    </nav>
  )
}
