import { Building, Power, PowerOff, UserPlus } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toApiError } from '@/api/http'
import type { CreateFrontDeskRequest, TeamMemberResponse } from '@/api/types'
import { ActionDialog } from '@/components/ActionDialog'
import { PhoneField } from '@/components/PhoneField'
import { EmptyState, ErrorState, useErrorMessage } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckboxField } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useMyBranches } from '@/features/branches/api'
import { useAction } from '@/hooks/useAction'
import { formatSaudiMobile } from '@/lib/phone'
import { teamApi, teamInvalidation, useMembers } from '../api'
import { branchNames, EMPTY_PERSON, fieldForError, frontDeskBody, frontDeskOf, hasErrors, LIMITS, ltrIsolate, validatePerson, type PersonDraft } from '../utils'
import { CreatedDialog } from './Bits'
import { MemberList } from './MemberList'
import { ToggleActiveDialog, type ToggleTarget } from './ToggleActiveDialog'
import { useDraftErrorText } from './useDraftErrorText'
import '../i18n'

/**
 * الاستقبال (PROVIDER-BRANCHES phase 2 §2): front-desk accounts with their branches. The owner and supervisors add,
 * (de)activate and re-link them; a branch-linked supervisor only sees and offers their own branches (`me/branches`).
 */
export function FrontDeskTab() {
  const { t } = useTranslation('team')
  const members = useMembers()
  const mine = useMyBranches()
  const staff = frontDeskOf(members.data)
  const [adding, setAdding] = useState(false)
  const [toggle, setToggle] = useState<ToggleTarget | null>(null)
  const [branchesOf, setBranchesOf] = useState<TeamMemberResponse | null>(null)
  const branches = mine.data?.branches ?? []

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl text-sm text-muted-foreground">{t('frontDesk.intro')}</p>
        <Button size="sm" onClick={() => setAdding(true)} className="self-start">
          <UserPlus /> {t('frontDesk.add')}
        </Button>
      </div>

      {members.isError ? (
        <Card>
          <ErrorState error={members.error} onRetry={() => void members.refetch()} />
        </Card>
      ) : members.data && staff.length === 0 ? (
        <Card>
          <EmptyState
            title={t('frontDesk.empty')}
            description={t('frontDesk.emptyHint')}
            action={
              <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
                <UserPlus /> {t('frontDesk.add')}
              </Button>
            }
          />
        </Card>
      ) : (
        <MemberList
          members={staff}
          loading={members.isPending}
          showRole={false}
          actions={(m) => {
            const names = branchNames(m.branchIds, branches)
            const target: ToggleTarget = { kind: 'frontDesk', id: m.id, name: m.fullName || m.username, phone: m.phone, isActive: m.isActive }
            return (
              <span className="flex flex-wrap items-center justify-end gap-1">
                <span className="me-1 max-w-[14rem] truncate text-xs text-muted-foreground" title={names.join('، ')}>
                  {names.length ? t('frontDesk.inBranches', { names: names.join('، ') }) : t('frontDesk.allBranches')}
                </span>
                <Button size="xs" variant="ghost" onClick={() => setBranchesOf(m)}>
                  <Building /> {t('frontDesk.editBranches')}
                </Button>
                {m.isActive ? (
                  <Button size="xs" variant="ghost" className="text-destructive hover:bg-destructive-soft" onClick={() => setToggle(target)}>
                    <PowerOff /> {t('toggle.deactivate')}
                  </Button>
                ) : (
                  <Button size="xs" variant="ghost" onClick={() => setToggle(target)}>
                    <Power /> {t('toggle.activate')}
                  </Button>
                )}
              </span>
            )
          }}
        />
      )}

      <FrontDeskDialog open={adding} onOpenChange={setAdding} />
      <FrontDeskBranchesDialog member={branchesOf} onOpenChange={(o) => !o && setBranchesOf(null)} />
      <ToggleActiveDialog target={toggle} onOpenChange={(o) => !o && setToggle(null)} />
    </div>
  )
}

/** Branch checkboxes over the caller's own active branches. */
function BranchChecks({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const { t } = useTranslation('team')
  const mine = useMyBranches()
  const options = (mine.data?.branches ?? []).filter((b) => b.isActive || selected.includes(b.id))
  if (mine.isSuccess && options.length === 0) return <p className="text-sm text-muted-foreground">{t('frontDesk.noBranches')}</p>
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((b) => (
        <CheckboxField
          key={b.id}
          id={`fd-branch-${b.id}`}
          checked={selected.includes(b.id)}
          onCheckedChange={(on) => onChange(on ? [...new Set([...selected, b.id])] : selected.filter((x) => x !== b.id))}
          label={b.name}
          hint={b.code}
          disabled={!b.isActive && !selected.includes(b.id)}
        />
      ))}
    </div>
  )
}

