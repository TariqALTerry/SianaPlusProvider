import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toApiError } from '@/api/http'
import type { CrewCandidateResponse, CrewMemberResponse, ServiceItemProviderView } from '@/api/types'
import { ActionDialog } from '@/components/ActionDialog'
import { PhoneText } from '@/components/PhoneText'
import { ErrorState, Spinner } from '@/components/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useAction } from '@/hooks/useAction'
import { cn } from '@/lib/utils'
import { WORK_INVALIDATION, workApi, workKeys } from '../api'
import { useTargetLabel, useWriteGate } from '../hooks'
import { canManageCrew, crewCandidateSelectable, crewChanged, MAX_CREW } from '../logic'
import { Avatar, LoadBar } from './widgets'
import '../i18n'

/**
 * "الفريق" (crews, 2026-11-12): the lead (the assigned technician) first, then the teammates who work the service
 * with them. "إدارة الفريق" while the item has a lead and is not closed (`canManageCrew`).
 */
export function CrewCard({ item, crew }: { item: ServiceItemProviderView; crew: CrewMemberResponse[] }) {
  const { t } = useTranslation('work')
  const gate = useWriteGate()
  const [open, setOpen] = useState(false)
  const editable = canManageCrew(item)
  const hasCrew = crew.some((m) => !m.isLead)
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" /> {t('crew.title')}
          </span>
        }
        actions={
          editable ? (
            <Button size="xs" variant="outline" onClick={() => setOpen(true)} disabled={gate.disabled} title={gate.reason}>
              {t('crew.manage')}
            </Button>
          ) : undefined
        }
      />
      <CardBody className="space-y-3">
        <p className="text-xs text-muted-foreground">{t('crew.hint')}</p>
        {crew.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('crew.noLead')}</p>
        ) : (
          <ul className="space-y-3">
            {crew.map((m) => (
              <li key={m.executorId} className="flex items-center gap-3">
                <Avatar name={m.fullName} />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-medium">{m.fullName}</span>
                    {m.isLead && <Badge tone="active">{t('crew.lead')}</Badge>}
                  </p>
                  {m.specialization && <p className="truncate text-xs text-muted-foreground">{m.specialization}</p>}
                  {m.phone && <PhoneText phone={m.phone} className="text-xs" />}
                </div>
              </li>
            ))}
          </ul>
        )}
        {crew.length > 0 && !hasCrew && <p className="text-xs text-muted-foreground">{t('crew.onlyLead')}</p>}
      </CardBody>
      {editable && <CrewDialog item={item} crew={crew} open={open} onOpenChange={setOpen} />}
    </Card>
  )
}

function CrewDialog({
  item,
  crew,
  open,
  onOpenChange,
}: {
  item: ServiceItemProviderView
  crew: CrewMemberResponse[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('work')
  const targetLabel = useTargetLabel()
  const uid = useId()
  const [picked, setPicked] = useState<string[] | null>(null)

  const query = useQuery({
    queryKey: workKeys.crewCandidates(item.id),
    queryFn: ({ signal }) => workApi.crewCandidates(item.id, signal),
    enabled: open,
    staleTime: 10_000,
  })
  const rows = useMemo(() => query.data ?? [], [query.data])
  const saved = useMemo(() => crew.filter((m) => !m.isLead).map((m) => m.executorId), [crew])

  const action = useAction({
    mutationFn: (executorIds: string[]) => workApi.setCrew(item.id, { executorIds }),
    invalidate: WORK_INVALIDATION,
    success: t('crew.saved'),
    onSuccess: () => onOpenChange(false),
  })
  const { reset } = action

  useEffect(() => {
    if (open) {
      setPicked(null)
      reset()
    }
  }, [open, reset])

  // Start from the server's view of the crew once the candidates arrive.
  useEffect(() => {
    if (open && picked === null && query.data) setPicked(query.data.filter((c) => c.isInCrew).map((c) => c.executorId))
  }, [open, picked, query.data])

  // Someone left the company or was deactivated meanwhile: reload the list so the picker shows the truth.
  const { refetch } = query
  useEffect(() => {
    if (action.error && toApiError(action.error).errorCode === 'CrewMemberNotInOrganization') void refetch()
  }, [action.error, refetch])

  const current = picked ?? []
  const toggle = (id: string, on: boolean) => setPicked((p) => (on ? [...(p ?? []), id] : (p ?? []).filter((x) => x !== id)))
  const changed = picked !== null && crewChanged(saved, current)

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={t('crew.dialogTitle')}
      description={t('crew.hint')}
      target={targetLabel(item)}
      changes={changed ? (current.length ? t('crew.changes', { count: current.length }) : t('crew.cleared')) : undefined}
      submitting={action.isPending}
      submitDisabled={!changed}
      error={action.error}
      onSubmit={() => action.mutate(current)}
    >
      {query.isPending ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t('crew.none')}</p>
      ) : (
        <>
          <p className={cn('text-xs', current.length >= MAX_CREW ? 'text-tone-waiting' : 'text-muted-foreground')} role="status">
            {current.length >= MAX_CREW ? t('crew.maxReached', { max: MAX_CREW }) : t('crew.picked', { count: current.length, max: MAX_CREW })}
          </p>
          <ul className="max-h-[50vh] space-y-2 overflow-y-auto pe-1">
            {rows.map((c) => (
              <CrewCandidateRow
                key={c.executorId}
                id={`${uid}-${c.executorId}`}
                c={c}
                checked={current.includes(c.executorId)}
                selectable={crewCandidateSelectable(c, current.includes(c.executorId), current.length)}
                onChange={(on) => toggle(c.executorId, on)}
              />
            ))}
          </ul>
        </>
      )}
    </ActionDialog>
  )
}

function CrewCandidateRow({
  id,
  c,
  checked,
  selectable,
  onChange,
}: {
  id: string
  c: CrewCandidateResponse
  checked: boolean
  selectable: boolean
  onChange: (checked: boolean) => void
}) {
  const { t } = useTranslation('work')
  return (
    <li
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border p-3 transition-colors',
        !selectable ? 'bg-muted/40 opacity-60' : 'hover:bg-muted/50',
        checked && 'border-primary bg-primary-soft',
      )}
    >
      <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
        <Checkbox id={id} checked={checked} disabled={!selectable} onCheckedChange={(v) => onChange(v === true)} />
        <Avatar name={c.fullName} muted={!selectable} />
        <label htmlFor={id} className={cn('min-w-0', selectable ? 'cursor-pointer' : 'cursor-not-allowed')}>
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-medium">{c.fullName}</span>
            {!c.hasCapacity && <Badge tone="danger">{t('crew.full')}</Badge>}
          </span>
          {c.specialization && <span className="block truncate text-xs text-muted-foreground">{c.specialization}</span>}
        </label>
      </div>
      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        {t('crew.load')}
        <LoadBar used={c.activeJobs} total={c.maxConcurrentJobs} />
      </span>
    </li>
  )
}
