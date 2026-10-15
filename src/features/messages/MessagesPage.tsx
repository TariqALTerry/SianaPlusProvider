import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, ExternalLink, ImagePlus, Lock, Send, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import type { ServiceConversationSummary, ServiceMessageResponse } from '@/api/types'
import { fileUrl, validateUpload } from '@/api/files'
import { DateTime } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { EmptyState, ErrorState, InlineError, Spinner } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/input'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { usePollingInterval } from '@/hooks/usePageVisible'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import { MESSAGE_IMAGE_EXTENSIONS, MESSAGE_TEXT_MAX, messageKeys, messagesApi } from './api'
import './i18n'

/**
 * `/messages[/:serviceItemId]` (PROVIDER-PLATFORM-PHASE2-PROMPT §2): the inbox on the start side, the
 * open conversation on the other. On a phone only one pane shows at a time.
 */
export function MessagesPage() {
  const { t } = useTranslation('messages')
  const { serviceItemId } = useParams()
  const wide = useMediaQuery('(min-width: 1024px)')
  const showList = wide || !serviceItemId
  const showChat = wide || !!serviceItemId

  return (
    <>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <div className="grid gap-4 lg:h-[calc(100vh-13rem)] lg:min-h-[32rem] lg:grid-cols-[22rem_minmax(0,1fr)]">
        {showList && <Inbox activeId={serviceItemId ?? null} />}
        {showChat &&
          (serviceItemId ? (
            <Conversation key={serviceItemId} serviceItemId={serviceItemId} />
          ) : (
            <Card className="hidden items-center justify-center lg:flex">
              <EmptyState title={t('pick')} />
            </Card>
          ))}
      </div>
    </>
  )
}

