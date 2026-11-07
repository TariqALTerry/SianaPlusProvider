import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BranchTransferResponse } from '@/api/types'
import { ActionDialog } from '@/components/ActionDialog'
import { Select, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { branchKeys, branchesApi } from '@/features/branches/api'
import { teamApi, teamKeys } from '@/features/team/api'
import { useAction } from '@/hooks/useAction'
import { TRANSFER_INVALIDATION, branchOpsApi } from '../api'
import { TRANSFER_LIMITS } from '../logic'
import '../i18n'

export interface CreateTransferDialogProps {
  serviceItemId: string
  /** Restated at the top of the dialog: `CT-RYD1-0042 · أحمد`. */
  target: string
  /** Where the device is now: not offered as the destination. */
  currentBranchId?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone?: (transfer: BranchTransferResponse) => void
}

const COURIER_PARAMS = { activeFilter: 'Active' as const, page: 1, pageSize: 100 }

/**
 * "تحويل لفرع آخر" (phase 5 §5), for the owner and supervisors: every device of the service moves to another active
 * branch of the organization, optionally with a courier (a technician with the delivery role). The caller hides it from
 * the front desk; the server answers `BranchTransferNotAllowed` anyway.
 */
export function CreateTransferDialog({ serviceItemId, target, currentBranchId, open, onOpenChange, onDone }: CreateTransferDialogProps) {
  const { t } = useTranslation('branchOps')
  const uid = useId()
  const [toBranchId, setToBranchId] = useState('')
  const [courierId, setCourierId] = useState('')
  const [reason, setReason] = useState('')

  // The destination may be any active branch of the organization (not only the caller's).
  const branches = useQuery({ queryKey: branchKeys.list(), queryFn: ({ signal }) => branchesApi.list(signal), enabled: open })
  const couriers = useQuery({ queryKey: teamKeys.executors(COURIER_PARAMS), queryFn: ({ signal }) => teamApi.executors(COURIER_PARAMS, signal), enabled: open })
  const destinations = (branches.data ?? []).filter((b) => b.isActive && b.id !== currentBranchId)
  const deliverers = (couriers.data?.items ?? []).filter((e) => e.isActive && e.canDeliver)

  const action = useAction({
    mutationFn: () => branchOpsApi.createTransfer({ serviceItemId, toBranchId, courierExecutorId: courierId || null, reason: reason.trim() || null }),
    invalidate: TRANSFER_INVALIDATION,
    success: t('create.created'),
    onSuccess: (transfer) => {
      onOpenChange(false)
      onDone?.(transfer)
    },
  })
  const { reset } = action
  useEffect(() => {
    if (open) {
      setToBranchId('')
      setCourierId('')
      setReason('')
      reset()
    }
  }, [open, reset])

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('create.title')}
      description={t('create.description')}
      target={target}
      confirmLabel={t('create.submit')}
      submitting={action.isPending}
      submitDisabled={!toBranchId}
      error={action.error ?? branches.error}
      onSubmit={() => action.mutate()}
    >
      <Field label={t('create.toBranch')} htmlFor={`${uid}-to`} required hint={!branches.isPending && destinations.length === 0 ? t('create.noBranches') : undefined}>
        <Select id={`${uid}-to`} value={toBranchId} onChange={(e) => setToBranchId(e.target.value)} placeholder={t('create.pickBranch')} disabled={branches.isPending} className="h-11">
          {destinations.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} · {b.code}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t('create.courier')} htmlFor={`${uid}-courier`} optional hint={t('create.courierHint')}>
        <Select id={`${uid}-courier`} value={courierId} onChange={(e) => setCourierId(e.target.value)} disabled={couriers.isPending} className="h-11">
          <option value="">{t('create.noCourier')}</option>
          {deliverers.map((e) => (
            <option key={e.id} value={e.id}>
              {e.fullName}
              {e.homeBranchName ? ` · ${e.homeBranchName}` : ''}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t('create.reason')} htmlFor={`${uid}-reason`} optional>
        <Textarea id={`${uid}-reason`} dir="auto" rows={2} maxLength={TRANSFER_LIMITS.reason} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </ActionDialog>
  )
}
