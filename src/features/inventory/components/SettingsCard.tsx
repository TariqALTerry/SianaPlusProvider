import { useQuery } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionDialog } from '@/components/ActionDialog'
import { InlineError } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useRoleKind } from '@/features/auth/authStore'
import { useAction } from '@/hooks/useAction'
import { INVENTORY_INVALIDATION, inventoryApi, inventoryKeys } from '../api'
import { INVENTORY_LIMITS, parseDecimal, settingsAccess } from '../logic'
import '../i18n'

/**
 * "ضمان العمل الافتراضي" (phase 6 §9): the owner and supervisors read it, the owner saves it. Empty or 0 = no warranty
 * on labour lines unless the technician writes days.
 */
export function SettingsCard() {
  const { t } = useTranslation('inventory')
  const uid = useId()
  const access = settingsAccess(useRoleKind())
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const settings = useQuery({ queryKey: inventoryKeys.settings(), queryFn: ({ signal }) => inventoryApi.settings(signal), enabled: access !== 'none' })
  const action = useAction({
    mutationFn: (days: number | null) => inventoryApi.updateSettings({ defaultLaborWarrantyDays: days }),
    invalidate: INVENTORY_INVALIDATION,
    success: t('settings.saved'),
    onSuccess: () => setOpen(false),
  })
  const { reset } = action
  useEffect(() => {
    if (open) {
      setValue(settings.data?.defaultLaborWarrantyDays ? String(settings.data.defaultLaborWarrantyDays) : '')
      reset()
    }
  }, [open, settings.data, reset])

  if (access === 'none') return null

  const days = settings.data?.defaultLaborWarrantyDays ?? null
  const parsed = parseDecimal(value)
  const invalid = value.trim() !== '' && (parsed === null || !Number.isInteger(parsed) || parsed < 0 || parsed > INVENTORY_LIMITS.warrantyMax)

  return (
    <Card className="mb-4">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" aria-hidden /> {t('settings.title')}
          </span>
        }
        description={t('settings.hint')}
        actions={
          access === 'edit' ? (
            <Button variant="outline" onClick={() => setOpen(true)} disabled={settings.isPending}>
              {t('common:actions.edit')}
            </Button>
          ) : undefined
        }
      />
      <CardBody className="text-sm">
        {settings.isPending ? (
          <Skeleton className="h-5 w-40" />
        ) : settings.isError ? (
          <InlineError error={settings.error} />
        ) : (
          <p>
            <span className="font-semibold">{days ? t('days', { count: days }) : t('settings.none')}</span>
            {access === 'read' && <span className="ms-2 text-xs text-muted-foreground">{t('settings.ownerOnly')}</span>}
          </p>
        )}
      </CardBody>

      <ActionDialog
        open={open}
        onOpenChange={setOpen}
        title={t('settings.title')}
        description={t('settings.hint')}
        changes={t('settings.current', { value: days ? t('days', { count: days }) : t('settings.none') })}
        confirmLabel={t('common:actions.save')}
        size="sm"
        submitting={action.isPending}
        submitDisabled={invalid}
        error={action.error}
        onSubmit={() => action.mutate(value.trim() === '' || parsed === 0 ? null : parsed)}
      >
        <Field label={t('settings.days')} htmlFor={`${uid}-days`} optional hint={t('form.warrantyHint')} error={invalid ? t('errors.range') : undefined}>
          <Input id={`${uid}-days`} type="text" inputMode="numeric" dir="ltr" className="h-11 tabular" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        </Field>
      </ActionDialog>
    </Card>
  )
}
