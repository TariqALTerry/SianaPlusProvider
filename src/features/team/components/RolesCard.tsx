import { Truck, Wrench } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { ExecutorResponse, SetExecutorRolesRequest } from '@/api/types'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Switch } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useAction } from '@/hooks/useAction'
import { teamApi, teamInvalidation } from '../api'
import '../i18n'

/**
 * The member's two independent roles (service tracking): repair (offered repairs) and delivery (pickup and return
 * trips). Either or both; the last one on can't be turned off (`ExecutorRolesRequired`). One click each, so a failure
 * is a toast; the member is re-read after every change.
 */
export function RolesCard({ executor }: { executor: ExecutorResponse }) {
  const { t } = useTranslation('team')
  const action = useAction({
    mutationFn: (body: SetExecutorRolesRequest) => teamApi.setExecutorRoles(executor.id, body),
    invalidate: teamInvalidation.roles,
    success: t('roles.saved'),
    errorToast: true,
  })
  const roles = { canRepair: executor.canRepair, canDeliver: executor.canDeliver }
  const set = (patch: Partial<SetExecutorRolesRequest>) => action.mutate({ ...roles, ...patch })

  return (
    <Card>
      <CardHeader title={t('roles.title')} description={t('roles.hint')} />
      <CardBody className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <RoleSwitch
            icon={<Wrench className="size-4" />}
            label={t('roles.repair')}
            description={t('roles.repairDescription')}
            checked={roles.canRepair}
            // The last role on stays on.
            locked={roles.canRepair && !roles.canDeliver}
            lockedReason={t('roles.lastRole')}
            pending={action.isPending}
            onChange={(v) => set({ canRepair: v })}
          />
          <RoleSwitch
            icon={<Truck className="size-4" />}
            label={t('roles.delivery')}
            description={t('roles.deliveryDescription')}
            checked={roles.canDeliver}
            locked={roles.canDeliver && !roles.canRepair}
            lockedReason={t('roles.lastRole')}
            pending={action.isPending}
            onChange={(v) => set({ canDeliver: v })}
          />
        </div>
        <p className="text-xs text-muted-foreground">{t('roles.keepsWork')}</p>
      </CardBody>
    </Card>
  )
}

function RoleSwitch({
  icon,
  label,
  description,
  checked,
  locked,
  lockedReason,
  pending,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  description: string
  checked: boolean
  locked: boolean
  lockedReason: string
  pending: boolean
  onChange: (value: boolean) => void
}) {
  const id = useId()
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3" title={locked ? lockedReason : undefined}>
      <span className="mt-0.5 text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
        <p className="mt-1 text-xs text-muted-foreground">{locked ? lockedReason : description}</p>
      </div>
      <Switch id={id} checked={checked} disabled={pending || locked} onCheckedChange={onChange} />
    </div>
  )
}
