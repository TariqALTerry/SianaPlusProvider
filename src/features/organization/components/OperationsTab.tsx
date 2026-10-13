import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useId, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { qk } from '@/api/keys'
import type { ProviderOrganizationResponse, UpdateProviderOperationsRequest } from '@/api/types'
import { InlineError } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Switch } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useProvider } from '@/app/provider'
import { useAction } from '@/hooks/useAction'
import { organizationApi } from '../api'

/** التشغيل (§8.9): capacity 1..500 and delegating executor picks to the platform. Both roles. */
export function OperationsTab() {
  const { t } = useTranslation('organization')
  const { org } = useProvider()
  const id = useId()

  const schema = useMemo(
    () =>
      z.object({
        capacity: z
          .number({ invalid_type_error: t('operations.capacityRange') })
          .int(t('operations.capacityRange'))
          .min(1, t('operations.capacityRange'))
          .max(500, t('operations.capacityRange')),
        delegateExecutorAssignmentToPlatform: z.boolean(),
      }),
    [t],
  )

  const toValues = (o: ProviderOrganizationResponse): UpdateProviderOperationsRequest => ({
    capacity: o.capacity,
    delegateExecutorAssignmentToPlatform: o.delegateExecutorAssignmentToPlatform,
  })

  const form = useForm<UpdateProviderOperationsRequest>({ resolver: zodResolver(schema), defaultValues: toValues(org), mode: 'onTouched' })
  const { register, control, handleSubmit, formState, reset } = form

  useEffect(() => {
    if (!formState.isDirty) reset(toValues(org))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org])

  const save = useAction<UpdateProviderOperationsRequest, ProviderOrganizationResponse>({
    mutationFn: organizationApi.updateOperations,
    invalidate: [qk.organization],
    success: t('operations.saved'),
    onSuccess: (updated) => reset(toValues(updated)),
  })

  return (
    <Card className="max-w-2xl">
      <CardHeader title={t('operations.title')} description={t('operations.hint')} />
      <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate>
        <CardBody className="space-y-6">
          <Field
            label={t('operations.capacity')}
            htmlFor={`${id}-capacity`}
            required
            hint={
              <>
                {t('operations.capacityHint')}. {t('operations.executors', { count: org.executorsCount })}
              </>
            }
            error={formState.errors.capacity?.message}
          >
            <Input
              id={`${id}-capacity`}
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              step={1}
              dir="ltr"
              className="w-32 text-start tabular"
              aria-invalid={!!formState.errors.capacity}
              {...register('capacity', { valueAsNumber: true })}
            />
          </Field>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-1">
              <label htmlFor={`${id}-delegate`} className="cursor-pointer text-sm font-medium">
                {t('operations.delegate')}
              </label>
              <p id={`${id}-delegate-hint`} className="text-xs leading-relaxed text-muted-foreground">
                {t('operations.delegateHint')}
              </p>
            </div>
            <Controller
              control={control}
              name="delegateExecutorAssignmentToPlatform"
              render={({ field }) => (
                <Switch
                  id={`${id}-delegate`}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-describedby={`${id}-delegate-hint`}
                  className="mt-0.5"
                />
              )}
            />
          </div>

          <InlineError error={save.error} />
        </CardBody>
        <div className="flex justify-end gap-2 border-t px-4 py-3">
          {formState.isDirty && (
            <Button variant="ghost" onClick={() => reset(toValues(org))} disabled={save.isPending}>
              {t('common:actions.reset')}
            </Button>
          )}
          <Button type="submit" loading={save.isPending} disabled={!formState.isDirty}>
            {t('common:actions.saveChanges')}
          </Button>
        </div>
      </form>
    </Card>
  )
}
