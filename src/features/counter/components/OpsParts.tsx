import { useQuery } from '@tanstack/react-query'
import { Archive, ExternalLink, HandCoins, Link2, RotateCw, Send, Share2 } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { CounterItemDetailResponse, WhatsAppMessageResponse } from '@/api/types'
import { DateTime, Money } from '@/components/Format'
import { InlineError } from '@/components/States'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useLang } from '@/hooks/useLang'
import { usePollingInterval } from '@/hooks/usePageVisible'
import { formatDateTime, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { counterApi, counterKeys } from '../api'
import { can, daysToAbandon, resendKinds, showStorage, whatsAppNotice } from '../logic'
import { AbandonDialog, SendWhatsAppDialog, WaiveStorageDialog } from './OpsDialogs'
import '../opsI18n'

/**
 * The item's WhatsApp log (phase 4 §4): the availability bar, messages newest first coloured by status, and a manual
 * send / retry. Failed or skipped messages with `canResend` get a retry button. Polled while messages are queued.
 */
export function WhatsAppCard({ detail }: { detail: CounterItemDetailResponse }) {
  const { t } = useTranslation('counterOps')
  const { lang } = useLang()
  const interval = usePollingInterval(30_000)
  const query = useQuery({
    queryKey: counterKeys.messages(detail.serviceItemId),
    queryFn: ({ signal }) => counterApi.messages(detail.serviceItemId, signal),
    refetchInterval: (q) => (q.state.data?.messages.some((m) => m.status === 'Queued') ? interval : false),
  })
  const [dialog, setDialog] = useState<{ message: WhatsAppMessageResponse | null } | null>(null)
  const handedOver = !!detail.intake?.handedOverAt
  const kinds = useMemo(
    () => resendKinds({ pendingQuotation: detail.pendingQuotation, isReady: detail.isReady, repairOutcome: detail.repairOutcome, handedOver }),
    [detail.pendingQuotation, detail.isReady, detail.repairOutcome, handedOver],
  )
  const a = query.data?.availability
  const notice = a ? whatsAppNotice(a) : null

  return (
    <Card>
      <CardHeader
        title={t('whatsapp.title')}
        actions={
          a?.globalEnabled ? (
            <Button size="sm" variant="outline" onClick={() => setDialog({ message: null })}>
              <Send /> {t('whatsapp.send')}
            </Button>
          ) : undefined
        }
      />
      <CardBody className="space-y-3">
        {query.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : query.isError ? (
          <InlineError error={query.error} />
        ) : (
          <>
            {a && notice && (
              <div
                className={cn(
                  'rounded-lg px-3 py-2 text-sm',
                  notice === 'provider' || notice === 'platform' ? 'bg-tone-success-soft text-tone-success' : notice === 'globalOff' ? 'bg-tone-danger-soft text-tone-danger' : 'bg-tone-attention-soft text-tone-attention',
                )}
                role="status"
              >
                <p className="font-medium">{t(`whatsapp.notice.${notice}`)}</p>
                {a.activeSender === 'Platform' && (
                  <p className="text-xs opacity-90">{a.quotaUnlimited ? t('whatsapp.quotaUnlimited') : t('whatsapp.quota', { used: a.quotaUsed, allowed: a.quotaAllowed })}</p>
                )}
              </div>
            )}
            {query.data.messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('whatsapp.empty')}</p>
            ) : (
              <ol className="divide-y">
                {query.data.messages.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-start justify-between gap-2 py-2 first:pt-0 last:pb-0">
                    <div className="min-w-0 space-y-0.5">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        {m.kind === 'Otp' ? t('whatsapp.otpHidden') : <StatusBadge enum="WhatsAppTemplateKind" value={m.kind} dot={false} />}
                        <StatusBadge enum="WhatsAppMessageStatus" value={m.status} />
                        {m.skipReason && <StatusBadge enum="WhatsAppSkipReason" value={m.skipReason} dot={false} />}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <DateTime value={m.readAt ?? m.deliveredAt ?? m.sentAt ?? m.failedAt ?? m.createdAt} /> · <StatusBadge enum="WhatsAppSenderKind" value={m.sender} dot={false} />
                        {m.attempts > 1 && ` · ${t('whatsapp.attempts', { count: m.attempts })}`}
                        {m.status === 'Queued' && m.nextAttemptAt && ` · ${t('whatsapp.nextAttempt', { date: formatDateTime(m.nextAttemptAt, lang) })}`}
                      </p>
                      {m.error && (
                        <p className="break-words text-xs text-tone-danger" dir="auto">
                          {t('whatsapp.error')}: {m.error}
                        </p>
                      )}
                    </div>
                    {m.canResend && (
                      <Button size="sm" variant="outline" onClick={() => setDialog({ message: m })}>
                        <RotateCw /> {t('whatsapp.resend')}
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </CardBody>
      <SendWhatsAppDialog detail={detail} message={dialog?.message ?? null} kinds={kinds} open={!!dialog} onOpenChange={(o) => !o && setDialog(null)} />
    </Card>
  )
}

/** `publicTrackingUrl` (phase 4 §3): copy, share (the phone's share sheet when there is one) or open. */
export function TrackingLinkCard({ url }: { url: string | null }) {
  const { t } = useTranslation('counterOps')
  if (!url) return null
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t('tracking.copied'))
    } catch {
      // Clipboard blocked: the link is shown and can be selected by hand.
    }
  }
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  return (
    <Card>
      <CardHeader title={t('tracking.title')} description={t('tracking.hint')} />
      <CardBody className="space-y-2">
        <p className="flex items-center gap-1.5 truncate rounded-md border bg-muted/40 px-2 py-1.5 text-xs" dir="ltr">
          <Link2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate font-latin">{url}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void copy()}>
            <Link2 /> {t('tracking.copy')}
          </Button>
          {canShare && (
            <Button size="sm" variant="outline" onClick={() => void navigator.share({ url }).catch(() => undefined)}>
              <Share2 /> {t('tracking.share')}
            </Button>
          )}
          <Button asChild size="sm" variant="ghost">
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink /> {t('tracking.open')}
            </a>
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}

/**
 * Storage (phase 5 §4): days waiting after ready, the free days, the daily fee, the fee charged now (frozen at handover
 * or abandon), the waiver, reminders, and the abandon countdown. Waive and abandon follow `availableActions`.
 */
export function StorageCard({ detail }: { detail: CounterItemDetailResponse }) {
  const { t } = useTranslation('counterOps')
  const { lang } = useLang()
  const [dialog, setDialog] = useState<'waive' | 'abandon' | null>(null)
  const s = detail.storage
  if (!showStorage(s)) return null
  const left = daysToAbandon(s)
  const rows: Array<{ label: string; value: ReactNode; hidden?: boolean }> = [
    { label: t('storage.readySince'), value: s.readySince ? <DateTime value={s.readySince} mode="absolute" /> : '—' },
    { label: t('storage.daysWaiting'), value: <span className="tabular">{s.daysWaiting}</span>, hidden: !s.readySince },
    { label: t('storage.freeDays'), value: <span className="tabular">{s.freeDays}</span> },
    { label: t('storage.feePerDay'), value: s.feePerDay ? <Money value={s.feePerDay} /> : t('storage.noFee') },
  ]
  return (
    <Card>
      <CardHeader title={t('storage.title')} />
      <CardBody className="space-y-3 text-sm">
        {s.abandonedAt && (
          <p className="flex items-center gap-2 rounded-lg bg-tone-danger-soft px-3 py-2 font-medium text-tone-danger">
            <Archive className="size-4" aria-hidden /> {t('storage.abandoned', { date: formatDateTime(s.abandonedAt, lang) })}
          </p>
        )}
        {s.abandonReason && <p className="text-xs text-muted-foreground">{s.abandonReason}</p>}
        <dl className="space-y-1">
          {rows
            .filter((r) => !r.hidden)
            .map((r) => (
              <div key={r.label} className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{r.label}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
        </dl>
        {s.amount > 0 || s.waived ? (
          <div className={cn('flex items-center justify-between rounded-lg px-3 py-2', s.waived ? 'bg-muted text-muted-foreground' : 'bg-tone-attention-soft text-tone-attention')}>
            <span className="font-medium">{s.feePerDay ? t('storage.line', { days: s.chargeableDays, fee: formatMoney(s.feePerDay, lang) }) : t('storage.amount')}</span>
            <Money value={s.waived ? 0 : s.charged} className={cn('font-semibold', s.waived && 'line-through')} />
          </div>
        ) : null}
        {s.waived && (
          <p className="text-xs text-muted-foreground">
            {t('storage.waived')}
            {s.waiverReason && ` · ${t('storage.waiverReason', { reason: s.waiverReason })}`}
          </p>
        )}
        {!s.abandonedAt && s.readySince && (
          <div className="space-y-0.5 text-xs text-muted-foreground">
            <p>{t('storage.reminders', { count: s.remindersSent })}</p>
            <p>{s.canAbandon ? t('storage.canAbandonNow') : left !== null ? t('storage.abandonIn', { days: left }) : t('storage.abandonAfter', { days: s.abandonAfterDays })}</p>
          </div>
        )}
        {(can(detail, 'WaiveStorageFee') || can(detail, 'Abandon')) && (
          <div className="flex flex-wrap gap-2">
            {can(detail, 'WaiveStorageFee') && (
              <Button size="lg" variant="outline" onClick={() => setDialog('waive')}>
                <HandCoins /> {t('storage.waive')}
              </Button>
            )}
            {can(detail, 'Abandon') && (
              <Button size="lg" variant="destructive" onClick={() => setDialog('abandon')}>
                <Archive /> {t('storage.abandon')}
              </Button>
            )}
          </div>
        )}
      </CardBody>
      <WaiveStorageDialog detail={detail} open={dialog === 'waive'} onOpenChange={(o) => !o && setDialog(null)} />
      <AbandonDialog detail={detail} open={dialog === 'abandon'} onOpenChange={(o) => !o && setDialog(null)} />
    </Card>
  )
}
