import { useQueryClient } from '@tanstack/react-query'
import { Banknote, CheckCircle2, Clock, PencilLine, ShieldCheck, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { StaffAssistantActionResponse, StaffAssistantMessageResponse } from '@/api/types'
import { InlineError } from '@/components/States'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { useAction } from '@/hooks/useAction'
import { cn } from '@/lib/utils'
import { assistantApi, assistantKeys } from '../api'
import { isSafeRoute } from '../context'

function useCountdown(until: string, active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [active])
  return Math.max(0, new Date(until).getTime() - now)
}

function mmss(ms: number): string {
  const total = Math.ceil(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/**
 * The confirmation card: what will happen, exactly. Nothing changes until «تأكيد»; money actions ask for the reason. After it
 * runs, every open page query is refreshed so the change shows at once (the server already checked the permission and the state).
 */
export function ActionCard({
  action,
  conversationId,
  onResult,
  onNavigate,
}: {
  action: StaffAssistantActionResponse
  conversationId: string
  onResult: (action: StaffAssistantActionResponse, message: StaffAssistantMessageResponse | null) => void
  onNavigate: (route: string) => void
}) {
  const { t } = useTranslation('assistantPanel')
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const pending = action.status === 'Proposed'
  const left = useCountdown(action.expiresAt, pending)
  const expired = pending && left === 0

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: assistantKeys.conversation(conversationId) })
    // The page under the panel shows the record that changed: refresh what is on screen.
    void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== assistantKeys.all[0] })
  }

  const confirm = useAction({
    mutationFn: () => assistantApi.confirm(action.id, { reason: reason.trim() || null }),
    onSuccess: (r) => {
      onResult(r.action, r.message)
      refresh()
    },
  })
  const reject = useAction({
    mutationFn: () => assistantApi.reject(action.id),
    onSuccess: (r) => onResult(r.action, r.message),
  })

  const money = action.kind === 'Money'
  const done = action.status === 'Executed'
  const failed = action.status === 'Failed'

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border-2 bg-surface shadow-md transition-colors',
        pending && !expired && (money ? 'border-tone-waiting/50' : 'border-primary/40'),
        done && 'border-tone-success/40',
        failed && 'border-tone-danger/40',
        (!pending || expired) && !done && !failed && 'border-border',
      )}
    >
      <div className={cn('flex items-center gap-2 px-3 py-2', money ? 'bg-tone-waiting-soft/70' : 'bg-primary-soft/60')}>
        {money ? <Banknote className="size-4 text-tone-waiting" /> : <PencilLine className="size-4 text-primary" />}
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{money ? t('action.money') : t('action.change')}</div>
          <div className="truncate text-sm font-semibold">{action.summary}</div>
        </div>
        <StatusBadge enum="StaffAssistantActionStatus" value={expired ? 'Expired' : action.status} />
      </div>

      <dl className="divide-y text-xs">
        {action.details.map((d, i) => (
          <div key={i} className="flex gap-3 px-3 py-1.5">
            <dt className="w-24 shrink-0 text-muted-foreground">{d.label}</dt>
            <dd className="min-w-0 flex-1 whitespace-pre-wrap break-words font-medium">{d.value}</dd>
          </div>
        ))}
      </dl>

      {action.requiredPermission && (
        <div className="flex items-center gap-1.5 border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3.5 text-tone-success" />
          <span className="font-mono">{t('action.needs', { perm: action.requiredPermission })}</span>
        </div>
      )}

      {pending && !expired && (
        <div className="space-y-2 border-t bg-muted/20 p-3">
          {action.reasonRequired && (
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-muted-foreground">{t('action.reasonRequired')}</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={2}
                className="w-full resize-none rounded-md border bg-surface px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          )}
          <InlineError error={confirm.error ?? reject.error} />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => confirm.mutate()} loading={confirm.isPending} disabled={action.reasonRequired && reason.trim().length === 0}>
              <CheckCircle2 />
              {t('action.confirm')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => reject.mutate()} loading={reject.isPending} disabled={confirm.isPending}>
              <XCircle />
              {t('action.cancel')}
            </Button>
            <span className="ms-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground ltr-nums">
              <Clock className="size-3" />
              {t('action.expiresIn', { time: mmss(left) })}
            </span>
          </div>
        </div>
      )}

      {expired && <div className="border-t px-3 py-2 text-[11px] text-muted-foreground">{t('action.expired')}</div>}
      {(done || failed) && (
        <div className={cn('flex items-center gap-2 border-t px-3 py-2 text-xs', done ? 'text-tone-success' : 'text-tone-danger')}>
          <span className="flex-1">{done ? action.resultText : action.error}</span>
          {done && isSafeRoute(action.route) && (
            <button type="button" className="font-medium text-primary hover:underline" onClick={() => onNavigate(action.route!)}>
              {t('action.openRecord')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
