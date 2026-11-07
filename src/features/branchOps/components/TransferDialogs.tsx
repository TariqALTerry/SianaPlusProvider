import { useQueryClient } from '@tanstack/react-query'
import { ScanLine } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BranchTransferResponse } from '@/api/types'
import { ActionDialog, ReasonDialog } from '@/components/ActionDialog'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { ScanDialog } from '@/features/counter/components/ScanDialog'
import { useAction } from '@/hooks/useAction'
import { TRANSFER_INVALIDATION, branchOpsApi, branchOpsKeys } from '../api'
import { TRANSFER_LIMITS } from '../logic'
import '../i18n'

function useTransferAction<V>(transfer: BranchTransferResponse, mutationFn: (v: V) => Promise<BranchTransferResponse>, success: string, onDone: () => void) {
  const queryClient = useQueryClient()
  return useAction<V, BranchTransferResponse>({
    mutationFn,
    invalidate: TRANSFER_INVALIDATION,
    success,
    onSuccess: (updated) => {
      queryClient.setQueryData(branchOpsKeys.transfer(transfer.id), updated)
      onDone()
    },
  })
}

interface DialogProps {
  transfer: BranchTransferResponse
  target: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * "إرسال" at the source or "استلام" at the destination (phase 5 §5): an optional scanned label code (the receipt number
 * or `WS-…`, `TransferCodeMismatch` when it is another device) and a note.
 */
export function ScanTransferDialog({ transfer, target, open, onOpenChange, kind }: DialogProps & { kind: 'Send' | 'Receive' }) {
  const { t } = useTranslation('branchOps')
  const uid = useId()
  const [code, setCode] = useState('')
  const [note, setNote] = useState('')
  const [scanOpen, setScanOpen] = useState(false)
  const action = useTransferAction(
    transfer,
    () => {
      const body = { code: code.trim() || null, note: note.trim() || null }
      return kind === 'Send' ? branchOpsApi.sendTransfer(transfer.id, body) : branchOpsApi.receiveTransfer(transfer.id, body)
    },
    kind === 'Send' ? t('transfer.sent') : t('transfer.received'),
    () => onOpenChange(false),
  )
  const { reset } = action
  useEffect(() => {
    if (open) {
      setCode('')
      setNote('')
      reset()
    }
  }, [open, reset])

  return (
    <>
      <ActionDialog
        open={open}
        onOpenChange={onOpenChange}
        title={kind === 'Send' ? t('transfer.send') : t('transfer.receive')}
        description={kind === 'Send' ? t('transfer.sendHint') : t('transfer.receiveHint')}
        target={target}
        confirmLabel={kind === 'Send' ? t('transfer.send') : t('transfer.receive')}
        submitting={action.isPending}
        error={action.error}
        onSubmit={() => action.mutate(undefined)}
      >
        <Button size="lg" variant="outline" className="h-12 w-full" onClick={() => setScanOpen(true)}>
          <ScanLine /> {t('scan.scan')}
        </Button>
        <Field label={t('scan.code')} htmlFor={`${uid}-code`} optional hint={t('scan.codeHint')}>
          <Input id={`${uid}-code`} dir="ltr" className="h-11 font-mono" value={code} maxLength={TRANSFER_LIMITS.code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
        </Field>
        <Field label={t('scan.note')} htmlFor={`${uid}-note`} optional>
          <Textarea id={`${uid}-note`} dir="auto" rows={2} maxLength={TRANSFER_LIMITS.note} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </ActionDialog>
      <ScanDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onResult={(term) => {
          setScanOpen(false)
          setCode(term)
        }}
      />
    </>
  )
}

/** "إلغاء التحويل" (owner or supervisor), with the required reason. On the way, the device returns to the source. */
export function CancelTransferDialog({ transfer, target, open, onOpenChange }: DialogProps) {
  const { t } = useTranslation('branchOps')
  const action = useTransferAction(transfer, (reason: string) => branchOpsApi.cancelTransfer(transfer.id, reason), t('transfer.cancelled'), () => onOpenChange(false))
  const { reset } = action
  useEffect(() => {
    if (open) reset()
  }, [open, reset])
  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('transfer.cancel')}
      description={t('transfer.cancelHint')}
      target={target}
      destructive
      confirmLabel={t('transfer.cancel')}
      submitting={action.isPending}
      error={action.error}
      onSubmit={(reason) => action.mutate(reason)}
    />
  )
}
