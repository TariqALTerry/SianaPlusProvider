import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckCheck } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { DataTable } from '@/components/DataTable'
import { DateTime } from '@/components/Format'
import { EnumFilter } from '@/components/Filters'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { CheckboxField } from '@/components/ui/checkbox'
import { useAction } from '@/hooks/useAction'
import { paginationDefaults, useUrlState } from '@/hooks/useUrlState'
import { qk } from '@/api/keys'
import { listQueryOptions } from '@/api/queryClient'
import type { NotificationResponse, NotificationType } from '@/api/types'
import { cn } from '@/lib/utils'
import { notificationHref, notificationKeys, notificationsApi, useUnreadCount } from './api'

const schema = { ...paginationDefaults, type: '', unread: false }

export function NotificationsPage() {
  const { t } = useTranslation()
  const { state, set, reset, active } = useUrlState(schema)
  const unread = useUnreadCount()
  const navigate = useNavigate()

  const params = {
    page: state.page,
    pageSize: state.pageSize,
    type: (state.type || undefined) as NotificationType | undefined,
    isRead: state.unread ? false : undefined,
  }
  const query = useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: ({ signal }) => notificationsApi.list(params, signal),
    ...listQueryOptions,
  })

  const markRead = useAction({ mutationFn: notificationsApi.markRead, invalidate: [qk.notifications] })
  const markAll = useAction({ mutationFn: notificationsApi.markAllRead, invalidate: [qk.notifications] })

  const columns = useMemo<ColumnDef<NotificationResponse, unknown>[]>(
    () => [
      {
        id: 'title',
        header: t('notifications.title'),
        meta: { alwaysVisible: true },
        cell: ({ row }) => (
          <div className={cn('min-w-0', !row.original.isRead && 'font-medium')}>
            <div className="flex items-center gap-2">
              {!row.original.isRead && <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden />}
              <span className="truncate">{row.original.title}</span>
            </div>
            <p className="line-clamp-2 text-xs font-normal text-muted-foreground">{row.original.body}</p>
          </div>
        ),
      },
      { id: 'type', header: t('common.status'), cell: ({ row }) => <StatusBadge enum="NotificationType" value={row.original.type} /> },
      { id: 'createdAt', header: t('common.createdAt'), cell: ({ row }) => <DateTime value={row.original.createdAt} /> },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) =>
          !row.original.isRead && (
            <Button variant="ghost" size="xs" onClick={() => markRead.mutate(row.original.id)}>
              {t('notifications.markRead')}
            </Button>
          ),
      },
    ],
    [t, markRead],
  )

  return (
    <>
      <PageHeader
        title={t('notifications.title')}
        actions={
          <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={!unread.data?.count} loading={markAll.isPending}>
            <CheckCheck /> {t('notifications.markAllRead')}
          </Button>
        }
      />
      <DataTable
        id="notifications"
        columns={columns}
        query={query}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={(page) => set({ page })}
        onPageSizeChange={(pageSize) => set({ pageSize })}
        getRowId={(r) => r.id}
        onRowClick={(n) => {
          if (!n.isRead) markRead.mutate(n.id)
          const href = notificationHref(n)
          if (href) navigate(href)
        }}
        filtered={active.length > 0}
        onClearFilters={() => reset()}
        toolbar={
          <>
            <EnumFilter enumName="NotificationType" value={state.type} onChange={(type) => set({ type })} label={t('common.status')} />
            <CheckboxField id="unread-only" checked={state.unread} onCheckedChange={(unread) => set({ unread })} label={t('notifications.unreadOnly')} />
          </>
        }
      />
    </>
  )
}
