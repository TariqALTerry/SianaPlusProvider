import { useQuery } from '@tanstack/react-query'
import { Bell, CheckCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { DateTime } from '@/components/Format'
import { Spinner } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/menu'
import { toneDot } from '@/components/ui/badge'
import { enumTone } from '@/i18n/enums'
import { useAction } from '@/hooks/useAction'
import { qk } from '@/api/keys'
import type { NotificationResponse } from '@/api/types'
import { cn } from '@/lib/utils'
import { notificationHref, notificationKeys, notificationsApi, useUnreadCount } from './api'

export function NotificationBell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const unread = useUnreadCount()
  const count = unread.data?.count ?? 0

  const latest = useQuery({
    queryKey: notificationKeys.list({ page: 1, pageSize: 8 }),
    queryFn: ({ signal }) => notificationsApi.list({ page: 1, pageSize: 8 }, signal),
    enabled: open,
  })

  const markRead = useAction({ mutationFn: notificationsApi.markRead, invalidate: [qk.notifications] })
  const markAll = useAction({ mutationFn: notificationsApi.markAllRead, invalidate: [qk.notifications] })

  const openItem = (n: NotificationResponse) => {
    if (!n.isRead) markRead.mutate(n.id)
    const href = notificationHref(n)
    setOpen(false)
    if (href) navigate(href)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`${t('shell.notifications')}${count ? ` (${count})` : ''}`}>
          <Bell />
          {count > 0 && (
            <span className="tabular absolute end-1 top-1 min-w-4 rounded-full bg-tone-danger px-1 text-[0.625rem] font-semibold leading-4 text-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">{t('shell.notifications')}</span>
          <Button variant="ghost" size="xs" onClick={() => markAll.mutate()} disabled={count === 0} loading={markAll.isPending}>
            <CheckCheck className="size-3.5" /> {t('notifications.markAllRead')}
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {latest.isPending ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : !latest.data?.items.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('notifications.empty')}</p>
          ) : (
            <ul>
              {latest.data.items.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => openItem(n)} className={cn('flex w-full gap-3 border-b px-3 py-2.5 text-start hover:bg-muted/60', !n.isRead && 'bg-primary-soft/40')}>
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.isRead ? 'bg-transparent' : toneDot[enumTone('NotificationType', n.type)])} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{n.title}</span>
                      <span className="line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>
                      <span className="mt-0.5 block text-[0.6875rem] text-muted-foreground">
                        <DateTime value={n.createdAt} />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t px-3 py-2 text-center text-xs font-medium text-primary hover:bg-muted/60">
          {t('notifications.viewAll')}
        </Link>
      </PopoverContent>
    </Popover>
  )
}
