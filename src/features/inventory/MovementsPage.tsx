import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { listQueryOptions } from '@/api/queryClient'
import type { StockMovementKind, StockMovementResponse } from '@/api/types'
import { DataTable } from '@/components/DataTable'
import { DateRangeFilter, EnumFilter, FilterChips, type FilterChip } from '@/components/Filters'
import { DateTime, Money } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { EnumText } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { useRoleKind } from '@/features/auth/authStore'
import { useBranchScope } from '@/features/branches/scope'
import { useLang } from '@/hooks/useLang'
import { useUrlState } from '@/hooks/useUrlState'
import { enumLabel } from '@/i18n/enums'
import { cn } from '@/lib/utils'
import { inventoryApi, inventoryKeys, type MovementListParams } from './api'
import { InventoryTabs, PartPicker, Qty, SupplierSelect } from './components/Shared'
import { canSeeCosts, movementDirection } from './logic'
import './i18n'

const schema = { kind: '', partItemId: '', supplierId: '', serviceItemId: '', from: '', to: '', page: 1, pageSize: 25 }

/**
 * `/inventory/movements` (phase 6 §6): every receive, issue, return, adjustment, transfer and supplier return, newest
 * first. The log is never edited; a correction is a new adjustment. Quantities are signed (+ in, − out).
 */
