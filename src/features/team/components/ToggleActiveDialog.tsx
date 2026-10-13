import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/components/ActionDialog'
import { useAction } from '@/hooks/useAction'
import { formatSaudiMobile } from '@/lib/phone'
import { teamApi, teamInvalidation } from '../api'
import '../i18n'

export interface ToggleTarget {
  kind: 'executor' | 'supervisor'
  /** Executor id, or the supervisor's member id. */
  id: string
  name: string
  phone: string | null
  /** Current state; the action flips it. */
  isActive: boolean
}

/**
 * Enable / disable a technician (`PATCH …/executors/{id}/active`) or a supervisor (owner only,
 * `PATCH …/supervisors/{memberId}/active`). Disabling ends their session on the server.
 * `CannotDeactivateOwner` (an independent technician's owner) comes back as the server's message.
 */
export function ToggleActiveDialog({ target, onOpenChange }: { target: ToggleTarget | null; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('team')

  const toggle = useAction({
    mutationFn: async (v: ToggleTarget): Promise<void> => {
      if (v.kind === 'executor') await teamApi.setExecutorActive(v.id, !v.isActive)
      else await teamApi.setSupervisorActive(v.id, !v.isActive)
    },
    invalidate: (_r, v) => (v.kind === 'executor' ? teamInvalidation.executor : teamInvalidation.supervisor),
    success: (_r, v) => (v.isActive ? t('toggle.deactivated') : t('toggle.activated')),
    onSuccess: () => onOpenChange(false),
  })
  const { reset } = toggle

  useEffect(() => {
    if (target) reset()
  }, [target, reset])

  const off = !!target?.isActive
  const title = !target
    ? ''
    : target.kind === 'executor'
      ? off
        ? t('toggle.deactivateExecutor')
        : t('toggle.activateExecutor')
      : off
        ? t('toggle.deactivateSupervisor')
        : t('toggle.activateSupervisor')
  const changes = !target
    ? undefined
    : target.kind === 'executor'
      ? off
        ? t('toggle.executorOff')
        : t('toggle.executorOn')
      : off
        ? t('toggle.supervisorOff')
        : t('toggle.supervisorOn')

  return (
    <ConfirmDialog
      open={target !== null}
      onOpenChange={onOpenChange}
      destructive={off}
      title={title}
      target={target ? [target.name, target.phone ? formatSaudiMobile(target.phone) : null].filter(Boolean).join(' · ') : undefined}
      changes={changes}
      confirmLabel={off ? t('toggle.deactivate') : t('toggle.activate')}
      submitting={toggle.isPending}
      error={toggle.error}
      onSubmit={() => target && toggle.mutate(target)}
    />
  )
}
