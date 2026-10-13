import { useQuery } from '@tanstack/react-query'
import { Check, MapPin, Star } from 'lucide-react'
import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionDialog } from '@/components/ActionDialog'
import { ErrorState, Spinner } from '@/components/States'
import { Badge, toneDot } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import type { ExecutorCandidateResponse } from '@/api/types'
import { enumLabel, enumTone } from '@/i18n/enums'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { WORK_INVALIDATION, workApi, workKeys } from '../api'
import { useTargetLabel, type WorkTarget } from '../hooks'
import { bestCandidateId, ineligibleReasons, workErrorDetail } from '../logic'
import { Avatar, LoadBar, ScoreBar, WorkErrorHint } from './widgets'
import '../i18n'

interface CandidatePickerDialogProps {
  item: WorkTarget
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `reassign` when the item already has a technician (§8.4 action table). */
  mode?: 'assign' | 'reassign'
  /** The current technician, marked in the list on reassign. */
  currentExecutorId?: string | null
  onDone?: () => void
}

/**
 * The candidate picker (§8.5): the organization's technicians ranked by the server (eligible
 * first, then by score — the order is kept). Ineligible rows are greyed with their reasons and
 * can't be chosen. Assigning a technician is the organization's acceptance of the item.
 */
export function CandidatePickerDialog({ item, open, onOpenChange, mode = 'assign', currentExecutorId, onDone }: CandidatePickerDialogProps) {
  const { t } = useTranslation('work')
  const targetLabel = useTargetLabel()
  const reasonId = useId()
  const [selected, setSelected] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const query = useQuery({
    queryKey: workKeys.candidates(item.id),
    queryFn: ({ signal }) => workApi.candidates(item.id, signal),
    enabled: open,
    staleTime: 10_000,
  })
  const rows = useMemo(() => query.data ?? [], [query.data])
  const best = bestCandidateId(rows)

  const action = useAction({
    mutationFn: (body: { executorId: string; reason: string | null }) => (mode === 'reassign' ? workApi.reassign(item.id, body) : workApi.assign(item.id, body)),
    invalidate: WORK_INVALIDATION,
    success: mode === 'reassign' ? t('actions.success.reassign') : t('actions.success.assign'),
    onSuccess: () => {
      onOpenChange(false)
      onDone?.()
    },
  })

  useEffect(() => {
    if (open) {
      setSelected(null)
      setReason('')
      action.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Preselect the best eligible technician once the list arrives.
  useEffect(() => {
    if (open && selected === null && best && best !== currentExecutorId) setSelected(best)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, best])

  const { error, detail } = useMemo(() => workErrorDetail(action.error), [action.error])
  const chosen = rows.find((r) => r.executorId === selected)
  const anyEligible = best !== null

  // Arrow keys move between the selectable rows (a radiogroup).
  const selectable = rows.filter((r) => r.isEligible)
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp'].includes(e.key) || !selectable.length) return
    e.preventDefault()
    const i = selectable.findIndex((r) => r.executorId === selected)
    const next = e.key === 'ArrowDown' ? (i + 1) % selectable.length : (i - 1 + selectable.length) % selectable.length
    const id = selectable[next]!.executorId
    setSelected(id)
    document.getElementById(`cand-${id}`)?.focus()
  }

  const title = mode === 'reassign' ? t('picker.titleReassign') : t('picker.title')

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={title}
      description={t('picker.description')}
      target={targetLabel(item)}
      changes={chosen ? <span className="font-medium">{chosen.fullName}</span> : undefined}
      confirmLabel={title}
      submitting={action.isPending}
      submitDisabled={!selected || selected === currentExecutorId}
      error={error}
      onSubmit={() => selected && action.mutate({ executorId: selected, reason: reason.trim() || null })}
    >
      {query.isPending ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t('picker.none')}</p>
      ) : (
        <>
          {!anyEligible && <p className="rounded-md bg-tone-waiting-soft px-3 py-2 text-xs text-tone-waiting">{t('picker.noneEligible')}</p>}
          <div role="radiogroup" aria-label={title} onKeyDown={onKey} className="max-h-[50vh] space-y-2 overflow-y-auto pe-1">
            {rows.map((c) => (
              <CandidateRow
                key={c.executorId}
                c={c}
                best={c.executorId === best}
                current={c.executorId === currentExecutorId}
                selected={c.executorId === selected}
                focusable={c.executorId === selected || (!selected && c.executorId === best)}
                onSelect={() => setSelected(c.executorId)}
              />
            ))}
          </div>
        </>
      )}
      <Field label={t('picker.reason')} htmlFor={reasonId} optional>
        <Input id={reasonId} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} />
      </Field>
      <WorkErrorHint detail={detail} />
    </ActionDialog>
  )
}

function CandidateRow({
  c,
  best,
  current,
  selected,
  focusable,
  onSelect,
}: {
  c: ExecutorCandidateResponse
  best: boolean
  current: boolean
  selected: boolean
  focusable: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation('work')
  const { lang } = useLang()
  const reasons = ineligibleReasons(c)
  const disabled = !c.isEligible || current
  return (
    <div
      id={`cand-${c.executorId}`}
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : focusable ? 0 : -1}
      onClick={() => !disabled && onSelect()}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !disabled) {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border p-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
        disabled ? 'cursor-not-allowed bg-muted/40 opacity-60' : 'cursor-pointer hover:bg-muted/50',
        selected && 'border-primary bg-primary-soft',
      )}
    >
      <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
        <span className="relative">
          <Avatar name={c.fullName} muted={!c.isEligible} />
          {selected && (
            <span className="absolute -bottom-0.5 -end-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-surface">
              <Check className="size-3" />
            </span>
          )}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-medium">{c.fullName}</span>
            {best && <Badge tone="success">{t('picker.best')}</Badge>}
            {current && <Badge tone="info">{t('picker.current')}</Badge>}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className={cn('size-2 rounded-full', toneDot[enumTone('ExecutorAvailability', c.availability)])} aria-hidden />
              {enumLabel('ExecutorAvailability', c.availability, lang)}
            </span>
            {c.specialization && <span className="truncate">· {c.specialization}</span>}
          </div>
          {reasons.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {reasons.map((r) => (
                <Badge key={r} tone="danger">
                  {t(`picker.reasons.${r}`)}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <LoadBar used={c.activeJobs} total={c.maxConcurrentJobs} />
        <span className="tabular inline-flex items-center gap-1" title={t('picker.rating')}>
          <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
          {c.averageRating > 0 ? formatNumber(c.averageRating, lang, 1) : '—'}
        </span>
        <span className="text-muted-foreground">{t('picker.completed', { count: c.completedItemsCount })}</span>
        <span className="inline-flex items-center gap-1 text-muted-foreground" title={c.distanceKm === null ? t('picker.noDistance') : undefined}>
          <MapPin className="size-3.5" aria-hidden />
          {c.distanceKm === null ? '—' : t('picker.distance', { distance: formatNumber(c.distanceKm, lang, 1) })}
        </span>
        {c.isEligible && <ScoreBar score={c.score} />}
      </div>
    </div>
  )
}
