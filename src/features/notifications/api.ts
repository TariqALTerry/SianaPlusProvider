import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { http } from '@/api/http'
import { qk } from '@/api/keys'
import type { ListParams, NotificationListRequest, NotificationResponse, PaginatedResponse, UnreadCountResponse } from '@/api/types'
import { usePollingInterval } from '@/hooks/usePageVisible'
import { useWebPush } from '@/features/push/webPush'

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
  // A push refreshes the bell at once (PHASE2 §8), so with browser notifications on the poll slows to 5 minutes.
  const pushOn = useWebPush((s) => s.state === 'on')
  const interval = usePollingInterval(pushOn ? 5 * 60_000 : 60_000)
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

/**
 * The service-tracking alerts to management ("لا تحديث على {الخدمة}" after 72 h, "رتّب إرجاع {الخدمة}"). They share
 * `referenceType = "ServiceItem"` with every other service notification and carry no key, so the localized title
 * (`ServiceUpdateOverdueTitle`, `ReturnTripNeededTitle` in the backend resources) tells them apart.
 */
const TRACKING_ALERT_TITLE = /^(لا تحديث على|رتّب إرجاع|رتب إرجاع|No update on|Plan the return of)\s/i

export function isTrackingAlert(title: string | null | undefined): boolean {
  return !!title && TRACKING_ALERT_TITLE.test(title.trim())
}

/** Deep links (§8.14); anything else is only marked read. Tracking alerts open the item's "التتبع" tab. */
export function notificationHref(n: Pick<NotificationResponse, 'referenceId' | 'referenceType'> & { title?: string | null }): string | null {
  switch (n.referenceType) {
    case 'ServiceItem':
      if (!n.referenceId) return null
      return isTrackingAlert(n.title) ? `/work/${n.referenceId}?tab=tracking` : `/work/${n.referenceId}`
    case 'MarketplaceRequest':
      return n.referenceId ? `/marketplace/${n.referenceId}` : null
    case 'ProviderOrganization':
      return '/organization'
    case 'ServiceItemConversation':
      return n.referenceId ? `/messages/${n.referenceId}` : '/messages'
    case 'ProviderWithdrawal':
      return '/wallet?tab=withdrawals'
    case 'Settlement':
      return n.referenceId ? `/settlements/${n.referenceId}` : '/settlements'
    case 'Dispute':
      return n.referenceId ? `/disputes/${n.referenceId}` : '/disputes'
    case 'SupportTicket':
      return n.referenceId ? `/support/${n.referenceId}` : '/support'
    default:
      return null
  }
}
