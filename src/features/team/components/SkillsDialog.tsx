import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toApiError } from '@/api/http'
import type { ExecutorResponse } from '@/api/types'
import { ActionDialog } from '@/components/ActionDialog'
import { ErrorState } from '@/components/States'
import { Skeleton } from '@/components/ui/skeleton'
import { useAction } from '@/hooks/useAction'
import { teamApi, teamInvalidation, useOrganizationCapabilities } from '../api'
import { sameSet, selectedOutside, skillOptions } from '../utils'
import { NoCapabilitiesHint, SkillPicker } from './Bits'
import '../i18n'

/**
 * «مهارات الفني»: `PUT …/executors/{id}/capabilities` (full replace), chosen only from the
 * organization's capabilities. A held skill the organization dropped shows marked, so it can
 * be removed but not re-added.
 */
export function SkillsDialog({ executor, onOpenChange }: { executor: ExecutorResponse | null; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('team')
  const uid = useId()
  const open = executor !== null
  const [selected, setSelected] = useState<string[]>([])
  const caps = useOrganizationCapabilities(open)

  const save = useAction({
    mutationFn: (capabilityIds: string[]) => teamApi.updateExecutorCapabilities(executor!.id, capabilityIds),
    invalidate: teamInvalidation.skills,
    success: t('skills.saved'),
    onSuccess: () => onOpenChange(false),
  })
  const { reset } = save

  useEffect(() => {
    if (!executor) return
    setSelected(executor.capabilities.map((c) => c.id))
    reset()
  }, [executor, reset])

  const options = skillOptions(caps.data?.capabilities ?? [], executor?.capabilities ?? [])
  const outside = selectedOutside(options, selected)
  const changed = !!executor && !sameSet(selected, executor.capabilities.map((c) => c.id))
  const orgHasNone = !!caps.data && caps.data.capabilities.length === 0

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('skills.title')}
      target={executor ? [executor.fullName, executor.specialization].filter(Boolean).join(' · ') : undefined}
      confirmLabel={t('common:actions.saveChanges')}
      submitting={save.isPending}
      submitDisabled={!changed || outside || caps.isPending || caps.isError}
      error={save.error}
      onSubmit={() =>
        save.mutate(selected, {
          onError: (e) => toApiError(e).errorCode === 'ExecutorCapabilityNotInOrganization' && void caps.refetch(),
        })
      }
    >
      <p id={`${uid}-label`} className="text-sm text-muted-foreground">
        {t('form.skillsHint')}
      </p>
      {caps.isPending ? (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      ) : caps.isError ? (
        <ErrorState compact error={caps.error} onRetry={() => void caps.refetch()} />
      ) : (
        <>
          {options.length > 0 && (
            <SkillPicker
              labelledBy={`${uid}-label`}
              options={options}
              selected={selected}
              onChange={(ids) => {
                setSelected(ids)
                if (save.error) save.reset()
              }}
              invalid={outside}
            />
          )}
          {outside ? (
            <p className="text-xs text-destructive" role="alert">
              {t('form.outsideSelected')}
            </p>
          ) : options.length > 0 ? (
            <p className="text-xs text-muted-foreground">{t('form.skillsCount', { count: selected.length })}</p>
          ) : null}
          {orgHasNone && <NoCapabilitiesHint />}
        </>
      )}
    </ActionDialog>
  )
}
