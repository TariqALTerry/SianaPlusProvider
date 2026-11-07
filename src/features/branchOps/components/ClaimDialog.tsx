import { useQuery } from '@tanstack/react-query'
import { ClipboardPlus } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toApiError } from '@/api/http'
import type { CounterItemDetailResponse, CounterWarrantyLookupItem, IntakeAccessory, IntakeCondition, PowersOnState } from '@/api/types'
import { ActionDialog } from '@/components/ActionDialog'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Checkbox, CheckboxField } from '@/components/ui/checkbox'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useRoleKind } from '@/features/auth/authStore'
import { BranchSelect } from '@/features/branches/BranchSelect'
import { useBranchScope } from '@/features/branches/scope'
import { ChoiceChips, FlagChips } from '@/features/counter/components/FlagChips'
import { teamApi, teamKeys } from '@/features/team/api'
import { useAction } from '@/hooks/useAction'
import { qk } from '@/api/keys'
import { branchOpsApi } from '../api'
import {
  CLAIM_LIMITS,
  claimNeedsGoodwill,
  claimProblem,
  claimRequest,
  emptyClaim,
  intakePrefill,
  isManager,
  lineSelectable,
  lineState,
  type ClaimDraft,
} from '../logic'
import '../i18n'

const ACCESSORIES: readonly IntakeAccessory[] = ['Charger', 'Case', 'SimCard', 'MemoryCard', 'Box', 'Cable', 'Other']
const CONDITIONS: readonly IntakeCondition[] = ['Scratches', 'CrackedScreen', 'LiquidDamage', 'NotPoweringOn', 'Dents', 'MissingParts']
const POWERS_ON: readonly PowersOnState[] = ['Yes', 'No', 'NotTested']
const REPAIRERS_PARAMS = { activeFilter: 'Active' as const, page: 1, pageSize: 100 }

const toggle = <V,>(list: readonly V[], v: V) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

/**
 * "مطالبة بالضمان" (phase 5 §6, phase 6 §11): opens a new counter receipt for the device. Free while the chosen lines are
 * in warranty (assigned to the first repair's technician unless a supervisor picks another); past it, a goodwill claim
 * by the owner or a supervisor. The new receipt then needs its two photos (`/counter/items/{id}/done`).
 */
