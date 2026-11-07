import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowLeftRight, PackagePlus, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listQueryOptions } from '@/api/queryClient'
import type { StockRowResponse } from '@/api/types'
import { DataTable } from '@/components/DataTable'
import { QuickTabs, SearchInput } from '@/components/Filters'
import { DateTime, Money } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/menu'
import { useRoleKind } from '@/features/auth/authStore'
import { useBranchScope } from '@/features/branches/scope'
import { useLang } from '@/hooks/useLang'
import { useUrlState } from '@/hooks/useUrlState'
import { inventoryApi, inventoryKeys, type StockListParams } from './api'
import { Qty, InventoryTabs } from './components/Shared'
import { AdjustDialog, ReceiveDialog, TransferDialog, type StockTarget } from './components/StockDialogs'
import { canSeeCosts, canWriteInventory } from './logic'
import './i18n'

const schema = { view: 'all', search: '', page: 1, pageSize: 25 }

type Dialog = { kind: 'receive' | 'adjust' | 'transfer'; target: StockTarget | null } | null

/** Shared by the stock and low-stock pages: the columns of a stock row, costs only when the caller sees them. */
export function useStockColumns(options: { showBranch: boolean; onAction?: (kind: 'receive' | 'adjust' | 'transfer', row: StockRowResponse) => void; receiveOnly?: boolean }) {
  const { t } = useTranslation('inventory')
  const { pick } = useLang()
  const role = useRoleKind()
  const costs = canSeeCosts(role)
  const write = canWriteInventory(role) && !!options.onAction
  const { showBranch, onAction, receiveOnly } = options

  return useMemo<ColumnDef<StockRowResponse, unknown>[]>(() => {
    const cols: ColumnDef<StockRowResponse, unknown>[] = [
      {
        id: 'part',
        header: t('col.part'),
        meta: { alwaysVisible: true, cardTitle: true },
        cell: ({ row: { original: r } }) => (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate font-medium">{pick(r.nameAr, r.nameEn)}</span>
              {r.isLow && <Badge tone="attention">{t('low')}</Badge>}
              {!r.partIsActive && <Badge tone="muted">{t('inactive')}</Badge>}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              <bdi className="ltr-nums font-mono">{r.sku}</bdi>
              {r.brand && <> · {r.brand}</>}
            </div>
          </div>
        ),
      },
    ]
    if (showBranch) cols.push({ id: 'branch', header: t('col.branch'), cell: ({ row: { original: r } }) => <span className="text-sm">{r.branchName}</span> })
    cols.push(
      { id: 'onHand', header: t('col.onHand'), meta: { align: 'end' }, cell: ({ row: { original: r } }) => <Qty value={r.onHand} unit={r.unit} /> },
      { id: 'reserved', header: t('col.reserved'), meta: { align: 'end' }, cell: ({ row: { original: r } }) => <Qty value={r.reserved} className="text-muted-foreground" /> },
      {
        id: 'available',
        header: t('col.available'),
        meta: { align: 'end' },
        cell: ({ row: { original: r } }) =>
          r.available < 0 ? (
            <Tooltip content={t('negative')}>
              <span>
                <Qty value={r.available} className="font-semibold text-tone-danger" />
              </span>
            </Tooltip>
          ) : (
            <Qty value={r.available} className="font-semibold" />
          ),
      },
      { id: 'reorder', header: t('col.reorderLevel'), meta: { align: 'end', cardHidden: true }, cell: ({ row: { original: r } }) => <Qty value={r.reorderLevel} className="text-muted-foreground" /> },
    )
    if (costs) {
      cols.push(
        { id: 'averageCost', header: t('col.averageCost'), meta: { align: 'end', cardHidden: true }, cell: ({ row: { original: r } }) => <Money value={r.averageCost} /> },
        { id: 'value', header: t('col.value'), meta: { align: 'end' }, cell: ({ row: { original: r } }) => <Money value={r.value} /> },
      )
    }
    cols.push({ id: 'updated', header: t('col.updatedAt'), meta: { cardHidden: true, defaultHidden: true }, cell: ({ row: { original: r } }) => <DateTime value={r.updatedAt} className="text-xs text-muted-foreground" /> })
    if (write) {
      cols.push({
        id: 'actions',
        header: t('common:common.actions'),
        meta: { alwaysVisible: true, align: 'end' },
        cell: ({ row: { original: r } }) => (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant={receiveOnly ? 'default' : 'outline'} onClick={() => onAction!('receive', r)}>
              <PackagePlus /> {t('actions.receive')}
            </Button>
            {!receiveOnly && (
              <>
                <Tooltip content={t('actions.adjust')}>
                  <Button size="icon-sm" variant="ghost" aria-label={t('actions.adjust')} onClick={() => onAction!('adjust', r)}>
                    <SlidersHorizontal />
                  </Button>
                </Tooltip>
                <Tooltip content={t('actions.transfer')}>
                  <Button size="icon-sm" variant="ghost" aria-label={t('actions.transfer')} onClick={() => onAction!('transfer', r)}>
                    <ArrowLeftRight />
                  </Button>
                </Tooltip>
              </>
            )}
          </div>
        ),
      })
    }
    return cols
  }, [t, pick, costs, write, showBranch, onAction, receiveOnly])
}

