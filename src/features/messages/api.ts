import { useQuery } from '@tanstack/react-query'
import { http } from '@/api/http'
import { qk } from '@/api/keys'
import type { ListParams, PaginatedResponse, ServiceConversationResponse, ServiceConversationSummary, ServiceInboxRequest, ServiceMessageResponse } from '@/api/types'
import { usePollingInterval } from '@/hooks/usePageVisible'

/**
 * `api/provider/messages` (PROVIDER-PLATFORM-PHASE2-PROMPT §2): one conversation per service between the
 * customer, the organization and the assigned technician. No phone numbers are ever shown.
 */
const base = '/api/provider/messages'

export const messagesApi = {
  /** Newest first. */
  inbox: (params: ListParams<ServiceInboxRequest>, signal?: AbortSignal) => http.get<PaginatedResponse<ServiceConversationSummary>>(base, params, signal),
  unreadCount: (signal?: AbortSignal) => http.get<number>(`${base}/unread-count`, undefined, signal),
  /** Opening it marks it read. */
  conversation: (serviceItemId: string, signal?: AbortSignal) => http.get<ServiceConversationResponse>(`${base}/${serviceItemId}`, undefined, signal),
  /** multipart: `text?` (≤ 2000) and/or `file?` (jpg/png/webp ≤ 5 MB). */
  send: (serviceItemId: string, text: string | null, file: File | null) => http.form<ServiceMessageResponse>(`${base}/${serviceItemId}`, { text }, file),
}

export const messageKeys = {
  unread: [...qk.messages, 'unread'] as const,
  inboxAll: [...qk.messages, 'inbox'] as const,
  inbox: (params: object) => [...qk.messages, 'inbox', params] as const,
  conversation: (serviceItemId: string) => [...qk.messages, 'conversation', serviceItemId] as const,
}

/** Sidebar badge: every 60 s while visible (§2). */
export function useUnreadMessages(enabled = true) {
  const interval = usePollingInterval(60_000)
  return useQuery({
    queryKey: messageKeys.unread,
    queryFn: ({ signal }) => messagesApi.unreadCount(signal),
    enabled,
    refetchInterval: enabled ? interval : false,
    staleTime: 30_000,
  })
}

export const MESSAGE_TEXT_MAX = 2000
export const MESSAGE_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const
