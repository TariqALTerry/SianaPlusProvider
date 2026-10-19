import { useQuery } from '@tanstack/react-query'
import { ApiError, http, toApiError } from '@/api/http'
import { qk } from '@/api/keys'
import type {
  ListParams,
  PaginatedResponse,
  SupportTicketCategory,
  SupportTicketListRequest,
  SupportTicketPriority,
  SupportTicketResponse,
  SupportTicketSummaryResponse,
} from '@/api/types'
import { usePollingInterval } from '@/hooks/usePageVisible'
import { i18next } from '@/i18n'
import './i18n'

/**
 * `ProviderSupportController` (SUPPORT-TICKETS-PROVIDER-PLATFORM-PROMPT §1): the owner's or supervisor's own
 * tickets about the platform. Each user sees only theirs.
 */
const base = '/api/provider/support/tickets'

export type SupportListParams = ListParams<SupportTicketListRequest>

/** Codes the support endpoints raise, worded by the platform (`support:errors.<code>`); others keep the server's text. */
export const SUPPORT_ERROR_CODES = [
  'SupportTicketNotFound',
  'SupportTicketClosed',
  'SupportMessageEmpty',
  'SupportMessageTooLong',
  'SupportAttachmentInvalid',
  'SupportTooManyAttachments',
  'SupportSubjectRequired',
  'SupportSubjectTooLong',
  'SupportDescriptionRequired',
  'SupportDescriptionTooLong',
  'SupportCategoryInvalid',
  'SupportCategoryNotAllowed',
  'SupportPriorityInvalid',
  'ServiceItemNotFound',
] as const

async function worded<T>(request: Promise<T>): Promise<T> {
  try {
    return await request
  } catch (error) {
    const e = toApiError(error)
    if (!e.errorCode || !(SUPPORT_ERROR_CODES as readonly string[]).includes(e.errorCode)) throw error
    throw new ApiError({ status: e.status, errorCode: e.errorCode, message: i18next.t(`support:errors.${e.errorCode}`), details: undefined })
  }
}

/** Multipart body: repeated `files` fields; empty values are left out so the server applies its defaults. */
export function toFormData(fields: Record<string, string | null | undefined>, files: readonly File[]): FormData {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) if (value) form.append(key, value)
  for (const file of files) form.append('files', file)
  return form
}

export interface NewTicketInput {
  subject: string
  description: string
  category: SupportTicketCategory
  /** Empty = the server's default (Normal). */
  priority: SupportTicketPriority | ''
  /** "مشكلة في هذه الخدمة": one of the organization's work items. */
  serviceItemId: string | null
  files: File[]
}

export const supportApi = {
  /** Latest activity first. */
  list: (params: SupportListParams, signal?: AbortSignal) => http.get<PaginatedResponse<SupportTicketSummaryResponse>>(base, params, signal),
  unreadCount: (signal?: AbortSignal) => http.get<number>(`${base}/unread-count`, undefined, signal),
  /** Also marks the ticket read. */
  detail: (id: string, signal?: AbortSignal) => worded(http.get<SupportTicketResponse>(`${base}/${id}`, undefined, signal)),
  create: (input: NewTicketInput) =>
    worded(
      http.post<SupportTicketResponse>(
        base,
        toFormData(
          {
            subject: input.subject.trim(),
            description: input.description.trim(),
            category: input.category,
            priority: input.priority,
            serviceItemId: input.serviceItemId,
          },
          input.files,
        ),
      ),
    ),
  /** Reopens a ticket waiting for the reply or marked solved; refused once closed (`SupportTicketClosed`). */
  reply: (id: string, body: string, files: readonly File[]) => worded(http.post<SupportTicketResponse>(`${base}/${id}/messages`, toFormData({ body: body.trim() }, files))),
  close: (id: string) => worded(http.post<SupportTicketResponse>(`${base}/${id}/close`)),
}

export const supportKeys = {
  all: qk.support,
  lists: () => [...qk.support, 'list'] as const,
  list: (params: SupportListParams) => [...qk.support, 'list', params] as const,
  unread: () => [...qk.support, 'unread'] as const,
  detail: (id: string) => [...qk.support, 'detail', id] as const,
}

/** A write changes the ticket, the lists and the badge. */
export const SUPPORT_INVALIDATION = [qk.support] as const

/** The sidebar badge: every 60 s while visible; a ticket push refreshes it at once. */
export function useSupportUnread(enabled = true) {
  const interval = usePollingInterval(60_000)
  return useQuery({
    queryKey: supportKeys.unread(),
    queryFn: ({ signal }) => supportApi.unreadCount(signal),
    enabled,
    refetchInterval: enabled ? interval : false,
    staleTime: 30_000,
  })
}
