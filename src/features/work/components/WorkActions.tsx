import { CalendarClock, LifeBuoy, Sparkles, UserMinus, UserPlus, Users, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { ServiceItemProviderView } from '@/api/types'
import { SUPPORT_PHONE } from '@/lib/env'
import { availableWorkActions, type WorkActionKey } from '../logic'
import { CandidatePickerDialog } from './CandidatePickerDialog'
import { DelegateDialog, RejectDialog, ScheduleDialog, UnassignDialog } from './WorkDialogs'
import { useWriteGate } from '../hooks'
import { WriteGateNote } from './widgets'
import '../i18n'

/**
 * The item page's action bar (§8.4): only the actions the brief's table allows for the
 * current status; the server is the final judge. No cancel / force-status — "تواصل مع الدعم".
 */
export function WorkActions({ item, onRejected }: { item: ServiceItemProviderView; onRejected: () => void }) {
  const { t } = useTranslation('work')
  const gate = useWriteGate()
  const [open, setOpen] = useState<WorkActionKey | null>(null)
  const actions = availableWorkActions(item)
  const dialog = (key: WorkActionKey) => ({ open: open === key, onOpenChange: (o: boolean) => setOpen(o ? key : null) })

  const buttons: Array<{ key: WorkActionKey; label: string; icon: typeof UserPlus; variant: 'default' | 'outline' | 'destructive-outline' }> = [
    { key: 'assign', label: t('actions.assign'), icon: UserPlus, variant: 'default' },
    { key: 'reassign', label: t('actions.reassign'), icon: Users, variant: 'outline' },
    { key: 'schedule', label: item.scheduledStart ? t('actions.reschedule') : t('actions.schedule'), icon: CalendarClock, variant: actions.has('assign') ? 'outline' : 'default' },
    { key: 'delegate', label: t('actions.delegate'), icon: Sparkles, variant: 'outline' },
    { key: 'unassign', label: t('actions.unassign'), icon: UserMinus, variant: 'outline' },
    { key: 'reject', label: t('actions.reject'), icon: XCircle, variant: 'destructive-outline' },
  ]
  const shown = buttons.filter((b) => actions.has(b.key))

  return (
    <section aria-label={t('actions.bar')} className="mb-4 space-y-2 rounded-lg border bg-surface p-3 shadow-sm">
      {shown.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {shown.map((b) => (
            <Button key={b.key} size="sm" variant={b.variant} disabled={gate.disabled} title={gate.reason} onClick={() => setOpen(b.key)}>
              <b.icon /> {b.label}
            </Button>
          ))}
        </div>
      )}
      <WriteGateNote />
      <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <LifeBuoy className="size-3.5 shrink-0" aria-hidden />
        {t('actions.supportHint')}
        {SUPPORT_PHONE && (
          <a href={`tel:${SUPPORT_PHONE}`} className="ltr-nums font-medium text-primary hover:underline">
            {t('actions.support')}: {SUPPORT_PHONE}
          </a>
        )}
      </p>

      {/* Always mounted: a poll can change the status (and the allowed actions) while a dialog is open. */}
      <CandidatePickerDialog item={item} mode="assign" {...dialog('assign')} />
      <CandidatePickerDialog item={item} mode="reassign" currentExecutorId={item.executor?.id ?? null} {...dialog('reassign')} />
      <UnassignDialog item={item} executorName={item.executor?.fullName ?? null} {...dialog('unassign')} />
      <DelegateDialog item={item} executorId={item.executor?.id ?? null} {...dialog('delegate')} />
      <ScheduleDialog item={item} status={item.status} scheduledStart={item.scheduledStart} scheduledEnd={item.scheduledEnd} {...dialog('schedule')} />
      <RejectDialog item={item} onRejected={onRejected} {...dialog('reject')} />
    </section>
  )
}
