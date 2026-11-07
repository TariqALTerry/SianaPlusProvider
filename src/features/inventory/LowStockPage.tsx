import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PaginatedResponse, StockRowResponse } from '@/api/types'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { useRoleKind } from '@/features/auth/authStore'
import { useBranchScope } from '@/features/branches/scope'
import { useLang } from '@/hooks/useLang'
import { inventoryApi, inventoryKeys } from './api'
import { InventoryTabs } from './components/Shared'
import { canWriteInventory } from './logic'
import { StockActions, stockTarget, useStockColumns, type StockDialogState } from './StockPage'
import './i18n'

/** The short array as one page, so it gets the same table and phone cards as the stock list. */
function asPage(items: StockRowResponse[]): PaginatedResponse<StockRowResponse> {
  return { items, totalCount: items.length, page: 1, pageSize: Math.max(items.length, 1), totalPages: 1, hasNextPage: false, hasPreviousPage: false }
}

/**
 * `/inventory/low-stock` (phase 6 §7): active parts whose available is at or under the reorder level, the shortest first.
 * "استلام" on a row opens the receive form with its branch and part filled in.
 */
export function LowStockPage() {
  const { t } = useTranslation('inventory')
  const { pick } = useLang()
  const write = canWriteInventory(useRoleKind())
  const scope = useBranchScope()
  const [dialog, setDialog] = useState<StockDialogState>(null)

  const list = useQuery({
    queryKey: inventoryKeys.lowStock(scope.branchId),
    queryFn: ({ signal }) => inventoryApi.lowStock(scope.branchId, signal),
    select: asPage,
    enabled: scope.mode !== 'loading',
  })
  const columns = useStockColumns({ showBranch: !scope.selected, receiveOnly: true, onAction: (kind, r) => setDialog({ kind, target: stockTarget(r, pick) }) })

  return (
    <>
      <PageHeader title={t('title')} description={scope.selected ? `${scope.selected.name} · ${t('tabs.lowStock')}` : t('tabs.lowStock')} />
      <InventoryTabs />
      {!write && <p className="mb-3 text-xs text-muted-foreground">{t('readOnly')}</p>}
      <DataTable
        id="inventory-low"
        columns={columns}
        query={list}
        page={1}
        pageSize={100}
        onPageChange={() => undefined}
        onPageSizeChange={() => undefined}
        getRowId={(r) => r.stockItemId}
        rowClassName={(r) => (r.available < 0 ? 'bg-tone-danger-soft/30' : undefined)}
        emptyTitle={t('empty.low')}
      />
      {write && <StockActions dialog={dialog} setDialog={setDialog} />}
    </>
  )
}
