import { Copy, Trash2 } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toApiError } from '@/api/http'
import type { ProviderBranchResponse } from '@/api/types'
import { ActionDialog, ConfirmDialog } from '@/components/ActionDialog'
import { InlineError } from '@/components/States'
import { Button } from '@/components/ui/button'
import { CheckboxField } from '@/components/ui/checkbox'
import { Input, Select } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useMembers } from '@/features/team/api'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { enumLabel } from '@/i18n/enums'
import { nowRiyadh } from '@/lib/format'
import { BRANCH_INVALIDATION, branchesApi } from '../api'
import { closureProblem, hoursRequest, hoursRows, invalidHours, type HoursRow } from '../logic'
import '../i18n'

interface Props {
  branch: ProviderBranchResponse | null
  onOpenChange: (open: boolean) => void
}

const target = (b: ProviderBranchResponse) => `${b.name} · ${b.code}`

/** ساعات العمل: one row per day (open with times, closed, or not set); `PUT …/opening-hours`. */
export function HoursDialog({ branch, onOpenChange }: Props) {
  const { t } = useTranslation('branches')
  const { lang } = useLang()
  const [rows, setRows] = useState<HoursRow[]>([])
  const save = useAction({
    mutationFn: (b: ProviderBranchResponse) => branchesApi.setOpeningHours(b.id, hoursRequest(rows)),
    invalidate: BRANCH_INVALIDATION,
    success: t('hours.saved'),
    onSuccess: () => onOpenChange(false),
  })
  const { reset } = save

  useEffect(() => {
    if (branch) {
      setRows(hoursRows(branch.openingHours))
      reset()
    }
  }, [branch, reset])

  const bad = invalidHours(rows)
  const set = (i: number, p: Partial<HoursRow>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...p } : row)))
  const copyFirst = () => {
    const first = rows.find((r) => r.mode === 'open')
    if (first) setRows((r) => r.map((row) => ({ ...row, mode: 'open', opens: first.opens, closes: first.closes })))
  }

  return (
    <ActionDialog
      open={branch !== null}
      onOpenChange={onOpenChange}
      size="lg"
      title={t('hours.title')}
      description={t('hours.hint')}
      target={branch ? target(branch) : undefined}
      submitting={save.isPending}
      submitDisabled={bad.length > 0}
      error={save.error}
      onSubmit={() => branch && save.mutate(branch)}
      confirmLabel={t('common:actions.save')}
    >
      <div className="flex justify-end">
        <Button size="xs" variant="ghost" onClick={copyFirst} disabled={!rows.some((r) => r.mode === 'open')}>
          <Copy /> {t('hours.copyFirst')}
        </Button>
      </div>
      <ul className="divide-y rounded-lg border">
        {rows.map((r, i) => (
          <li key={r.day} className="flex flex-wrap items-center gap-2 px-3 py-2">
            <span className="w-20 text-sm font-medium">{enumLabel('DayOfWeek', r.day, lang)}</span>
            <Select value={r.mode} onChange={(e) => set(i, { mode: e.target.value as HoursRow['mode'] })} className="h-8 w-28" aria-label={enumLabel('DayOfWeek', r.day, lang)}>
              <option value="open">{t('hours.open')}</option>
              <option value="closed">{t('hours.closed')}</option>
              <option value="unset">{t('hours.unset')}</option>
            </Select>
            {r.mode === 'open' && (
              <span className="flex items-center gap-1.5">
                <Input type="time" dir="ltr" value={r.opens} onChange={(e) => set(i, { opens: e.target.value })} className="h-8 w-28 tabular" aria-label={t('hours.opens')} aria-invalid={bad.includes(r.day) || undefined} />
                <span className="text-muted-foreground">–</span>
                <Input type="time" dir="ltr" value={r.closes} onChange={(e) => set(i, { closes: e.target.value })} className="h-8 w-28 tabular" aria-label={t('hours.closes')} aria-invalid={bad.includes(r.day) || undefined} />
              </span>
            )}
          </li>
        ))}
      </ul>
      {bad.length > 0 && <p className="text-xs text-destructive">{t('hours.invalid', { days: bad.map((d) => enumLabel('DayOfWeek', d, lang)).join('، ') })}</p>}
    </ActionDialog>
  )
}

