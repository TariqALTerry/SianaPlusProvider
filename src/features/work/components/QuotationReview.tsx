import { Check, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ReasonDialog } from '@/components/ActionDialog'
import { Money } from '@/components/Format'
import { Button } from '@/components/ui/button'
import type { QuotationResponse } from '@/api/types'
import { useAction } from '@/hooks/useAction'
import { WORK_INVALIDATION, workApi } from '../api'
import { useTargetLabel, useWriteGate, type WorkTarget } from '../hooks'
import '../i18n'

type Decision = 'approve' | 'reject'

/**
 * A quotation above the technician's limit waits for the company: approving sends it to the
 * customer; rejecting returns it to the technician as a draft, with a required reason they read.
 * Used on the Incoming list and on the quotation in the work item page.
 */
export function QuotationReviewActions({ item, quotation, className }: { item: WorkTarget; quotation: QuotationResponse; className?: string }) {
  const { t } = useTranslation('work')
  const gate = useWriteGate()
  const [open, setOpen] = useState<Decision | null>(null)
  // Stays on the last decision while the dialog animates closed.
  const [decision, setDecision] = useState<Decision>('approve')
  const show = (next: Decision) => {
    setDecision(next)
    setOpen(next)
  }
  return (
    <div className={className ?? 'flex flex-wrap items-center gap-2'}>
      <Button size="sm" onClick={() => show('approve')} disabled={gate.disabled} title={gate.reason}>
        <Check /> {t('review.approve')}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => show('reject')} disabled={gate.disabled} title={gate.reason} className="text-destructive hover:bg-destructive-soft">
        <X /> {t('review.reject')}
      </Button>
      <QuotationReviewDialog item={item} quotation={quotation} decision={decision} open={open !== null} onOpenChange={(o) => !o && setOpen(null)} />
    </div>
  )
}

function QuotationReviewDialog({
  item,
  quotation,
  decision,
  open,
  onOpenChange,
}: {
  item: WorkTarget
  quotation: QuotationResponse
  decision: Decision
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('work')
  const targetLabel = useTargetLabel()
  const approving = decision === 'approve'
  const action = useAction({
    mutationFn: (note: string) => (approving ? workApi.approveQuotationReview : workApi.rejectQuotationReview)(item.id, quotation.id, { note: note || null }),
    invalidate: WORK_INVALIDATION,
    success: approving ? t('review.approved') : t('review.rejected'),
    onSuccess: () => onOpenChange(false),
  })
  useEffect(() => {
    if (open) action.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      destructive={!approving}
      required={!approving}
      title={approving ? t('review.approveTitle') : t('review.rejectTitle')}
      target={
        <span>
          {targetLabel(item)}
          <span className="block text-xs font-normal text-muted-foreground">
            <span className="ltr-nums font-mono">{quotation.quotationNumber}</span> · <Money value={quotation.total} />
          </span>
        </span>
      }
      changes={approving ? t('review.approveChange') : t('review.rejectChange')}
      label={approving ? t('review.note') : t('review.reason')}
      placeholder={approving ? t('review.notePlaceholder') : t('review.reasonPlaceholder')}
      confirmLabel={approving ? t('review.approve') : t('review.reject')}
      submitting={action.isPending}
      error={action.error}
      onSubmit={(note) => action.mutate(note)}
    />
  )
}