/** A stock row as the target of a dialog. */
export function stockTarget(r: StockRowResponse, pick: (ar: string, en: string) => string): StockTarget {
  return { branchId: r.branchId, partItemId: r.partItemId, partLabel: `${r.sku} · ${pick(r.nameAr, r.nameEn)}`, onHand: r.onHand, unit: r.unit }
}

/** The dialog buttons and dialogs a stock page shares. */
export function StockActions({ dialog, setDialog }: { dialog: Dialog; setDialog: (d: Dialog) => void }) {
  const close = (open: boolean) => !open && setDialog(null)
  return (
    <>
      <ReceiveDialog open={dialog?.kind === 'receive'} onOpenChange={close} target={dialog?.target} />
      <AdjustDialog open={dialog?.kind === 'adjust'} onOpenChange={close} target={dialog?.target} />
      <TransferDialog open={dialog?.kind === 'transfer'} onOpenChange={close} target={dialog?.target} />
    </>
  )
}

export type { Dialog as StockDialogState }

/**
 * `/inventory/stock` (phase 6 §5): what is on the shelf, reserved for approved quotes, and available (it can go negative:
 * more promised than on the shelf), per branch of the switcher. Receive, adjust and transfer for the owner and
 * supervisors; the front desk reads without costs.
 */
export function StockPage() {
  const { t } = useTranslation('inventory')
  const { pick } = useLang()
  const role = useRoleKind()
  const write = canWriteInventory(role)
  const scope = useBranchScope()
  const { state, set } = useUrlState(schema)
  const [dialog, setDialog] = useState<Dialog>(null)
  const lowOnly = state.view === 'low'

  const params: StockListParams = { branchId: scope.branchId, search: state.search || undefined, lowOnly: lowOnly || undefined, page: state.page, pageSize: state.pageSize }
  const list = useQuery({
    queryKey: inventoryKeys.stock(params),
    queryFn: ({ signal }) => inventoryApi.stock(params, signal),
    ...listQueryOptions,
    enabled: scope.mode !== 'loading',
  })

  const columns = useStockColumns({ showBranch: !scope.selected, onAction: (kind, r) => setDialog({ kind, target: stockTarget(r, pick) }) })

  return (
    <>
      <PageHeader
        title={t('title')}
        description={scope.selected ? `${scope.selected.name} · ${t('description')}` : t('description')}
        actions={
          write ? (
            <>
              <Button size="lg" onClick={() => setDialog({ kind: 'receive', target: null })}>
                <PackagePlus /> {t('actions.receive')}
              </Button>
              <Button size="lg" variant="outline" onClick={() => setDialog({ kind: 'adjust', target: null })}>
                <SlidersHorizontal /> {t('actions.adjust')}
              </Button>
              <Button size="lg" variant="outline" onClick={() => setDialog({ kind: 'transfer', target: null })}>
                <ArrowLeftRight /> {t('actions.transfer')}
              </Button>
            </>
          ) : undefined
        }
      />
      <InventoryTabs />
      {!write && <p className="mb-3 text-xs text-muted-foreground">{t('readOnly')}</p>}

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <QuickTabs
          value={state.view}
          onChange={(view) => set({ view })}
          tabs={[
            { key: 'all', label: t('filter.allStates') },
            { key: 'low', label: t('filter.lowOnly') },
          ]}
        />
        <SearchInput value={state.search} onChange={(search) => set({ search })} placeholder={t('search.stock')} />
      </div>

      <DataTable
        id="inventory-stock"
        columns={columns}
        query={list}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={(page) => set({ page })}
        onPageSizeChange={(pageSize) => set({ pageSize })}
        getRowId={(r) => r.stockItemId}
        rowClassName={(r) => (r.available < 0 ? 'bg-tone-danger-soft/30' : undefined)}
        filtered={!!state.search || lowOnly}
        onClearFilters={() => set({ search: '', view: 'all' })}
        emptyTitle={state.search ? t('empty.stockSearch') : lowOnly ? t('empty.low') : t('empty.stock')}
      />

      {write && <StockActions dialog={dialog} setDialog={setDialog} />}
    </>
  )
}
