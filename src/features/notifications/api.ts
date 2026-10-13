import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { http } from '@/api/http'
import { qk } from '@/api/keys'
import type { ListParams, NotificationListRequest, NotificationResponse, PaginatedResponse, UnreadCountResponse } from '@/api/types'
import { usePollingInterval } from '@/hooks/usePageVisible'

export const notificationsApi = {
  list: (params: ListParams<NotificationListRequest>, signal?: AbortSignal) =>
    http.get<PaginatedResponse<NotificationResponse>>('/api/me/notifications', params, signal),
  unreadCount: (signal?: AbortSignal) => http.get<UnreadCountResponse>('/api/me/notifications/unread-count', undefined, signal),
  markRead: (id: string) => http.patch(`/api/me/notifications/${id}/read`),
  markAllRead: () => http.post<number>('/api/me/notifications/mark-all-read'),
}

export const notificationKeys = {
  unread: [...qk.notifications, 'unread'] as const,
  list: (params: object) => [...qk.notifications, 'list', params] as const,
}

/**
 * Unread count for the bell: every 60 s while visible (§10). When it grows, a new notification
 * arrived — usually "assigned to you" — so Incoming and the dashboard refresh too (§8.14).
 */
export function useUnreadCount() {
  const interval = usePollingInterval(60_000)
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: notificationKeys.unread,
    queryFn: ({ signal }) => notificationsApi.unreadCount(signal),
    refetchInterval: interval,
    staleTime: 30_000,
  })

  const previous = useRef<number | null>(null)
  const count = query.data?.count
  useEffect(() => {
    if (count === undefined) return
    if (previous.current !== null && count > previous.current) {
      void queryClient.invalidateQueries({ queryKey: qk.incoming })
      void queryClient.invalidateQueries({ queryKey: qk.dashboard })
    }
    previous.current = count
  }, [count, queryClient])

  return query
}

/** Deep links (§8.14); anything else is only marked read. */
export function notificationHref(n: Pick<NotificationResponse, 'referenceId' | 'referenceType'>): string | null {
  switch (n.referenceType) {
    case 'ServiceItem':
      return n.referenceId ? `/work/${n.referenceId}` : null
    case 'MarketplaceRequest':
      return n.referenceId ? `/marketplace/${n.referenceId}` : null
    case 'ProviderOrganization':
      return '/organization'
    default:
      return null
  }
}
