import { ArrowLeftRight, Building } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { qk } from '@/api/keys'
import type { ServiceItemProviderView } from '@/api/types'
import { ActionDialog } from '@/components/ActionDialog'
import { KeyValue } from '@/components/KeyValue'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field } from '@/components/ui/label'
import { branchesApi } from '@/features/branches/api'
import { BranchSelect } from '@/features/branches/BranchSelect'
import '@/features/branches/i18n'
import { useAction } from '@/hooks/useAction'
import { WORK_INVALIDATION } from '../api'
import { useTargetLabel, useWriteGate } from '../hooks'

/**
 * The service's branch (PROVIDER-BRANCHES phase 1 §2, §6): how it is served, the branch responsible for it, and where
 * its device is now. "تغيير الفرع" while `canChangeBranch` (open, and no device has reached a branch yet).
 */
export function BranchCard({ item }: { item: ServiceItemProviderView }) {
  const { t } = useTranslation('branches')
  const gate = useWriteGate()
  const [open, setOpen] = useState(false)
  const showCurrent = item.fulfillmentChannel !== 'OnSite' || !!item.currentBranchId
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Building className="size-4 text-muted-foreground" /> {t('item.title')}
          </span>
        }
        actions={
          item.canChangeBranch ? (
            <Button size="xs" variant="outline" onClick={() => setOpen(true)} disabled={gate.disabled} title={gate.reason}>
              <ArrowLeftRight /> {t('item.change')}
            </Button>
          ) : undefined
        }
      />
      <CardBody>
        <KeyValue
          columns={1}
          items={[
            { label: t('item.channel'), value: <StatusBadge enum="FulfillmentChannel" value={item.fulfillmentChannel} dot={false} /> },
            { label: t('item.responsible'), value: item.branchName ?? <span className="text-muted-foreground">{t('item.none')}</span> },
            { label: t('item.current'), value: item.currentBranchName ?? <span className="text-muted-foreground">{t('item.notArrived')}</span>, hidden: !showCurrent },
          ]}
        />
      </CardBody>
      <ChangeBranchDialog item={item} open={open} onOpenChange={setOpen} />
    </Card>
  )
}

function ChangeBranchDialog({ item, open, onOpenChange }: { item: ServiceItemProviderView; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('branches')
  const targetLabel = useTargetLabel()
  const uid = useId()
  const [branchId, setBranchId] = useState<string | null>(null)
  const action = useAction({
    mutationFn: (id: string) => branchesApi.changeItemBranch(item.id, id),
    invalidate: [...WORK_INVALIDATION, qk.workshop, qk.branches],
    success: t('item.changed'),
    onSuccess: () => onOpenChange(false),
  })
  const { reset } = action
  useEffect(() => {
    if (open) {
      setBranchId(null)
      reset()
    }
  }, [open, reset])

  // Pickup and delivery goes only to branches that receive platform devices (`BranchNotReceivingDevices`).
  const pickup = item.fulfillmentChannel === 'PickupDelivery'

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('item.changeTitle')}
      description={t('item.changeHint')}
      target={targetLabel(item)}
      changes={item.branchName ? `${item.branchName} →` : undefined}
      submitting={action.isPending}
      submitDisabled={!branchId || branchId === item.branchId}
      error={action.error}
      onSubmit={() => branchId && action.mutate(branchId)}
    >
      <Field label={t('item.newBranch')} htmlFor={`${uid}-branch`} required>
        <BranchSelect
          id={`${uid}-branch`}
          value={branchId}
          onChange={setBranchId}
          emptyLabel={t('switcher.choose')}
          filter={(b) => b.id !== item.branchId && (!pickup || b.receivesPlatformDevices)}
        />
      </Field>
    </ActionDialog>
  )
}
