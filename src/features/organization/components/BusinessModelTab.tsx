import { Briefcase, Gavel, Hourglass, Layers, Lock, Store } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toApiError } from '@/api/http'
import { qk } from '@/api/keys'
import type { ProviderBusinessModel, ProviderOrganizationResponse } from '@/api/types'
import { ChoiceCards, type Choice } from '@/components/ChoiceCards'
import { InlineError } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { canChangeBusinessModel, isBusinessModelRequest, selectableBusinessModels, useProvider } from '@/app/provider'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { enumLabel } from '@/i18n/enums'
import { formatDate } from '@/lib/format'
import { organizationApi } from '../api'

const ICONS = { ExecutionPartner: Briefcase, MarketplacePartner: Gavel, Both: Layers, CounterOnly: Store } as const
const MODELS: readonly ProviderBusinessModel[] = ['ExecutionPartner', 'MarketplacePartner', 'Both', 'CounterOnly']

/**
 * نموذج العمل (§8.9, PROVIDER-BRANCHES phase 3 §7): owner only. Free before review; after approval a platform model may
 * move to "counter only" at once (`BusinessModelHasOpenItems`), and leaving "counter only" is a request the platform
 * reviews (`pendingBusinessModel`). Sending the current model again withdraws the request.
 */
export function BusinessModelTab() {
  const { t } = useTranslation('organization')
  const { lang } = useLang()
  const { org, isOwner } = useProvider()
  const selectable = selectableBusinessModels(org.verificationStatus, org.businessModel)
  const unlocked = selectable.length > 0
  const editable = isOwner && unlocked
  const [value, setValue] = useState<ProviderBusinessModel>(org.pendingBusinessModel ?? org.businessModel)

  useEffect(() => setValue(org.pendingBusinessModel ?? org.businessModel), [org.businessModel, org.pendingBusinessModel])

  const save = useAction<ProviderBusinessModel, ProviderOrganizationResponse>({
    mutationFn: organizationApi.updateBusinessModel,
    // The menu, the counter and the branches' platform flags follow the model.
    invalidate: [qk.organization, qk.branches, qk.subscription],
    success: (_r, v) =>
      v === org.businessModel && org.pendingBusinessModel
        ? t('model.withdrawn')
        : isBusinessModelRequest(org.verificationStatus, org.businessModel, v)
          ? t('model.requested')
          : t('model.saved'),
  })

  // Locked: show every model read-only; otherwise only what may be picked now (plus the current one).
  const shown = unlocked ? MODELS.filter((m) => selectable.includes(m) || m === org.businessModel) : MODELS
  const choices: Choice<ProviderBusinessModel>[] = shown.map((m) => ({
    value: m,
    title: t(`model.choices.${m}.title`),
    hint: t(`model.choices.${m}.hint`),
    icon: ICONS[m],
  }))

  const lockReason = !unlocked ? t('model.locked') : !isOwner ? t('model.ownerOnly') : null
  const request = isBusinessModelRequest(org.verificationStatus, org.businessModel, value)
  const target = org.pendingBusinessModel ?? org.businessModel
  const e = save.error ? toApiError(save.error) : null
  const openItems = e?.errorCode === 'BusinessModelHasOpenItems' ? Number((e.details as { count?: number } | undefined)?.count ?? 0) : null

  return (
    <Card className="max-w-4xl">
      <CardHeader title={t('model.title')} description={t('model.hint')} />
      <CardBody className="space-y-4">
        {lockReason && (
          <p className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0" />
            {lockReason}
          </p>
        )}
        {org.pendingBusinessModel && (
          <div className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-tone-waiting/30 bg-tone-waiting-soft px-3 py-2 text-sm text-tone-waiting" role="status">
            <span className="flex items-start gap-2">
              <Hourglass className="mt-0.5 size-4 shrink-0" />
              {t('model.pending', { model: enumLabel('ProviderBusinessModel', org.pendingBusinessModel, lang), date: formatDate(org.businessModelRequestedAt, lang) })}
            </span>
            {isOwner && (
              <Button size="xs" variant="outline" loading={save.isPending} onClick={() => save.mutate(org.businessModel)}>
                {t('model.withdraw')}
              </Button>
            )}
          </div>
        )}
        <ChoiceCards label={t('model.title')} value={value} onChange={setValue} choices={choices} columns={2} disabled={!editable || save.isPending} />
        <p className="text-xs text-muted-foreground">{t('model.tenders')}</p>
        {!canChangeBusinessModel(org.verificationStatus) && unlocked && <p className="text-xs text-muted-foreground">{t('model.afterApproval')}</p>}
        {request && <p className="text-xs text-muted-foreground">{t('model.afterUpgrade')}</p>}
        {openItems !== null ? (
          <p className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive" role="alert">
            {t('model.openItems', { count: openItems })}
          </p>
        ) : (
          <InlineError error={save.error} />
        )}
      </CardBody>
      {editable && (
        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <Button onClick={() => save.mutate(value)} loading={save.isPending} disabled={value === target}>
            {request ? t('model.requestLabel') : t('model.save')}
          </Button>
        </div>
      )}
    </Card>
  )
}
