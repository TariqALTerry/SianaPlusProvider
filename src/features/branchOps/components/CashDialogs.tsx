import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CashClosePreviewResponse, CashCloseResponse } from '@/api/types'
import { ActionDialog, ReasonDialog } from '@/components/ActionDialog'
import { Money } from '@/components/Format'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { qk } from '@/api/keys'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { branchOpsApi } from '../api'
import { CASH_LIMITS, cashDifference, closeNoteRequired, differenceTone, parseCount } from '../logic'
import '../i18n'

const toneText = { success: 'text-tone-success', danger: 'text-tone-danger', attention: 'text-tone-attention' } as const

/** A difference in its colour: green when it matches, red when short, orange when over. */
export function DifferenceText({ value, className }: { value: number; className?: string }) {
  const { t } = useTranslation('branchOps')
  const tone = differenceTone(value) as keyof typeof toneText
  return (
    <span className={cn('inline-flex items-center gap-1 font-semibold', toneText[tone], className)}>
      <Money value={value} />
      <span className="text-xs font-normal">({value === 0 ? t('cash.match') : value < 0 ? t('cash.short') : t('cash.over')})</span>
    </span>
  )
}

function useCashAction<V>(mutationFn: (v: V) => Promise<CashCloseResponse>, success: string, onDone: () => void) {
  return useAction<V, CashCloseResponse>({ mutationFn, invalidate: [qk.cashClose], success, onSuccess: () => onDone() })
}

/** "إغلاق الصندوق": the counted cash against the expected cash; any difference needs a note (`CashCloseNoteRequired`). */
export function CloseCashDialog({ preview, open, onOpenChange }: { preview: CashClosePreviewResponse; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('branchOps')
  const { lang } = useLang()
  const uid = useId()
  const [counted, setCounted] = useState('')
  const [note, setNote] = useState('')
  const amount = parseCount(counted)
  const difference = amount === null ? null : cashDifference(amount, preview.expected.cash)
  const noteMissing = closeNoteRequired(difference) && !note.trim()
  const action = useCashAction(
    () => branchOpsApi.closeCash({ branchId: preview.branchId, date: preview.businessDate, countedCash: amount ?? 0, note: note.trim() || null }),
    t('cash.closeSaved'),
    () => onOpenChange(false),
  )
  const { reset } = action
  useEffect(() => {
    if (open) {
      setCounted('')
      setNote('')
      reset()
    }
  }, [open, reset])

  const date = formatDate(preview.businessDate, lang)
  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('cash.closeTitle', { date })}
      target={`${preview.branchName} · ${date}`}
      changes={
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            {t('cash.expectedCash')}: <Money value={preview.expected.cash} className="font-semibold" />
          </span>
          {difference !== null && (
            <span>
              {t('cash.difference')}: <DifferenceText value={difference} />
            </span>
          )}
        </span>
      }
      confirmLabel={t('cash.close')}
      submitting={action.isPending}
      submitDisabled={amount === null || noteMissing}
      error={action.error}
      onSubmit={() => action.mutate(undefined)}
    >
      <Field label={t('cash.counted')} htmlFor={`${uid}-counted`} required>
        <Input
          id={`${uid}-counted`}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          dir="ltr"
          className="tabular h-14 text-2xl font-semibold"
          value={counted}
          onChange={(e) => setCounted(e.target.value)}
          autoFocus
        />
      </Field>
      <Field label={t('cash.note')} htmlFor={`${uid}-note`} required={closeNoteRequired(difference)} optional={!closeNoteRequired(difference)} error={noteMissing ? t('cash.noteRequired') : undefined}>
        <Textarea id={`${uid}-note`} dir="auto" rows={2} maxLength={CASH_LIMITS.note} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </ActionDialog>
  )
}

/** "إعادة فتح" (owner only), with the reason; the day is then closed again with a new count. */
export function ReopenCashDialog({ close, open, onOpenChange }: { close: CashCloseResponse; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('branchOps')
  const { lang } = useLang()
  const action = useCashAction((reason: string) => branchOpsApi.reopenCash(close.id, reason), t('cash.reopenSaved'), () => onOpenChange(false))
  const { reset } = action
  useEffect(() => {
    if (open) reset()
  }, [open, reset])
  const date = formatDate(close.businessDate, lang)
  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('cash.reopenTitle', { date })}
      target={`${close.branchName} · ${date}`}
      confirmLabel={t('cash.reopen')}
      submitting={action.isPending}
      error={action.error}
      onSubmit={(reason) => action.mutate(reason)}
    />
  )
}
