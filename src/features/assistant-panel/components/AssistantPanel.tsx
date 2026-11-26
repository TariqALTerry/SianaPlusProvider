import { useQuery, useQueryClient } from '@tanstack/react-query'
import { History, MessageSquarePlus, Send, Sparkles, Square, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'
import type {
  StaffAssistantActionResponse,
  StaffAssistantConversationResponse,
  StaffAssistantMessageResponse,
  StaffAssistantSectionsResponse,
} from '@/api/types'
import { isApiError } from '@/api/http'
import { DateTime } from '@/components/Format'
import { ErrorState, InlineError } from '@/components/States'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/menu'
import { useLang } from '@/hooks/useLang'
import { cn } from '@/lib/utils'
import { assistantApi, assistantKeys } from '../api'
import { contextFor, isSafeRoute, sectionFor } from '../context'
import { useAssistantPanel } from '../store'
import { BriefCard } from './Cards'
import { LiveReply, MessageView } from './Message'
import '../i18n'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * The assistant's side panel: beside the page (not over it), on the section of the page the user is on, with the morning
 * brief, the conversation (streamed), the cards and the confirmation cards, the suggested questions and the composer.
 */
export function AssistantPanel({ sections, branchId = null }: { sections: StaffAssistantSectionsResponse; branchId?: string | null }) {
  const { t } = useTranslation('assistantPanel')
  const { pick } = useLang()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { conversationId, setConversation, setOpen, briefSeenOn, markBriefSeen, takePending, pendingQuestion } = useAssistantPanel()

  const pageSection = sectionFor(location.pathname, sections.sections)
  const sectionsByKey = useMemo(() => new Map(sections.sections.map((s) => [s.key, s])), [sections.sections])

  const [live, setLive] = useState<{ text: string; status: string } | null>(null)
  const [draft, setDraft] = useState('')
  const [sendError, setSendError] = useState<unknown>(null)
  const [starting, setStarting] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const bottom = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  const conversation = useQuery({
    queryKey: assistantKeys.conversation(conversationId ?? 'none'),
    queryFn: ({ signal }) => assistantApi.get(conversationId!, signal),
    enabled: !!conversationId,
    staleTime: Infinity,
    retry: false,
  })

  const history = useQuery({ queryKey: assistantKeys.list(), queryFn: ({ signal }) => assistantApi.list(signal), staleTime: 30_000 })

  const showBrief = briefSeenOn !== today()
  const brief = useQuery({ queryKey: assistantKeys.brief(), queryFn: ({ signal }) => assistantApi.brief(signal), staleTime: 5 * 60_000, enabled: showBrief })

  const setConversationData = useCallback(
    (updater: (c: StaffAssistantConversationResponse) => StaffAssistantConversationResponse) => {
      if (!conversationId) return
      queryClient.setQueryData<StaffAssistantConversationResponse>(assistantKeys.conversation(conversationId), (c) => (c ? updater(c) : c))
    },
    [conversationId, queryClient],
  )

  const start = useCallback(
    async (section?: string) => {
      setStarting(true)
      setSendError(null)
      try {
        const c = await assistantApi.start({ section: section ?? pageSection, context: contextFor(location.pathname, location.search, branchId) })
        queryClient.setQueryData(assistantKeys.conversation(c.id), c)
        setConversation(c.id)
        void queryClient.invalidateQueries({ queryKey: assistantKeys.list() })
        return c
      } catch (error) {
        setSendError(error)
        return null
      } finally {
        setStarting(false)
      }
    },
    [branchId, location.pathname, location.search, pageSection, queryClient, setConversation],
  )

  // No conversation yet (or the saved one is gone): open one on the page's section.
  useEffect(() => {
    if (!conversationId && !starting) void start()
    if (conversation.isError && isApiError(conversation.error) && conversation.error.status === 404) setConversation(null)
  }, [conversationId, conversation.isError, conversation.error, start, starting, setConversation])

  const send = useCallback(
    async (text: string) => {
      const question = text.trim()
      if (!question || live) return
      let current = conversation.data
      if (!current || !current.canSend) current = (await start()) ?? undefined
      if (!current) return
      const id = current.id
      setDraft('')
      setSendError(null)
      const optimistic: StaffAssistantMessageResponse = {
        id: `local-${Date.now()}`,
        role: 'User',
        text: question,
        quickReplies: [],
        card: null,
        links: [],
        section: current.section,
        media: [],
        createdAt: new Date().toISOString(),
      }
      queryClient.setQueryData<StaffAssistantConversationResponse>(assistantKeys.conversation(id), (c) => (c ? { ...c, messages: [...c.messages, optimistic] } : c))
      setLive({ text: '', status: t('thinking') })
      abort.current = new AbortController()
      const body = { text: question, context: contextFor(location.pathname, location.search, branchId), mediaIds: [] }
      try {
        await assistantApi.stream(
          id,
          body,
          {
            onStatus: (stage) => setLive((l) => ({ text: l?.text ?? '', status: stage === 'tool' ? t('working') : t('thinking') })),
            onDelta: (delta) => setLive((l) => ({ text: (l?.text ?? '') + delta, status: l?.status ?? '' })),
            onReset: () => setLive((l) => ({ text: '', status: l?.status ?? t('working') })),
            onDone: (turn) => {
              queryClient.setQueryData<StaffAssistantConversationResponse>(assistantKeys.conversation(id), (c) =>
                c
                  ? {
                      ...c,
                      section: turn.section,
                      canSend: turn.canSend,
                      messages: [...c.messages.filter((m) => m.id !== optimistic.id), turn.userMessage, turn.reply],
                    }
                  : c,
              )
            },
          },
          abort.current.signal,
        )
      } catch (error) {
        queryClient.setQueryData<StaffAssistantConversationResponse>(assistantKeys.conversation(id), (c) =>
          c ? { ...c, messages: c.messages.filter((m) => m.id !== optimistic.id) } : c,
        )
        if (!(isApiError(error) && error.errorCode === 'Aborted')) {
          setSendError(error)
          setDraft(question)
        }
      } finally {
        setLive(null)
        abort.current = null
        void queryClient.invalidateQueries({ queryKey: assistantKeys.sections() })
        void queryClient.invalidateQueries({ queryKey: assistantKeys.list() })
      }
    },
    [branchId, conversation.data, live, location.pathname, location.search, queryClient, start, t],
  )

  // A question handed over (a brief item, the launcher on another page).
  useEffect(() => {
    if (pendingQuestion && conversation.data && !live) {
      const q = takePending()
      if (q) void send(q)
    }
  }, [pendingQuestion, conversation.data, live, send, takePending])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [conversation.data?.messages.length, live?.text, live?.status])

  useEffect(() => {
    input.current?.focus()
  }, [conversationId])

  const onActionResult = (action: StaffAssistantActionResponse, follow: StaffAssistantMessageResponse | null) =>
    setConversationData((c) => ({
      ...c,
      messages: [
        ...c.messages.map((m) => (m.card?.action?.id === action.id ? { ...m, card: { ...m.card, action } } : m)),
        ...(follow ? [follow] : []),
      ],
    }))

  const go = (route: string) => {
    if (isSafeRoute(route)) navigate(route)
  }

  const c = conversation.data
  const lastAssistant = c ? [...c.messages].reverse().find((m) => m.role === 'Assistant') : undefined
  const suggestions = !live && lastAssistant?.quickReplies.length ? lastAssistant.quickReplies : []
  const pageSectionInfo = sectionsByKey.get(pageSection)
  const offerSwitch = c && pageSection !== c.section && pageSection !== 'general' && pageSectionInfo
  const limitReached = sections.messagesLeftToday <= 0

  return (
    <div
      role="complementary"
      aria-label={t('launcher')}
      className="fixed inset-y-0 end-0 z-40 flex w-full flex-col border-s bg-background shadow-2xl animate-slide-in-end sm:w-[440px] ltr:[--slide-from:100%] rtl:[--slide-from:-100%] print:hidden"
    >
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-l from-brand-deep via-primary to-brand-teal px-4 pb-3 pt-3 text-white">
        <div className="pointer-events-none absolute -end-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{c ? pick(c.sectionNameAr, c.sectionNameEn) : t('launcher')}</div>
            <div className="truncate text-[11px] text-white/75">{c?.section === 'general' ? t('generalHint') : t('sectionHint')}</div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="rounded-lg p-1.5 text-white/90 hover:bg-white/15" aria-label={t('history')}>
                <History className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>{t('history')}</DropdownMenuLabel>
              {(history.data?.items ?? []).length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">{t('noHistory')}</div>}
              {(history.data?.items ?? []).slice(0, 12).map((h) => (
                <DropdownMenuItem key={h.id} onSelect={() => setConversation(h.id)} className="flex-col items-start gap-0.5">
                  <span className="w-full truncate text-xs font-medium">{h.title ?? pick(sectionsByKey.get(h.section)?.assistantNameAr, sectionsByKey.get(h.section)?.assistantNameEn)}</span>
                  <span className="text-[10px] text-muted-foreground">
                    <DateTime value={h.lastMessageAt} />
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button type="button" onClick={() => void start(c?.section)} className="rounded-lg p-1.5 text-white/90 hover:bg-white/15" aria-label={t('newConversation')} title={t('newConversation')}>
            <MessageSquarePlus className="size-4" />
          </button>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white/90 hover:bg-white/15" aria-label={t('close')}>
            <X className="size-4" />
          </button>
        </div>

        {/* Section switcher */}
        <div className="relative mt-3 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          {sections.sections.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => s.key !== c?.section && void start(s.key)}
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                s.key === c?.section ? 'bg-white text-brand-deep shadow-sm' : 'bg-white/10 text-white/85 hover:bg-white/20',
              )}
            >
              {pick(s.nameAr, s.nameEn)}
            </button>
          ))}
        </div>
      </div>

      {offerSwitch && (
        <div className="flex items-center gap-2 border-b bg-primary-soft/40 px-4 py-1.5 text-[11px]">
          <span className="flex-1 text-muted-foreground">{t('pageHint', { section: pick(pageSectionInfo!.nameAr, pageSectionInfo!.nameEn) })}</span>
          <button type="button" className="font-medium text-primary hover:underline" onClick={() => void start(pageSection)}>
            {t('switchTo', { name: pick(pageSectionInfo!.assistantNameAr, pageSectionInfo!.assistantNameEn) })}
          </button>
        </div>
      )}

      {/* Conversation */}
      <div className="flex-1 space-y-4 overflow-y-auto bg-[radial-gradient(ellipse_at_top,hsl(var(--primary-soft))_0%,transparent_55%)] px-4 py-4">
        {showBrief && brief.data && (
          <BriefCard
            brief={brief.data}
            onAsk={(q) => {
              markBriefSeen(today())
              void send(q)
            }}
            onNavigate={go}
          />
        )}
        {conversation.isError && !isApiError(conversation.error) && <ErrorState error={conversation.error} onRetry={() => void conversation.refetch()} compact />}
        {c?.messages.map((m) => (
          <MessageView key={m.id} message={m} conversationId={c.id} onNavigate={go} onAsk={(q) => void send(q)} onActionResult={onActionResult} />
        ))}
        {live && <LiveReply text={live.text} status={live.status} />}
        {c && !c.canSend && <div className="text-center text-xs text-muted-foreground">{t('closedConversation')}</div>}
        <div ref={bottom} />
      </div>

      {/* Suggestions + composer */}
      <div className="border-t bg-surface px-3 pb-3 pt-2">
        {suggestions.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {suggestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void send(q)}
                className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-foreground/80 transition-colors hover:border-primary/40 hover:bg-primary-soft/50 hover:text-primary"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <InlineError error={sendError} className="mb-2" />
        <div className="flex items-end gap-2 rounded-xl border bg-background p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-ring">
          <textarea
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                void send(draft)
              }
            }}
            rows={1}
            maxLength={1000}
            disabled={limitReached}
            placeholder={limitReached ? t('limitReached') : t('placeholder')}
            className="max-h-32 min-h-[2.25rem] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none outline-none ring-0 placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
          />
          {live ? (
            <Button size="icon-sm" variant="secondary" onClick={() => abort.current?.abort()} aria-label={t('stop')}>
              <Square />
            </Button>
          ) : (
            <Button size="icon-sm" onClick={() => void send(draft)} disabled={!draft.trim() || limitReached || starting} aria-label={t('send')}>
              <Send className="rtl:-scale-x-100" />
            </Button>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-muted-foreground">
          <span>{t('messagesLeft', { count: Math.max(0, sections.messagesLeftToday) })}</span>
          <span className="font-mono" dir="ltr">
            {t('shortcut')}
          </span>
        </div>
      </div>
    </div>
  )
}
