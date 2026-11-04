import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LOOKUP_STALE_TIME } from '@/api/queryClient'
import { Banknote, CheckCheck, HandCoins, History, Info, Users, Wallet, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toApiError } from '@/api/http'
import type { CashHolding, CashItem } from '@/api/types'
import { ActionDialog } from '@/components/ActionDialog'
import { QuickTabs } from '@/components/Filters'
import { DateTime, Money } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, ErrorState } from '@/components/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { useIsDesktopTable } from '@/hooks/useMediaQuery'
import { useUrlState } from '@/hooks/useUrlState'
import { formatMoney, formatNumber, toRiyadh } from '@/lib/format'
import { cn } from '@/lib/utils'
import { boardQueryOptions } from '@/features/work/api'
import { insightKeys, insightsApi } from './api'
import { TechnicianFilter } from './TechnicianFilter'
import { CASH_DAYS_ATTENTION, CASH_DAYS_DANGER, daysHeldFlag, MAX_HANDOVER, pruneSelection, selectAllState, selectionTotal, wholeDaysSince } from './trackingLogic'
import { KpiTile, ServiceLink } from './TrackingParts'
import './trackingI18n'

const schema = { executorId: '', view: 'held' }
const VIEWS = ['held', 'handedOver'] as const
type View = (typeof VIEWS)[number]

/**
 * `/team/cash`: cash technicians confirmed collecting from customers that the company has not yet recorded
 * receiving. Current state, no period. Recording a handover is bookkeeping between the company and its
 * technician: it changes no settlement, wallet or customer-facing state.
 */
