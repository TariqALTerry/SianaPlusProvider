import { API_ORIGIN, ApiError, refreshAccessToken } from '@/api/http'
import { session } from '@/api/session'
import type { ApiResponse } from '@/api/types'

export interface StreamHandlers<T> {
  /** The model is thinking, or a tool is running (its name). */
  onStatus?: (stage: string, tool: string | null) => void
  /** More of the reply's text. */
  onDelta?: (text: string) => void
  /** The text so far was not the reply (the model went on to a tool): clear it. */
  onReset?: () => void
  onDone: (result: T) => void
}

interface SseEvent {
  event: string
  data: string
}

/** Splits a Server-Sent Events buffer into complete events; returns the unfinished tail. */
export function parseSse(buffer: string): { events: SseEvent[]; rest: string } {
  const events: SseEvent[] = []
  const blocks = buffer.replace(/\r\n/g, '\n').split('\n\n')
  const rest = blocks.pop() ?? ''
  for (const block of blocks) {
    let event = 'message'
    const data: string[] = []
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) data.push(line.slice(5).trimStart())
    }
    if (data.length > 0) events.push({ event, data: data.join('\n') })
  }
  return { events, rest }
}

function language(): string {
  return document.documentElement.lang === 'en' ? 'en' : 'ar'
}

async function errorOf(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as Partial<ApiResponse<unknown>>
    return new ApiError({ status: response.status, errorCode: body.errorCode ?? null, message: body.message || response.statusText, details: body.data })
  } catch {
    return new ApiError({ status: response.status, errorCode: null, message: response.statusText })
  }
}

/**
 * POSTs a message to a `…/messages/stream` endpoint and hands the reply over as it is written. A refusal before the stream
 * starts is an ordinary JSON error (thrown as `ApiError`); an `error` event after it started is thrown too. One token refresh
 * on 401, as the axios client does.
 */
export async function streamTurn<T>(path: string, body: unknown, handlers: StreamHandlers<T>, signal?: AbortSignal): Promise<void> {
  const send = () =>
    fetch(API_ORIGIN + path, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'Accept-Language': language(),
        ...(session.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      },
      body: JSON.stringify(body),
    })

  let response: Response
  try {
    response = await send()
    if (response.status === 401 && session.refreshToken) {
      await refreshAccessToken()
      response = await send()
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    if ((error as Error)?.name === 'AbortError') throw new ApiError({ status: 0, errorCode: 'Aborted', message: 'Aborted' })
    throw new ApiError({ status: 0, errorCode: 'NetworkError', message: (error as Error)?.message ?? 'NetworkError' })
  }

  if (!response.ok || !response.headers.get('content-type')?.includes('text/event-stream') || !response.body) {
    throw await errorOf(response)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const { events, rest } = parseSse(buffer)
    buffer = rest
    for (const e of events) {
      const data = JSON.parse(e.data) as Record<string, unknown>
      switch (e.event) {
        case 'status':
          handlers.onStatus?.(String(data.stage ?? ''), (data.tool as string | null) ?? null)
          break
        case 'delta':
          handlers.onDelta?.(String(data.text ?? ''))
          break
        case 'reset':
          handlers.onReset?.()
          break
        case 'done':
          handlers.onDone((data as unknown as ApiResponse<T>).data as T)
          return
        case 'error':
          throw new ApiError({ status: 200, errorCode: (data.errorCode as string) ?? null, message: String(data.message ?? '') })
      }
    }
  }

  throw new ApiError({ status: 0, errorCode: 'StreamEnded', message: 'The reply stopped before it finished.' })
}