/** الإغلاقات: the upcoming closures, add one (`startsOn ≤ endsOn`, within a year) or remove one. */
export function ClosuresDialog({ branch, onOpenChange }: Props) {
  const { t } = useTranslation('branches')
  const uid = useId()
  const [current, setCurrent] = useState<ProviderBranchResponse | null>(null)
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [reason, setReason] = useState('')
  const today = nowRiyadh().format('YYYY-MM-DD')

  const add = useAction({
    mutationFn: (b: ProviderBranchResponse) => branchesApi.addClosure(b.id, { startsOn, endsOn, reason: reason.trim() || null }),
    invalidate: BRANCH_INVALIDATION,
    success: t('closures.added'),
    onSuccess: (updated) => {
      setCurrent(updated)
      setStartsOn('')
      setEndsOn('')
      setReason('')
    },
  })
  const remove = useAction({
    mutationFn: ({ b, closureId }: { b: ProviderBranchResponse; closureId: string }) => branchesApi.removeClosure(b.id, closureId),
    invalidate: BRANCH_INVALIDATION,
    success: t('closures.removed'),
    onSuccess: (updated) => setCurrent(updated),
    errorToast: true,
  })
  const { reset } = add

  useEffect(() => {
    if (branch) {
      setCurrent(branch)
      setStartsOn('')
      setEndsOn('')
      setReason('')
      reset()
    }
  }, [branch, reset])

  const problem = closureProblem(startsOn, endsOn, today)

  return (
    <ActionDialog
      open={branch !== null}
      onOpenChange={onOpenChange}
      title={t('closures.title')}
      description={t('closures.hint')}
      target={current ? target(current) : undefined}
      submitting={add.isPending}
      submitDisabled={!!problem}
      error={add.error}
      confirmLabel={t('closures.add')}
      onSubmit={() => current && add.mutate(current)}
    >
      {current && current.closures.length > 0 ? (
        <ul className="divide-y rounded-lg border">
          {current.closures.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span>
                <bdi className="ltr-nums tabular">{c.startsOn === c.endsOn ? c.startsOn : `${c.startsOn} → ${c.endsOn}`}</bdi>
                {c.reason && <span className="ms-2 text-muted-foreground">{c.reason}</span>}
              </span>
              <Button size="xs" variant="ghost" className="text-destructive hover:bg-destructive-soft" loading={remove.isPending && remove.variables?.closureId === c.id} onClick={() => remove.mutate({ b: current, closureId: c.id })}>
                <Trash2 /> {t('closures.remove')}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t('tab.noClosures')}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('closures.startsOn')} htmlFor={`${uid}-from`} required>
          <Input id={`${uid}-from`} type="date" dir="ltr" min={today} value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
        </Field>
        <Field label={t('closures.endsOn')} htmlFor={`${uid}-to`} required>
          <Input id={`${uid}-to`} type="date" dir="ltr" min={startsOn || today} value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
        </Field>
      </div>
      <Field label={t('closures.reason')} htmlFor={`${uid}-reason`} optional>
        <Input id={`${uid}-reason`} value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
      </Field>
      {problem && problem !== 'missing' && <p className="text-xs text-destructive">{t(`closures.problems.${problem}`)}</p>}
    </ActionDialog>
  )
}

/** ربط الفريق: supervisors and front-desk staff only; replaces this branch's list (`PUT …/members`). */
export function MembersDialog({ branch, onOpenChange }: Props) {
  const { t } = useTranslation('branches')
  const members = useMembers()
  const [selected, setSelected] = useState<string[]>([])
  const save = useAction({
    mutationFn: (b: ProviderBranchResponse) => branchesApi.setMembers(b.id, selected),
    invalidate: BRANCH_INVALIDATION,
    success: t('members.saved'),
    onSuccess: () => onOpenChange(false),
  })
  const { reset } = save

  useEffect(() => {
    if (branch) {
      setSelected(branch.members.map((m) => m.memberId))
      reset()
    }
  }, [branch, reset])

  const linkable = (members.data ?? []).filter((m) => (m.role === 'Supervisor' || m.role === 'FrontDesk') && m.isActive)
  const toggle = (id: string, on: boolean) => setSelected((s) => (on ? [...new Set([...s, id])] : s.filter((x) => x !== id)))

  return (
    <ActionDialog
      open={branch !== null}
      onOpenChange={onOpenChange}
      title={t('members.title')}
      description={t('members.hint')}
      target={branch ? target(branch) : undefined}
      submitting={save.isPending}
      error={save.error}
      confirmLabel={t('common:actions.save')}
      onSubmit={() => branch && save.mutate(branch)}
    >
      {members.isPending ? (
        <Skeleton className="h-24" />
      ) : members.isError ? (
        <InlineError error={members.error} />
      ) : linkable.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('members.empty')}{' '}
          <Link to="/team?tab=frontDesk" className="text-primary underline" onClick={() => onOpenChange(false)}>
            {t('common:nav.team')}
          </Link>
        </p>
      ) : (
        <div className="space-y-3">
          {linkable.map((m) => (
            <CheckboxField
              key={m.id}
              id={`member-${m.id}`}
              checked={selected.includes(m.id)}
              onCheckedChange={(on) => toggle(m.id, on)}
              label={m.fullName || m.username}
              hint={<EnumLabel value={m.role} />}
            />
          ))}
        </div>
      )}
    </ActionDialog>
  )
}

