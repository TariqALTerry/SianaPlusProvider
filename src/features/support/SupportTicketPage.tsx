import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftRight, RefreshCw, Send, XCircle } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { ConfirmDialog } from '@/components/ActionDialog'
import { HumanNumber } from '@/components/EntityLink'
import { DateTime } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState, InlineError, PageSkeleton } from '@/components/States'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Textarea } from '@/components/ui/input'
import { detailQueryOptions } from '@/api/queryClient'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { usePollingInterval } from '@/hooks/usePageVisible'
import { enumLabel } from '@/i18n/enums'
import { SUPPORT_INVALIDATION, supportApi, supportKeys } from './api'
import { DescriptionBlock, FilePicker, MessageBubble } from './components/shared'
import { BODY_MAX, supportTimeline } from './logic'
import './i18n'

/**
 * `/support/:id` (SUPPORT-TICKETS-PROVIDER-PLATFORM-PROMPT §2): the description and its files, then messages and status
 * changes (with their note) on one timeline, a reply box while the ticket takes replies, and "إغلاق التذكرة".
 * Polled every 30 s while visible; opening it marks it read, so the badge is refreshed after each load.
 */
export function SupportTicketPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation('support')
  const { lang, pick } = useLang()
  const queryClient = useQueryClient()
  const interval = usePollingInterval(30_000)
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [closeOpen, setCloseOpen] = useState(false)

  const query = useQuery({
    queryKey: supportKeys.detail(id),
    queryFn: ({ signal }) => supportApi.detail(id, signal),
    refetchInterval: interval,
    ...detailQueryOptions,
  })

  // The GET marked it read: the sidebar badge and the list's dot follow.
  useEffect(() => {
    if (!query.dataUpdatedAt) return
    void queryClient.invalidateQueries({ queryKey: supportKeys.unread() })
    void queryClient.invalidateQueries({ queryKey: supportKeys.lists() })
  }, [query.dataUpdatedAt, queryClient])

  const reply = useAction({
    mutationFn: () => supportApi.reply(id, body, files),
    invalidate: SUPPORT_INVALIDATION,
    success: t('detail.replied'),
    onSuccess: () => {
      setBody('')
      setFiles([])
    },
  })
  const close = useAction({
    mutationFn: () => supportApi.close(id),
    invalidate: SUPPORT_INVALIDATION,
    success: t('closed'),
    onSuccess: () => setCloseOpen(false),
  })

  if (query.isPending) return <PageSkeleton />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  const ticket = query.data
  const empty = !body.trim() && !files.length
  const send = (e: FormEvent) => {
    e.preventDefault()
    if (empty || body.length > BODY_MAX || reply.isPending) return
    reply.mutate()
  }

  return (
    <>
      <PageHeader
        back={{ to: '/support', label: t('detail.back') }}
        title={<span dir="auto">{ticket.subject}</span>}
        meta={
          <>
            <StatusBadge enum="SupportTicketStatus" value={ticket.status} />
            <StatusBadge enum="SupportTicketPriority" value={ticket.priority} />
          </>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <HumanNumber value={ticket.ticketNumber} />
            <span>{enumLabel('SupportTicketCategory', ticket.category, lang)}</span>
            <DateTime value={ticket.createdAt} mode="absolute" />
            {ticket.link?.serviceItemId && (
              <Link to={`/work/${ticket.link.serviceItemId}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                {t('detail.item')}: <span className="ltr-nums font-mono">{ticket.link.itemNumber}</span>
                {(ticket.link.serviceNameAr || ticket.link.serviceNameEn) && <span>· {pick(ticket.link.serviceNameAr ?? '', ticket.link.serviceNameEn ?? '')}</span>}
              </Link>
            )}
            {ticket.canReply && (
              <span className="inline-flex items-center gap-1 text-xs">
                <RefreshCw className={query.isFetching ? 'size-3 animate-spin' : 'size-3'} aria-hidden /> {t('detail.live')}
              </span>
            )}
          </span>
        }
        actions={
          ticket.canClose ? (
            <Button variant="outline" size="sm" onClick={() => setCloseOpen(true)}>
              <XCircle /> {t('close')}
            </Button>
          ) : undefined
        }
      />

      {ticket.status === 'WaitingForReply' && (
        <p role="status" className="mx-auto mb-4 max-w-3xl rounded-md border border-tone-attention/30 bg-tone-attention-soft px-3 py-2 text-sm text-tone-attention">
          <strong>{t('replyNeeded')}:</strong> {t('replyNeededNotice')}
        </p>
      )}

      <Card className="mx-auto max-w-3xl">
        <CardBody className="space-y-4">
          <DescriptionBlock createdAt={ticket.createdAt} description={ticket.description} attachments={ticket.attachments} />
          <ul className="space-y-3">
            {supportTimeline(ticket.messages, ticket.events).map((entry, i) =>
              'message' in entry ? (
                <MessageBubble
                  key={entry.message.id}
                  message={entry.message}
                  own={entry.message.authorSide === 'Requester'}
                  author={entry.message.authorSide === 'Requester' ? t('you') : entry.message.authorName || t('team')}
                />
              ) : (
                <li key={`e${i}`} className="flex flex-col items-center gap-1 text-center text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <ArrowLeftRight className="size-3" aria-hidden />
                    {t('detail.statusChanged', { status: enumLabel('SupportTicketStatus', entry.event.toValue, lang) })} · <DateTime value={entry.event.createdAt} />
                  </span>
                  {entry.event.note && (
                    <span className="max-w-md whitespace-pre-wrap rounded bg-muted/60 px-2 py-1 text-foreground" dir="auto">
                      {entry.event.note}
                    </span>
                  )}
                </li>
              ),
            )}
          </ul>

          {ticket.canReply ? (
            <form onSubmit={send} className="space-y-3 border-t pt-4">
              <Textarea
                aria-label={t('detail.replyPlaceholder')}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                maxLength={BODY_MAX}
                placeholder={t('detail.replyPlaceholder')}
                disabled={reply.isPending}
                dir="auto"
              />
              <FilePicker files={files} onChange={setFiles} disabled={reply.isPending} />
              <div className="flex justify-end">
                <Button type="submit" loading={reply.isPending} disabled={empty}>
                  <Send /> {t('detail.reply')}
                </Button>
              </div>
              <InlineError error={reply.error} />
            </form>
          ) : (
            <p className="border-t pt-4 text-center text-sm text-muted-foreground">{t('closedNotice')}</p>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        title={t('close')}
        target={`${ticket.ticketNumber} · ${ticket.subject}`}
        changes={t('closeDescription')}
        confirmLabel={t('close')}
        destructive
        submitting={close.isPending}
        error={close.error}
        onSubmit={() => close.mutate()}
      />
    </>
  )
}
