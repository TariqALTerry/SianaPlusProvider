import { http } from '@/api/http'
import type {
  ConfirmStaffAssistantActionRequest,
  SendStaffAssistantMessageRequest,
  StaffAssistantActionResultResponse,
  StaffAssistantBriefResponse,
  StaffAssistantConversationResponse,
  StaffAssistantConversationSummaryResponse,
  StaffAssistantSectionsResponse,
  StaffAssistantTurnResponse,
  StartStaffAssistantConversationRequest,
} from '@/api/types'
import type { PaginatedResponse } from '@/api/types'
import { ASSISTANT_BASE } from './config'
import { streamTurn, type StreamHandlers } from './stream'

export const assistantKeys = {
  all: ['staffAssistant'] as const,
  sections: () => [...assistantKeys.all, 'sections'] as const,
  brief: () => [...assistantKeys.all, 'brief'] as const,
  list: () => [...assistantKeys.all, 'list'] as const,
  conversation: (id: string) => [...assistantKeys.all, 'conversation', id] as const,
}

export const assistantApi = {
  sections: (signal?: AbortSignal) => http.get<StaffAssistantSectionsResponse>(`${ASSISTANT_BASE}/sections`, undefined, signal),
  brief: (signal?: AbortSignal) => http.get<StaffAssistantBriefResponse>(`${ASSISTANT_BASE}/brief`, undefined, signal),
  start: (body: StartStaffAssistantConversationRequest) => http.post<StaffAssistantConversationResponse>(`${ASSISTANT_BASE}/conversations`, body),
  list: (signal?: AbortSignal) =>
    http.get<PaginatedResponse<StaffAssistantConversationSummaryResponse>>(`${ASSISTANT_BASE}/conversations`, { page: 1, pageSize: 20 }, signal),
  get: (id: string, signal?: AbortSignal) => http.get<StaffAssistantConversationResponse>(`${ASSISTANT_BASE}/conversations/${id}`, undefined, signal),
  /** The reply takes a few seconds (model + tools): longer than the default timeout. */
  send: (id: string, body: SendStaffAssistantMessageRequest) =>
    http.post<StaffAssistantTurnResponse>(`${ASSISTANT_BASE}/conversations/${id}/messages`, body, { timeout: 120_000 }),
  stream: (id: string, body: SendStaffAssistantMessageRequest, handlers: StreamHandlers<StaffAssistantTurnResponse>, signal?: AbortSignal) =>
    streamTurn(`${ASSISTANT_BASE}/conversations/${id}/messages/stream`, body, handlers, signal),
  confirm: (actionId: string, body: ConfirmStaffAssistantActionRequest) =>
    http.post<StaffAssistantActionResultResponse>(`${ASSISTANT_BASE}/actions/${actionId}/confirm`, body, { timeout: 60_000 }),
  reject: (actionId: string) => http.post<StaffAssistantActionResultResponse>(`${ASSISTANT_BASE}/actions/${actionId}/reject`),
}
