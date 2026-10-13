import { CircleCheck, CirclePause, TreePalm, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ExecutorResponse } from '@/api/types'
import { ActionDialog } from '@/components/ActionDialog'
import { ChoiceCards } from '@/components/ChoiceCards'
import { StatusBadge } from '@/components/StatusBadge'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { enumLabel } from '@/i18n/enums'
import { teamApi, teamInvalidation } from '../api'
import { SETTABLE_AVAILABILITY, isSettableAvailability, type SettableAvailability } from '../utils'
import { Hint } from './Bits'
import '../i18n'

const AVAILABILITY_ICON: Record<SettableAvailability, LucideIcon> = {
  Available: CircleCheck,
  Offline: CirclePause,
  OnLeave: TreePalm,
}

/**
 * «تغيير التوافر»: `PATCH …/executors/{id}/availability` with Available / Offline / OnLeave.
 * `Busy` is the platform's call (`ExecutorAvailabilityNotSettable`): shown, never offered.
 */
export function AvailabilityDialog({ executor, onOpenChange }: { executor: ExecutorResponse | null; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('team')
  const { lang } = useLang()
  const open = executor !== null
  const [value, setValue] = useState<SettableAvailability | ''>('')

  const save = useAction({
    mutationFn: (availability: SettableAvailability) => teamApi.setExecutorAvailability(executor!.id, availability),
    invalidate: teamInvalidation.executor,
    success: t('availability.saved'),
    onSuccess: () => onOpenChange(false),
  })
  const { reset } = save

  useEffect(() => {
    if (!executor) return
    setValue(isSettableAvailability(executor.availability) ? executor.availability : '')
    reset()
  }, [executor, reset])

  const current = executor?.availability
  const changed = value !== '' && value !== current

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={t('availability.title')}
      target={executor?.fullName}
      confirmLabel={t('common:actions.save')}
      submitting={save.isPending}
      submitDisabled={!changed}
      error={save.error}
      onSubmit={() => value && save.mutate(value)}
    >
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {t('availability.current')}
        <StatusBadge enum="ExecutorAvailability" value={current} />
      </p>
      {current === 'Busy' && <Hint>{t('availability.busyNote')}</Hint>}
      <ChoiceCards<SettableAvailability>
        label={t('availability.title')}
        value={value || undefined}
        onChange={(v) => {
          setValue(v)
          if (save.error) reset()
        }}
        columns={3}
        choices={SETTABLE_AVAILABILITY.map((v) => ({
          value: v,
          title: enumLabel('ExecutorAvailability', v, lang),
          hint: t(`availability.hint.${v}`),
          icon: AVAILABILITY_ICON[v],
        }))}
      />
      {current !== 'Busy' && <p className="text-xs text-muted-foreground">{t('availability.busyNote')}</p>}
    </ActionDialog>
  )
}