export function CashPage() {
  const { t } = useTranslation('tracking')
  const { lang } = useLang()
  const { state, set } = useUrlState(schema)
  const view: View = (VIEWS as readonly string[]).includes(state.view) ? (state.view as View) : 'held'
  const holdings = useQuery({ queryKey: insightKeys.cash, queryFn: ({ signal }) => insightsApi.cash(signal), refetchOnWindowFocus: true })
  const selected = holdings.data?.technicians.find((h) => h.executorId === state.executorId) ?? null
  const panel = useRef<HTMLDivElement>(null)
  const desktop = useIsDesktopTable()

  const select = (executorId: string) => set({ executorId: executorId === state.executorId ? '' : executorId, view: 'held' })

  // On a phone the panel opens below the list: bring it into view.
  useEffect(() => {
    if (state.executorId && !desktop) panel.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }, [state.executorId, desktop])

  return (
    <>
      <PageHeader title={t('cash.title')} description={t('cash.subtitle')} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TechnicianFilter value={state.executorId} onChange={(id) => set({ executorId: id, view: 'held' })} />
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="size-3.5 shrink-0" aria-hidden />
          {t('cash.bookkeeping')}
        </span>
      </div>

      {holdings.isPending ? (
        <div className="space-y-4" aria-busy>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-[6.5rem]" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : holdings.isError ? (
        <Card>
          <ErrorState error={holdings.error} onRetry={() => void holdings.refetch()} />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <KpiTile
              icon={<HandCoins />}
              label={t('cash.totalHeld')}
              value={<Money value={holdings.data.totalHeld} />}
              sub={t('cash.withTechnicians', { count: holdings.data.technicians.length })}
              className={cn('col-span-2 sm:col-span-1', holdings.data.totalHeld > 0 && 'border-tone-waiting/40')}
            />
            <KpiTile icon={<Wallet />} label={t('cash.services')} value={formatNumber(holdings.data.items, lang)} sub={t('cash.servicesHint')} />
            <KpiTile icon={<CheckCheck />} label={t('cash.handedOver30')} value={<Money value={holdings.data.handedOverLast30Days} />} sub={t('cash.handedOver30Hint')} />
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-5">
            <Holders rows={holdings.data.technicians} selected={state.executorId} onSelect={select} className="lg:col-span-2" />
            <div ref={panel} className="scroll-mt-20 lg:sticky lg:top-20 lg:col-span-3">
              {state.executorId ? (
                <TechnicianCash
                  key={state.executorId}
                  executorId={state.executorId}
                  holding={selected}
                  view={view}
                  onView={(v) => set({ view: v })}
                  onClose={() => set({ executorId: '', view: 'held' })}
                />
              ) : (
                <Card className="hidden lg:block">
                  <EmptyState icon={<Users className="size-5" />} title={t('cash.pickTitle')} description={t('cash.pickHint')} />
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Who holds cash ───────────────────────────────────────────────────────────

const flagTone = { danger: 'danger', attention: 'attention' } as const

function DaysHeld({ days }: { days: number }) {
  const { t } = useTranslation('tracking')
  const flag = daysHeldFlag(days)
  const label = t('cash.days', { count: days })
  if (!flag) return <span className="tabular text-xs text-muted-foreground">{label}</span>
  return (
    <Badge tone={flagTone[flag]} dot className="tabular">
      {label}
    </Badge>
  )
}

function Holders({ rows, selected, onSelect, className }: { rows: readonly CashHolding[]; selected: string; onSelect: (id: string) => void; className?: string }) {
  const { t } = useTranslation('tracking')
  const { lang } = useLang()
  return (
    <Card className={className}>
      <CardHeader title={t('cash.holders')} description={rows.length ? t('cash.holdersHint') : undefined} />
      {rows.length === 0 ? (
        <EmptyState icon={<Banknote className="size-5" />} title={t('cash.noneHeld')} description={t('cash.noneHeldHint')} />
      ) : (
        <ul className="divide-y" role="listbox" aria-label={t('cash.holders')}>
          {rows.map((h) => {
            const active = h.executorId === selected
            return (
              <li key={h.executorId} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => onSelect(h.executorId)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/40',
                    active && 'bg-primary-soft/70 hover:bg-primary-soft/70',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{h.fullName}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span className="tabular">{t('cash.servicesCount', { count: h.items })}</span>
                      <span aria-hidden>·</span>
                      <span>
                        {t('cash.oldest')} <DateTime value={h.oldestCollectedAt} mode="date" />
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <Money value={h.heldAmount} className="font-semibold" />
                    <DaysHeld days={h.daysHeld} />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {rows.length > 0 && (
        <p className="border-t px-4 py-2 text-[0.6875rem] text-muted-foreground">{t('cash.thresholds', { attention: formatNumber(CASH_DAYS_ATTENTION, lang), danger: formatNumber(CASH_DAYS_DANGER, lang) })}</p>
      )}
    </Card>
  )
}

// ── One technician ───────────────────────────────────────────────────────────

function TechnicianCash({
  executorId,
  holding,
  view,
  onView,
  onClose,
}: {
  executorId: string
  holding: CashHolding | null
  view: View
  onView: (v: View) => void
  onClose: () => void
}) {
  const { t } = useTranslation('tracking')
  const held = useQuery({ queryKey: insightKeys.cashItems(executorId, false), queryFn: ({ signal }) => insightsApi.cashItems(executorId, false, signal) })
  const handed = useQuery({
    queryKey: insightKeys.cashItems(executorId, true),
    queryFn: ({ signal }) => insightsApi.cashItems(executorId, true, signal),
    enabled: view === 'handedOver',
  })
  const teamName = useTeamName(executorId)
  const name = holding?.fullName ?? teamName ?? t('cash.technician')

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{name}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {holding ? (
              <>
                <Money value={holding.heldAmount} className="font-medium text-foreground" /> · {t('cash.servicesCount', { count: holding.items })}
              </>
            ) : (
              t('cash.holdsNothing')
            )}
          </p>
        </div>
        <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label={t('cash.close')}>
          <X />
        </Button>
      </div>
      <QuickTabs
        className="px-2"
        value={view}
        onChange={(k) => onView(k as View)}
        tabs={[
          { key: 'held', label: t('cash.tabHeld'), count: held.data?.length },
          { key: 'handedOver', label: t('cash.tabHandedOver') },
        ]}
      />
      {view === 'held' ? (
        <HeldItems query={held} name={name} />
      ) : (
        <HandedOverItems query={handed} />
      )}
    </Card>
  )
}

/** The technician's name from the team list, for one who holds nothing now (picked from the filter). */
function useTeamName(executorId: string): string | undefined {
  const board = useQuery({ ...boardQueryOptions, staleTime: LOOKUP_STALE_TIME })
  return board.data?.executors.find((e) => e.executorId === executorId)?.fullName
}

type ItemsQuery = ReturnType<typeof useQuery<CashItem[]>>

function ItemsSkeleton() {
  return (
    <div className="space-y-2 p-4" aria-busy>
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-12" />
      ))}
    </div>
  )
}

function HeldItems({ query, name: who }: { query: ItemsQuery; name: string }) {
  const { t } = useTranslation('tracking')
  const { lang } = useLang()
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [confirming, setConfirming] = useState(false)
  const [note, setNote] = useState('')
  const noteId = useId()
  const queryClient = useQueryClient()

  // Oldest first: the cash held longest is the one to collect.
  const items = useMemo(() => [...(query.data ?? [])].sort((a, b) => a.collectedAt.localeCompare(b.collectedAt)), [query.data])
  // After a refresh, ids no longer held simply drop out of the selection.
  const effective = useMemo(() => pruneSelection(selected, items), [selected, items])
  const total = selectionTotal(items, effective)
  const allState = selectAllState(items, effective)
  const tooMany = total.count > MAX_HANDOVER

  const handover = useAction({
    mutationFn: (body: { serviceItemIds: string[]; note?: string }) => insightsApi.cashHandover(body),
    invalidate: [insightKeys.cash],
    success: (r) => t('cash.done', { amount: formatMoney(r.amount, lang), count: r.items, name: who }),
    onSuccess: () => {
      setSelected(new Set())
      setConfirming(false)
    },
  })
  const invalid = handover.isError && toApiError(handover.error).errorCode === 'CashHandoverInvalid'

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const submit = () =>
    handover.mutate(
      { serviceItemIds: items.filter((i) => effective.has(i.serviceItemId)).map((i) => i.serviceItemId), note: note.trim() || undefined },
      {
        // Something changed under us (another supervisor recorded it, or the service changed): reload what is held.
        onError: (e) => {
          if (toApiError(e).errorCode === 'CashHandoverInvalid') void queryClient.invalidateQueries({ queryKey: insightKeys.cash })
        },
      },
    )

  if (query.isPending) return <ItemsSkeleton />
  if (query.isError) return <ErrorState compact error={query.error} onRetry={() => void query.refetch()} />
  if (items.length === 0) return <EmptyState icon={<CheckCheck className="size-5" />} title={t('cash.nothingHeld', { name: who })} description={t('cash.nothingHeldHint')} />

  return (
    <>
      <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-2 text-xs">
        <Checkbox
          id={`${noteId}-all`}
          checked={allState}
          onCheckedChange={(v) => setSelected(v === true ? new Set(items.map((i) => i.serviceItemId)) : new Set())}
          aria-label={t('cash.selectAll')}
        />
        <label htmlFor={`${noteId}-all`} className="cursor-pointer font-medium">
          {t('cash.selectAllCount', { count: items.length })}
        </label>
      </div>
      <ul className={cn('divide-y transition-opacity', query.isFetching && 'opacity-70')}>
        {items.map((item) => {
          const id = `${noteId}-${item.serviceItemId}`
          const checked = effective.has(item.serviceItemId)
          const days = wholeDaysSince(item.collectedAt)
          const flag = daysHeldFlag(days)
          return (
            <li key={item.serviceItemId} className={cn('flex items-center gap-3 px-4 py-2.5', checked && 'bg-primary-soft/40')}>
              <Checkbox id={id} checked={checked} onCheckedChange={(v) => toggle(item.serviceItemId, v === true)} aria-label={t('cash.selectOne', { number: item.itemNumber ?? '' })} />
              <ServiceLink item={item} className="flex-1 text-sm" />
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <Money value={item.amount} className="text-sm font-semibold" />
                <span className={cn('text-[0.6875rem]', flag === 'danger' ? 'text-tone-danger' : flag === 'attention' ? 'text-tone-attention' : 'text-muted-foreground')}>
                  {/* Whole days, as on the technician's row: a relative time would round 12.6 days up to 13. */}
                  {t('cash.collected')} <DateTime value={item.collectedAt} mode="date" /> · {t('cash.daysAgo', { count: days })}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
      {/* The selection and the one action stay in reach while scrolling a long list. */}
      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="min-w-0 text-sm" aria-live="polite">
          {total.count === 0 ? (
            <span className="text-muted-foreground">{t('cash.selectHint')}</span>
          ) : (
            <>
              <span className="text-muted-foreground">{t('cash.selected', { count: total.count })}</span> <Money value={total.amount} className="text-base font-semibold" />
              {tooMany && <p className="text-xs text-tone-danger">{t('cash.tooMany', { max: MAX_HANDOVER })}</p>}
            </>
          )}
        </div>
        <Button
          onClick={() => {
            handover.reset()
            setNote('')
            setConfirming(true)
          }}
          disabled={total.count === 0 || tooMany}
        >
          <HandCoins /> {t('cash.receive')}
        </Button>
      </div>

      <ActionDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('cash.dialogTitle')}
        description={t('cash.dialogDescription')}
        target={t('cash.dialogTarget', { name: who, count: total.count })}
        changes={
          <div className="space-y-1">
            <Money value={total.amount} className="text-2xl font-semibold" />
            <p>{t('cash.dialogChanges', { amount: formatMoney(total.amount, lang), count: total.count, name: who })}</p>
          </div>
        }
        confirmLabel={t('cash.confirm', { amount: formatMoney(total.amount, lang) })}
        submitting={handover.isPending}
        submitDisabled={total.count === 0 || tooMany}
        error={handover.error}
        onSubmit={submit}
      >
        {invalid && (
          <p className="rounded-md border border-tone-waiting/40 bg-tone-waiting-soft px-3 py-2 text-sm text-tone-waiting">
            {total.count === 0 ? t('cash.invalidNone') : t('cash.invalidRefreshed')}
          </p>
        )}
        <Field label={t('cash.note')} htmlFor={noteId} optional hint={t('cash.noteHint')}>
          <Textarea id={noteId} value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder={t('cash.notePlaceholder')} />
        </Field>
      </ActionDialog>
    </>
  )
}

function HandedOverItems({ query }: { query: ItemsQuery }) {
  const { t } = useTranslation('tracking')
  const { lang } = useLang()
  const desktop = useIsDesktopTable()
  const items = useMemo(() => [...(query.data ?? [])].sort((a, b) => (b.handedOverAt ?? '').localeCompare(a.handedOverAt ?? '')), [query.data])
  const total = selectionTotal(items, new Set(items.map((i) => i.serviceItemId)))

  if (query.isPending) return <ItemsSkeleton />
  if (query.isError) return <ErrorState compact error={query.error} onRetry={() => void query.refetch()} />
  if (items.length === 0) return <EmptyState icon={<History className="size-5" />} title={t('cash.noHandovers')} />

  return (
    <>
      <p className="border-b px-4 py-2 text-xs text-muted-foreground">
        {t('cash.handedOverSummary', { amount: formatMoney(total.amount, lang), count: total.count })}
      </p>
      {desktop ? (
        <div className="overflow-x-auto">
          <Table>
            <THead>
              <Tr>
                <Th>{t('cash.service')}</Th>
                <Th className="text-end">{t('cash.amount')}</Th>
                <Th>{t('cash.collectedAt')}</Th>
                <Th>{t('cash.receivedAt')}</Th>
                <Th>{t('cash.receivedBy')}</Th>
              </Tr>
            </THead>
            <TBody>
              {items.map((i) => (
                <Tr key={i.serviceItemId}>
                  <Td className="max-w-[14rem]">
                    <ServiceLink item={i} className="text-sm" />
                  </Td>
                  <Td className="text-end">
                    <Money value={i.amount} />
                  </Td>
                  <Td>
                    <DateTime value={i.collectedAt} mode="absolute" className="text-xs" />
                  </Td>
                  <Td>
                    <DateTime value={i.handedOverAt} mode="absolute" className="text-xs" />
                  </Td>
                  <Td className="text-xs">{i.handedOverBy ?? '—'}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      ) : (
        <ul className="divide-y">
          {items.map((i) => (
            <li key={i.serviceItemId} className="space-y-1 px-4 py-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <ServiceLink item={i} />
                <Money value={i.amount} className="shrink-0 font-semibold" />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('cash.receivedLine', {
                  at: toRiyadh(i.handedOverAt)?.format('YYYY/MM/DD HH:mm') ?? '—',
                  by: i.handedOverBy ?? '—',
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