/** «إضافة موظف استقبال»: name, mobile (their sign-in), optional email, and one branch at least. */
function FrontDeskDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('team')
  const uid = useId()
  const [draft, setDraft] = useState<PersonDraft>(EMPTY_PERSON)
  const [branchIds, setBranchIds] = useState<string[]>([])
  const [tried, setTried] = useState(false)
  const [created, setCreated] = useState<{ name: string; phone: string } | null>(null)
  const errorText = useDraftErrorText()
  const serverMessage = useErrorMessage()
  const mine = useMyBranches()

  const create = useAction({
    mutationFn: (body: CreateFrontDeskRequest) => teamApi.createFrontDesk(body),
    invalidate: teamInvalidation.frontDesk,
    success: t('frontDesk.added'),
    onSuccess: (res, body) => setCreated({ name: res.fullName || body.fullName, phone: res.phone ?? body.phone }),
  })
  const { reset } = create

  useEffect(() => {
    if (!open) return
    setDraft(EMPTY_PERSON)
    const only = mine.data?.branches.filter((b) => b.isActive) ?? []
    setBranchIds(only.length === 1 ? [only[0]!.id] : [])
    setTried(false)
    setCreated(null)
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset])

  const errors = validatePerson(draft)
  const serverField = create.error ? fieldForError(toApiError(create.error).errorCode) : null
  const show = (k: keyof PersonDraft): string | undefined => (serverField === k ? serverMessage(create.error) : tried ? errorText(errors[k]) : undefined)
  const patch = (p: Partial<PersonDraft>) => {
    setDraft((d) => ({ ...d, ...p }))
    if (serverField && serverField in p) reset()
  }

  if (created) {
    return (
      <CreatedDialog
        open={open}
        onOpenChange={onOpenChange}
        title={t('frontDesk.added')}
        message={t('frontDesk.signIn', { name: created.name, phone: ltrIsolate(formatSaudiMobile(created.phone)) })}
        onAnother={() => {
          setCreated(null)
          setDraft(EMPTY_PERSON)
          setTried(false)
          reset()
        }}
      />
    )
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('frontDesk.title')}
      confirmLabel={t('frontDesk.add')}
      submitting={create.isPending}
      error={serverField && serverField in EMPTY_PERSON ? null : create.error}
      onSubmit={() => {
        setTried(true)
        if (!hasErrors(errors) && branchIds.length > 0) create.mutate(frontDeskBody(draft, branchIds))
      }}
    >
      <Field label={t('form.fullName')} htmlFor={`${uid}-name`} required error={show('fullName')}>
        <Input id={`${uid}-name`} value={draft.fullName} onChange={(e) => patch({ fullName: e.target.value })} maxLength={LIMITS.name} autoComplete="off" autoFocus aria-invalid={!!show('fullName') || undefined} />
      </Field>
      <Field label={t('form.phone')} htmlFor={`${uid}-phone`} required hint={t('form.supervisorPhoneHint')} error={show('phone')}>
        <PhoneField id={`${uid}-phone`} value={draft.phone} onChange={(phone) => patch({ phone })} autoComplete="off" aria-invalid={!!show('phone') || undefined} />
      </Field>
      <Field label={t('form.email')} htmlFor={`${uid}-email`} optional error={show('email')}>
        <Input id={`${uid}-email`} type="email" dir="ltr" value={draft.email} onChange={(e) => patch({ email: e.target.value })} maxLength={LIMITS.email} autoComplete="off" />
      </Field>
      <Field label={t('frontDesk.branches')} required hint={t('frontDesk.branchesHint')} error={tried && branchIds.length === 0 ? t('frontDesk.branchesRequired') : undefined}>
        <BranchChecks selected={branchIds} onChange={setBranchIds} />
      </Field>
    </ActionDialog>
  )
}

/** Replace a front-desk member's branches (`PUT …/front-desk/{id}/branches`, one at least). */
function FrontDeskBranchesDialog({ member, onOpenChange }: { member: TeamMemberResponse | null; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('team')
  const [branchIds, setBranchIds] = useState<string[]>([])
  const save = useAction({
    mutationFn: (m: TeamMemberResponse) => teamApi.setFrontDeskBranches(m.id, branchIds),
    invalidate: teamInvalidation.frontDesk,
    success: t('frontDesk.branchesSaved'),
    onSuccess: () => onOpenChange(false),
  })
  const { reset } = save
  useEffect(() => {
    if (member) {
      setBranchIds(member.branchIds)
      reset()
    }
  }, [member, reset])

  return (
    <ActionDialog
      open={member !== null}
      onOpenChange={onOpenChange}
      title={t('frontDesk.branchesTitle')}
      description={t('frontDesk.branchesHint')}
      target={member ? [member.fullName || member.username, member.phone ? formatSaudiMobile(member.phone) : null].filter(Boolean).join(' · ') : undefined}
      submitting={save.isPending}
      submitDisabled={branchIds.length === 0}
      error={save.error}
      confirmLabel={t('common:actions.save')}
      onSubmit={() => member && save.mutate(member)}
    >
      <BranchChecks selected={branchIds} onChange={setBranchIds} />
    </ActionDialog>
  )
}