export function MovementsPage() {
  const { t } = useTranslation('inventory')
  const { lang, pick } = useLang()
  const role = useRoleKind()
  const costs = canSeeCosts(role)
  const frontDesk = role === 'frontDesk'
  const scope = useBranchScope()
  const { state, set, reset, active } = useUrlState(schema)

  const params: MovementListParams = {
    branchId: scope.branchId,
    partItemId: state.partItemId || undefined,
    kind: (state.kind || undefined) as StockMovementKind | undefined,
    supplierId: state.supplierId || undefined,
    serviceItemId: state.serviceItemId || undefined,
    from: state.from || undefined,
    to: state.to || undefined,
    page: state.page,
    pageSize: state.pageSize,
  }
  const list = useQuery({
    queryKey: inventoryKeys.movements(params),
    queryFn: ({ signal }) => inventoryApi.movements(params, signal),
    ...listQueryOptions,
    enabled: scope.mode !== 'loading',
  })
  // The picked part's name after a reload (the URL keeps only its id).
  const part = useQuery({ queryKey: inventoryKeys.part(state.partItemId), queryFn: ({ signal }) => inventoryApi.part(state.partItemId, signal), enabled: !!state.partItemId })
  const partLabel = part.data ? `${part.data.sku} · ${pick(part.data.nameAr, part.data.nameEn)}` : null

  const columns = useMemo<ColumnDef<StockMovementResponse, unknown>[]>(() => {
    const cols: ColumnDef<StockMovementResponse, unknown>[] = [
      {
        id: 'part',
        header: t('col.part'),
        meta: { alwaysVisible: true, cardTitle: true },
        cell: ({ row: { original: m } }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{pick(m.partNameAr, m.partNameEn)}</div>
            <div className="truncate text-xs text-muted-foreground">
              <bdi className="ltr-nums font-mono">{m.sku}</bdi>
              {!scope.selected && <> · {m.branchName}</>}
            </div>
          </div>
        ),
      },
      {
        id: 'kind',
        header: t('col.kind'),
        cell: ({ row: { original: m } }) => (
          <div className="flex flex-col items-start gap-1">
            <span className="text-sm">
              <EnumText enum="StockMovementKind" value={m.kind} />
            </span>
            {m.negativeOverride && <Badge tone="danger">{t('negativeOverride')}</Badge>}
          </div>
        ),
      },
      {
        id: 'quantity',
        header: t('col.quantity'),
        meta: { align: 'end' },
        cell: ({ row: { original: m } }) => {
          const dir = movementDirection(m)
          if (dir === 'recordOnly') return <Badge tone="muted">{t('recordOnly')}</Badge>
          return <Qty value={m.quantity} signed className={cn('font-semibold', dir === 'in' ? 'text-tone-success' : 'text-tone-danger')} />
        },
      },
      { id: 'after', header: t('col.onHandAfter'), meta: { align: 'end', cardHidden: true }, cell: ({ row: { original: m } }) => <Qty value={m.onHandAfter} className="text-muted-foreground" /> },
    ]
    if (costs) cols.push({ id: 'unitCost', header: t('col.unitCost'), meta: { align: 'end', cardHidden: true }, cell: ({ row: { original: m } }) => <Money value={m.unitCost} /> })
    cols.push(
      {
        id: 'source',
        header: t('col.supplier'),
        meta: { cardHidden: true },
        cell: ({ row: { original: m } }) => (
          <div className="min-w-0 text-xs">
            <div className="truncate">{m.supplierName ?? '—'}</div>
            {m.batchRef && <bdi className="ltr-nums font-mono text-muted-foreground">{m.batchRef}</bdi>}
          </div>
        ),
      },
      {
        id: 'service',
        header: t('col.service'),
        cell: ({ row: { original: m } }) =>
          m.serviceItemId && m.itemNumber ? (
            frontDesk ? (
              <bdi className="ltr-nums font-mono text-xs">{m.itemNumber}</bdi>
            ) : (
              <Link to={`/work/${m.serviceItemId}`} className="font-mono text-xs text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                <bdi className="ltr-nums">{m.itemNumber}</bdi>
              </Link>
            )
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'by',
        header: t('col.by'),
        meta: { cardHidden: true },
        cell: ({ row: { original: m } }) => (
          <div className="min-w-0 text-xs">
            <div className="truncate">{m.byName ?? '—'}</div>
            {m.note && <div className="line-clamp-2 text-muted-foreground">{m.note}</div>}
          </div>
        ),
      },
      { id: 'at', header: t('col.at'), cell: ({ row: { original: m } }) => <DateTime value={m.at} className="text-xs text-muted-foreground" /> },
    )
    return cols
  }, [t, pick, costs, frontDesk, scope.selected])

  const chips: FilterChip[] = []
  if (state.kind) chips.push({ key: 'kind', label: enumLabel('StockMovementKind', state.kind, lang), onRemove: () => set({ kind: '' }) })
  if (state.partItemId) chips.push({ key: 'part', label: partLabel ?? t('filter.part'), onRemove: () => set({ partItemId: '' }) })
  if (state.supplierId) chips.push({ key: 'supplier', label: t('filter.supplier'), onRemove: () => set({ supplierId: '' }) })
  if (state.serviceItemId) chips.push({ key: 'service', label: t('col.service'), onRemove: () => set({ serviceItemId: '' }) })
  if (state.from || state.to) chips.push({ key: 'date', label: `${state.from || '…'} – ${state.to || '…'}`, onRemove: () => set({ from: '', to: '' }) })

  return (
    <>
      <PageHeader title={t('title')} description={scope.selected ? `${scope.selected.name} · ${t('tabs.movements')}` : t('tabs.movements')} />
      <InventoryTabs />

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64">
          <PartPicker compact value={state.partItemId || null} selectedLabel={partLabel} onChange={(id) => set({ partItemId: id ?? '' })} />
        </div>
        <EnumFilter enumName="StockMovementKind" value={state.kind} onChange={(kind) => set({ kind })} label={t('filter.kind')} />
        <SupplierSelect value={state.supplierId || null} onChange={(id) => set({ supplierId: id ?? '' })} emptyLabel={t('filter.anySupplier')} className="h-8 w-auto min-w-[9rem] text-xs" />
        <DateRangeFilter from={state.from} to={state.to} onChange={(r) => set(r)} label={t('filter.date')} />
      </div>
      <FilterChips chips={chips} onClear={() => reset()} />

      <DataTable
        id="inventory-movements"
        className="mt-3"
        columns={columns}
        query={list}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={(page) => set({ page })}
        onPageSizeChange={(pageSize) => set({ pageSize })}
        getRowId={(m) => m.id}
        filtered={active.length > 0}
        onClearFilters={() => reset()}
        emptyTitle={t('empty.movements')}
      />
    </>
  )
}
