import { Briefcase, Gavel, Layers, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { qk } from '@/api/keys'
import type { ProviderBusinessModel, ProviderOrganizationResponse } from '@/api/types'
import { ChoiceCards, type Choice } from '@/components/ChoiceCards'
import { InlineError } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { canChangeBusinessModel, useProvider } from '@/app/provider'
import { useAction } from '@/hooks/useAction'
import { organizationApi } from '../api'

const ICONS = { ExecutionPartner: Briefcase, MarketplacePartner: Gavel, Both: Layers } as const
const MODELS: readonly ProviderBusinessModel[] = ['ExecutionPartner', 'MarketplacePartner', 'Both']

/** نموذج العمل (§8.9): owner, Draft / Rejected only; read-only otherwise (`BusinessModelLocked`). */
export function BusinessModelTab() {
  const { t } = useTranslation('organization')
  const { org, isOwner } = useProvider()
  const unlocked = canChangeBusinessModel(org.verificationStatus)
  const editable = isOwner && unlocked
  const [value, setValue] = useState<ProviderBusinessModel>(org.businessModel)

  useEffect(() => setValue(org.businessModel), [org.businessModel])

  const save = useAction<ProviderBusinessModel, ProviderOrganizationResponse>({
    mutationFn: organizationApi.updateBusinessModel,
    invalidate: [qk.organization],
    success: t('model.saved'),
  })

  const choices: Choice<ProviderBusinessModel>[] = MODELS.map((m) => ({
    value: m,
    title: t(`model.choices.${m}.title`),
    hint: t(`model.choices.${m}.hint`),
    icon: ICONS[m],
  }))

  const lockReason = !unlocked ? t('model.locked') : !isOwner ? t('model.ownerOnly') : null

  return (
    <Card className="max-w-3xl">
      <CardHeader title={t('model.title')} description={t('model.hint')} />
      <CardBody className="space-y-4">
        {lockReason && (
          <p className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0" />
            {lockReason}
          </p>
        )}
        <ChoiceCards label={t('model.title')} value={value} onChange={setValue} choices={choices} columns={3} disabled={!editable || save.isPending} />
        <p className="text-xs text-muted-foreground">{t('model.tenders')}</p>
        <InlineError error={save.error} />
      </CardBody>
      {editable && (
        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <Button onClick={() => save.mutate(value)} loading={save.isPending} disabled={value === org.businessModel}>
            {t('model.save')}
          </Button>
        </div>
      )}
    </Card>
  )
}