function Inbox({ activeId }: { activeId: string | null }) {
  const { t } = useTranslation('messages')
  const { pick, lang } = useLang()
  const [unreadOnly, setUnreadOnly] = useState(false)
  const interval = usePollingInterval(60_000)
  const params = { unreadOnly: unreadOnly || undefined, page: 1, pageSize: 50 }
  const query = useQuery({ queryKey: messageKeys.inbox(params), queryFn: ({ signal }) => messagesApi.inbox(params, signal), refetchInterval: interval, staleTime: 15_000 })

  return (
    <Card className="flex min-h-0 flex-col overflow-hidden">
      <div role="tablist" className="flex gap-1 border-b p-2">
        {[false, true].map((u) => (
          <button
            key={String(u)}
            type="button"
            role="tab"
            aria-selected={unreadOnly === u}
            onClick={() => setUnreadOnly(u)}
            className={cn('rounded-full px-3 py-1 text-xs', unreadOnly === u ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
          >
            {u ? t('unreadOnly') : t('all')}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {query.isPending ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : query.isError ? (
          <ErrorState compact error={query.error} onRetry={() => void query.refetch()} />
        ) : !query.data.items.length ? (
          <EmptyState title={unreadOnly ? t('emptyUnread') : t('emptyInbox')} />
        ) : (
          <ul>
            {query.data.items.map((c) => (
              <InboxRow key={c.serviceItemId} c={c} active={c.serviceItemId === activeId} pick={pick} lang={lang} />
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

function InboxRow({ c, active, pick, lang }: { c: ServiceConversationSummary; active: boolean; pick: (ar?: string | null, en?: string | null) => string; lang: string }) {
  const { t } = useTranslation('messages')
  const sender = c.lastMessageSide === 'Provider' ? `${t('me')}: ` : c.lastMessageSide === 'Executor' ? `${t('technician')}: ` : ''
  return (
    <li>
      <Link
        to={`/messages/${c.serviceItemId}`}
        aria-current={active ? 'page' : undefined}
        className={cn('flex gap-3 border-b px-3 py-2.5 hover:bg-muted/60', active && 'bg-primary-soft/50', c.unreadCount > 0 && 'font-medium')}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm">{pick(c.serviceNameAr, c.serviceNameEn)}</span>
            <span className="shrink-0 text-[0.6875rem] text-muted-foreground">{formatRelative(c.lastMessageAt, lang)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {c.itemNumber && (
              <span dir="ltr" className="font-mono">
                {c.itemNumber}
              </span>
            )}
            {c.counterpartName && <span>· {c.counterpartName}</span>}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground" dir="auto">
            {sender}
            {c.lastMessageText ?? '📷'}
          </p>
        </div>
        {c.unreadCount > 0 && (
          <span className="tabular mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[0.625rem] font-semibold text-primary-foreground" aria-label={t('unread', { count: c.unreadCount })}>
            {c.unreadCount > 9 ? '9+' : c.unreadCount}
          </span>
        )}
      </Link>
    </li>
  )
}

function Conversation({ serviceItemId }: { serviceItemId: string }) {
  const { t } = useTranslation('messages')
  const { pick, isRtl } = useLang()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const interval = usePollingInterval(15_000)
  const end = useRef<HTMLDivElement>(null)
  const query = useQuery({
    queryKey: messageKeys.conversation(serviceItemId),
    queryFn: ({ signal }) => messagesApi.conversation(serviceItemId, signal),
    refetchInterval: interval,
    staleTime: 5_000,
  })

  // Opening marks it read on the server: refresh the badge and the inbox.
  const loaded = query.data?.serviceItemId
  useEffect(() => {
    if (!loaded) return
    void queryClient.invalidateQueries({ queryKey: messageKeys.unread })
    void queryClient.invalidateQueries({ queryKey: messageKeys.inboxAll })
  }, [loaded, queryClient])

  const count = query.data?.messages.length ?? 0
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [count])

  const Back = isRtl ? ArrowRight : ArrowLeft
  const c = query.data

  return (
    <Card className="flex min-h-[28rem] flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Button size="icon-sm" variant="ghost" className="lg:hidden" onClick={() => navigate('/messages')} aria-label={t('back')}>
          <Back />
        </Button>
        {c ? (
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-semibold">{pick(c.serviceNameAr, c.serviceNameEn)}</span>
              <StatusBadge enum="ServiceItemStatus" value={c.itemStatus} />
            </div>
            <div className="text-xs text-muted-foreground">
              {c.itemNumber && (
                <span dir="ltr" className="font-mono">
                  {c.itemNumber}
                </span>
              )}
              {c.customerName && ` · ${t('customer')}: ${c.customerName}`}
              {c.executorName && ` · ${t('technician')}: ${c.executorName}`}
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <Button asChild size="sm" variant="outline">
          <Link to={`/work/${serviceItemId}`}>
            <ExternalLink /> {t('openService')}
          </Link>
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 px-3 py-3">
        {query.isPending ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : query.isError ? (
          <ErrorState compact error={query.error} onRetry={() => void query.refetch()} />
        ) : !c!.messages.length ? (
          <EmptyState title={t('empty')} />
        ) : (
          <ol className="space-y-2.5">
            {c!.messages.map((m) => (
              <Bubble key={m.id} m={m} />
            ))}
          </ol>
        )}
        <div ref={end} />
      </div>

      {c && (c.canSend ? <Composer serviceItemId={serviceItemId} /> : <ClosedBar />)}
    </Card>
  )
}

/** The organization's messages sit on the "me" side; the customer and the technician each get a colour. */
function Bubble({ m }: { m: ServiceMessageResponse }) {
  const { t } = useTranslation('messages')
  const [photoOpen, setPhotoOpen] = useState(false)
  const mine = m.senderSide === 'Provider'
  const src = fileUrl(m.imageUrl)
  return (
    <li className={cn('flex flex-col', mine ? 'items-start' : 'items-end')} data-side={m.senderSide}>
      <span className="mb-0.5 flex items-center gap-1 px-1 text-[0.6875rem] text-muted-foreground">
        {m.senderName}
        {m.senderSide === 'Executor' && <span className="rounded bg-tone-attention-soft px-1 text-tone-attention">{t('technician')}</span>}
      </span>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm',
          mine && 'rounded-ss-sm bg-primary text-primary-foreground',
          m.senderSide === 'Customer' && 'rounded-se-sm bg-tone-info-soft text-foreground',
          m.senderSide === 'Executor' && 'rounded-se-sm border border-tone-attention/30 bg-tone-attention-soft/60 text-foreground',
        )}
      >
        {src && (
          <button type="button" onClick={() => setPhotoOpen(true)} className="mb-1 block overflow-hidden rounded-lg" aria-label={t('openPhoto')}>
            <img src={src} alt="" loading="lazy" className="max-h-48 w-auto object-cover" />
          </button>
        )}
        {m.text && (
          <p className="whitespace-pre-wrap leading-relaxed" dir="auto">
            {m.text}
          </p>
        )}
      </div>
      <span className="mt-0.5 px-1 text-[0.625rem] text-muted-foreground">
        <DateTime value={m.createdAt} mode="absolute" />
      </span>
      {src && (
        <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
          <DialogContent size="xl" aria-describedby={undefined}>
            <DialogTitle className="sr-only">{t('openPhoto')}</DialogTitle>
            <img src={src} alt="" className="max-h-[80vh] w-full object-contain" />
          </DialogContent>
        </Dialog>
      )}
    </li>
  )
}

function ClosedBar() {
  const { t } = useTranslation('messages')
  return (
    <div role="status" className="flex items-center gap-2 border-t bg-muted px-3 py-3 text-sm text-muted-foreground">
      <Lock className="size-4" /> {t('closed')}
    </div>
  )
}

function Composer({ serviceItemId }: { serviceItemId: string }) {
  const { t } = useTranslation('messages')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const preview = file ? URL.createObjectURL(file) : null
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])

  const send = useAction({
    mutationFn: () => messagesApi.send(serviceItemId, text.trim() || null, file),
    invalidate: [messageKeys.conversation(serviceItemId), messageKeys.inboxAll],
    onSuccess: () => {
      setText('')
      setFile(null)
    },
  })

  const tooLong = text.length > MESSAGE_TEXT_MAX
  const canSend = (!!text.trim() || !!file) && !tooLong && !send.isPending

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (canSend) send.mutate()
  }

  return (
    <form onSubmit={submit} className="space-y-2 border-t p-2">
      {preview && (
        <div className="relative inline-block">
          <img src={preview} alt="" className="h-20 rounded-md border object-cover" />
          <button type="button" onClick={() => setFile(null)} className="absolute -end-2 -top-2 rounded-full bg-foreground p-0.5 text-background" aria-label={t('removeImage')}>
            <X className="size-3" />
          </button>
        </div>
      )}
      {fileError && <p className="text-xs text-tone-danger">{t('imageInvalid')}</p>}
      {tooLong && <p className="text-xs text-tone-danger">{t('tooLong', { max: MESSAGE_TEXT_MAX })}</p>}
      <InlineError error={send.error} />
      <div className="flex items-end gap-2">
        <input
          ref={input}
          type="file"
          accept={MESSAGE_IMAGE_EXTENSIONS.join(',')}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            const bad = validateUpload(f, MESSAGE_IMAGE_EXTENSIONS)
            setFileError(!!bad)
            if (!bad) setFile(f)
          }}
        />
        <Button type="button" size="icon" variant="ghost" onClick={() => input.current?.click()} aria-label={t('attach')} title={t('attach')}>
          <ImagePlus />
        </Button>
        <Textarea
          rows={1}
          dir="auto"
          value={text}
          placeholder={t('placeholder')}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          className="max-h-32 min-h-9 flex-1 resize-none"
        />
        <Button type="submit" size="icon" disabled={!canSend} loading={send.isPending} aria-label={t('send')} title={t('send')}>
          <Send className="rtl:-scale-x-100" />
        </Button>
      </div>
    </form>
  )
}