function EnumLabel({ value }: { value: string }) {
  const { lang } = useLang()
  return <>{enumLabel('ProviderMemberRole', value, lang)}</>
}

/** Make another active branch the main one (`set-main`); the old main becomes ordinary. */
export function SetMainDialog({ branch, onOpenChange }: Props) {
  const { t } = useTranslation('branches')
  const action = useAction({
    mutationFn: (b: ProviderBranchResponse) => branchesApi.setMain(b.id),
    invalidate: BRANCH_INVALIDATION,
    success: t('main.done'),
    onSuccess: () => onOpenChange(false),
  })
  const { reset } = action
  useEffect(() => {
    if (branch) reset()
  }, [branch, reset])
  return (
    <ConfirmDialog
      open={branch !== null}
      onOpenChange={onOpenChange}
      title={t('main.title')}
      target={branch ? target(branch) : undefined}
      changes={branch ? t('main.changes', { name: branch.name }) : undefined}
      submitting={action.isPending}
      error={action.error}
      onSubmit={() => branch && action.mutate(branch)}
    />
  )
}

/**
 * Stop or restart a branch. The main one never stops (`MainBranchCannotBeDeactivated`), nor one holding customer
 * devices (`BranchHasDevices`, the count is shown up front); restarting a counter branch may hit the plan's limit.
 */
export function ActiveDialog({ branch, onOpenChange }: Props) {
  const { t } = useTranslation('branches')
  const action = useAction({
    mutationFn: (b: ProviderBranchResponse) => branchesApi.setActive(b.id, !b.isActive),
    invalidate: BRANCH_INVALIDATION,
    success: (_r, b) => (b.isActive ? t('active.deactivated') : t('active.activated')),
    onSuccess: () => onOpenChange(false),
  })
  const { reset } = action
  useEffect(() => {
    if (branch) reset()
  }, [branch, reset])

  const off = !!branch?.isActive
  const blocked = off && (branch?.isMain || (branch?.devicesInBranchCount ?? 0) > 0)
  const limitHit = toApiError(action.error).errorCode === 'CounterBranchLimitReached'

  return (
    <ConfirmDialog
      open={branch !== null}
      onOpenChange={onOpenChange}
      destructive={off}
      title={off ? t('active.deactivateTitle') : t('active.activateTitle')}
      target={branch ? target(branch) : undefined}
      changes={
        branch ? (
          <span className="space-y-1">
            <span className="block">{off ? t('active.deactivateChanges') : t('active.activateChanges')}</span>
            {off && branch.isMain && <span className="block font-medium text-destructive">{t('active.mainBlocked')}</span>}
            {off && branch.devicesInBranchCount > 0 && <span className="block font-medium text-destructive">{t('active.devicesWarning', { count: branch.devicesInBranchCount })}</span>}
            {limitHit && (
              <Link to="/subscription" className="block font-medium text-primary underline" onClick={() => onOpenChange(false)}>
                {t('active.limitCta')}
              </Link>
            )}
          </span>
        ) : undefined
      }
      confirmLabel={off ? t('tab.deactivate') : t('tab.activate')}
      submitting={action.isPending}
      submitDisabled={blocked}
      error={action.error}
      onSubmit={() => branch && action.mutate(branch)}
    />
  )
}