export function ClaimDialog({ item, open, onOpenChange }: { item: CounterWarrantyLookupItem; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('branchOps')
  const navigate = useNavigate()
  const uid = useId()
  const role = useRoleKind()
  const manager = isManager(role)
  const scope = useBranchScope()
  const defaultBranch = scope.selected?.counterEnabled && scope.selected.isActive ? scope.selected.id : (scope.branches.find((b) => b.isActive && b.counterEnabled)?.id ?? null)
  const [draft, setDraft] = useState<ClaimDraft>(() => emptyClaim(item, defaultBranch))
  const patch = (p: Partial<ClaimDraft>) => setDraft((d) => ({ ...d, ...p }))

  const repairers = useQuery({
    queryKey: teamKeys.executors(REPAIRERS_PARAMS),
    queryFn: ({ signal }) => teamApi.executors(REPAIRERS_PARAMS, signal),
    enabled: open && manager,
  })

  const action = useAction<void, CounterItemDetailResponse>({
    mutationFn: () => branchOpsApi.claimWarranty(item.warrantyId, claimRequest(draft, role)),
    invalidate: [qk.counter, qk.workshop, qk.work],
    success: t('claim.saved'),
    onSuccess: (created) => {
      onOpenChange(false)
      navigate(`/counter/items/${created.serviceItemId}/done`)
    },
  })
  const { reset } = action
  useEffect(() => {
    if (open) {
      setDraft(emptyClaim(item, defaultBranch))
      reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset, item.warrantyId])

  const needsGoodwill = claimNeedsGoodwill(item, draft.lineIds)
  const problem = claimProblem(draft, item, role)
  const expired = toApiError(action.error).errorCode === 'CounterWarrantyExpired'
  const device = [item.deviceName, item.brand, item.model].filter(Boolean).join(' ')

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={t('claim.title')}
      target={[item.warrantyNumber, item.customerName, device].filter(Boolean).join(' · ')}
      changes={needsGoodwill ? <span className="text-tone-attention">{t('claim.needsGoodwill')}</span> : <span className="text-tone-success">{t('claim.free')}</span>}
      confirmLabel={t('claim.submit')}
      submitting={action.isPending}
      submitDisabled={!!problem}
      error={action.error}
      onSubmit={() => action.mutate()}
    >
      {expired && (
        <div className="flex flex-col gap-2 rounded-lg border border-tone-attention/30 bg-tone-attention-soft p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-tone-attention">{t('claim.expiredTitle')}</p>
          <Button
            size="lg"
            onClick={() => {
              onOpenChange(false)
              navigate('/counter/new', { state: { prefill: intakePrefill(item) } })
            }}
          >
            <ClipboardPlus /> {t('claim.paidIntake')}
          </Button>
        </div>
      )}

      <Field label={t('claim.branch')} htmlFor={`${uid}-branch`} required hint={t('claim.branchHint')}>
        <BranchSelect id={`${uid}-branch`} value={draft.branchId} onChange={(branchId) => patch({ branchId })} filter={(b) => b.counterEnabled} emptyLabel="—" className="h-11" />
      </Field>

      <Field label={t('claim.description')} htmlFor={`${uid}-desc`} required error={problem === 'descriptionTooLong' ? t('claim.problem.descriptionTooLong') : undefined}>
        <Textarea id={`${uid}-desc`} dir="auto" rows={3} maxLength={CLAIM_LIMITS.description} value={draft.description} onChange={(e) => patch({ description: e.target.value })} />
      </Field>

      {item.lines.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t('claim.lines')}</legend>
          <p className="text-xs text-muted-foreground">{t('claim.linesHint')}</p>
          <ul className="divide-y rounded-md border">
            {item.lines.map((line) => {
              const state = lineState(line)
              const selectable = lineSelectable(line, role)
              const checked = draft.lineIds.includes(line.id)
              return (
                <li key={line.id} className="flex items-center gap-3 px-3 py-2">
                  <Checkbox
                    id={`${uid}-line-${line.id}`}
                    checked={checked}
                    disabled={!selectable}
                    onCheckedChange={() => patch({ lineIds: toggle(draft.lineIds, line.id) })}
                    aria-label={line.description}
                  />
                  <label htmlFor={`${uid}-line-${line.id}`} className="min-w-0 flex-1 cursor-pointer text-sm">
                    <span className="block truncate">{line.description}</span>
                    <span className="text-xs text-muted-foreground">
                      <StatusBadge enum="WarrantyLineKind" value={line.kind} dot={false} /> ×{line.quantity}
                    </span>
                  </label>
                  <span className="shrink-0 text-xs">
                    {state === 'claimable' ? (
                      <span className="text-tone-success">{t('warranty.daysLeft', { count: line.daysRemaining })}</span>
                    ) : state === 'claimed' ? (
                      <span className="text-muted-foreground">{t('warranty.lineClaimed')}</span>
                    ) : (
                      <span className="text-tone-danger">{t('warranty.lineExpired')}</span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
          {problem === 'lines' && <p className="text-xs text-destructive">{t('claim.problem.lines')}</p>}
        </fieldset>
      )}

      {manager && (
        <>
          <Field label={t('claim.executor')} htmlFor={`${uid}-exec`} optional>
            <Select id={`${uid}-exec`} value={draft.executorId ?? ''} onChange={(e) => patch({ executorId: e.target.value || null })} className="h-11" disabled={repairers.isPending}>
              <option value="">
                {t('claim.executorDefault')}
                {item.executorName ? ` — ${item.executorName}` : ''}
              </option>
              {(repairers.data?.items ?? [])
                .filter((e) => e.isActive && e.canRepair)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName}
                  </option>
                ))}
            </Select>
          </Field>

          <div className="space-y-3 rounded-lg border p-3">
            <CheckboxField id={`${uid}-goodwill`} checked={draft.goodwill} onCheckedChange={(goodwill) => patch({ goodwill })} label={t('claim.goodwill')} />
            {draft.goodwill && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t('claim.goodwillReason')} htmlFor={`${uid}-gwr`} required className="sm:col-span-2">
                  <Textarea id={`${uid}-gwr`} dir="auto" rows={2} maxLength={CLAIM_LIMITS.goodwillReason} value={draft.goodwillReason} onChange={(e) => patch({ goodwillReason: e.target.value })} />
                </Field>
                <Field label={t('claim.goodwillAmount')} htmlFor={`${uid}-gwa`} optional hint={t('claim.goodwillAmountHint')} error={problem === 'goodwillAmount' ? t('claim.problem.goodwillAmount') : undefined}>
                  <Input id={`${uid}-gwa`} type="number" inputMode="decimal" min={0} step="0.5" dir="ltr" className="tabular h-11" value={draft.goodwillAmount} onChange={(e) => patch({ goodwillAmount: e.target.value })} />
                </Field>
              </div>
            )}
          </div>
        </>
      )}

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">{t('claim.intake')}</legend>
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('claim.accessories')}</p>
          <FlagChips enum="IntakeAccessory" values={ACCESSORIES} selected={draft.accessories} onToggle={(v) => patch({ accessories: toggle(draft.accessories, v) })} label={t('claim.accessories')} />
          {draft.accessories.length > 0 && (
            <Input aria-label={t('claim.accessoriesNote')} placeholder={t('claim.accessoriesNote')} dir="auto" maxLength={CLAIM_LIMITS.accessoriesNote} value={draft.accessoriesNote} onChange={(e) => patch({ accessoriesNote: e.target.value })} />
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('claim.conditions')}</p>
          <FlagChips enum="IntakeCondition" values={CONDITIONS} selected={draft.conditions} onToggle={(v) => patch({ conditions: toggle(draft.conditions, v) })} label={t('claim.conditions')} />
          <Textarea aria-label={t('claim.conditionNotes')} placeholder={t('claim.conditionNotes')} dir="auto" rows={2} maxLength={CLAIM_LIMITS.note} value={draft.conditionNotes} onChange={(e) => patch({ conditionNotes: e.target.value })} />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('claim.powersOn')}</p>
          <ChoiceChips enum="PowersOnState" values={POWERS_ON} value={draft.powersOn} onChange={(powersOn) => patch({ powersOn })} label={t('claim.powersOn')} allowNone noneLabel={t('claim.notTested')} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('claim.lockCode')} htmlFor={`${uid}-lock`} optional hint={t('claim.lockCodeHint')}>
            <Input id={`${uid}-lock`} dir="ltr" autoComplete="off" className="h-11 font-mono" maxLength={CLAIM_LIMITS.lockCode} value={draft.lockCode} onChange={(e) => patch({ lockCode: e.target.value })} />
          </Field>
          <Field label={t('claim.promised')} htmlFor={`${uid}-promised`} optional>
            <Input id={`${uid}-promised`} type="datetime-local" dir="ltr" className="h-11" value={draft.promisedReadyAt} onChange={(e) => patch({ promisedReadyAt: e.target.value })} />
          </Field>
        </div>
      </fieldset>

      {problem && problem !== 'lines' && problem !== 'descriptionTooLong' && problem !== 'goodwillAmount' && <p className="text-xs text-muted-foreground">{t(`claim.problem.${problem}`)}</p>}
    </ActionDialog>
  )
}
