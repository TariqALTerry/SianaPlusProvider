import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { listQueryOptions } from '@/api/queryClient'
import type { SupplierReturnResponse, SupplierReturnStatus } from '@/api/types'
import { DataTable } from '@/components/DataTable'
import { EnumFilter } from '@/components/Filters'
import { DateTime, Money } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/menu'
import { useRoleKind } from '@/features/auth/authStore'
import { useBranchScope } from '@/features/branches/scope'
import { useLang } from '@/hooks/useLang'
import { useUrlState } from '@/hooks/useUrlState'
import { inventoryApi, inventoryKeys, type ReturnListParams } from './api'
import { ReturnFormDialog, ReturnStatusDialog } from './components/ReturnDialogs'
import { InventoryTabs, Qty, SupplierSelect } from './components/Shared'
import { canSeeCosts, canWriteInventory, nextReturnStatuses, returnStatusBlocked } from './logic'
import './i18n'

const schema = { status: '', supplierId: '', page: 1, pageSize: 25 }

/**
 * `/inventory/supplier-returns` (phase 6 §8): defective parts going back to their supplier. Drafts open automatically
 * when a counter rework ends with the root cause "قطعة معيبة", or by hand. Only the allowed next statuses are offered.
 */
export function SupplierReturnsPage() {
  const { t } = useTranslation('inventory')
  const { pick } = useLang()
  const role = useRoleKind()
  const write = canWriteInventory(role)
  const costs = canSeeCosts(role)
  const frontDesk = role === 'frontDesk'
  const scope = useBranchScope()
  const { state, set, active, reset } = useUrlState(schema)
  const [form, setForm] = useState<{ existing: SupplierReturnResponse | null } | null>(null)
  const [move, setMove] = useState<{ item: SupplierReturnResponse; to: SupplierReturnStatus } | null>(null)

  const params: ReturnListParams = {
    branchId: scope.branchId,
    supplierId: state.supplierId || undefined,
    status: (state.status || undefined) as SupplierReturnStatus | undefined,
    page: state.page,
    pageSize: state.pageSize,
  }
  const list = useQuery({
    queryKey: inventoryKeys.returns(params),
    queryFn: ({ signal }) => inventoryApi.supplierReturns(params, signal),
    ...listQueryOptions,
    enabled: scope.mode !== 'loading',
  })

  const columns = useMemo<ColumnDef<SupplierReturnResponse, unknown>[]>(() => {
    const cols: ColumnDef<SupplierReturnResponse, unknown>[] = [
      {
        id: 'part',
        header: t('col.part'),
        meta: { alwaysVisible: true, cardTitle: true },
        cell: ({ row: { original: r } }) => (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate font-medium">{pick(r.partNameAr, r.partNameEn)}</span>
              <Badge tone="neutral">{r.fromStock ? t('fromStockBadge') : t('fromDevice')}</Badge>
              {r.warrantyLineId && <Badge tone="info">{t('returns.auto')}</Badge>}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              <bdi className="ltr-nums font-mono">{r.sku}</bdi>
              {!scope.selected && <> · {r.branchName}</>}
              {r.batchRef && (
                <>
                  {' · '}
                  <bdi className="ltr-nums font-mono">{r.batchRef}</bdi>
                </>
              )}
            </div>
          </div>
        ),
      },
      { id: 'status', header: t('col.status'), cell: ({ row: { original: r } }) => <StatusBadge enum="SupplierReturnStatus" value={r.status} /> },
      { id: 'supplier', header: t('col.supplier'), cell: ({ row: { original: r } }) => <span className="text-sm">{r.supplierName ?? <span className="text-muted-foreground">—</span>}</span> },
      { id: 'quantity', header: t('col.quantity'), meta: { align: 'end' }, cell: ({ row: { original: r } }) => <Qty value={r.quantity} className="font-semibold" /> },
    ]
    if (costs) {
      cols.push(
        { id: 'unitCost', header: t('col.unitCost'), meta: { align: 'end', cardHidden: true }, cell: ({ row: { original: r } }) => <Money value={r.unitCost} /> },
        { id: 'credit', header: t('col.credit'), meta: { align: 'end' }, cell: ({ row: { original: r } }) => (r.creditAmount === null ? <span className="text-muted-foreground">—</span> : <Money value={r.creditAmount} className="text-tone-success" />) },
      )
    }
    cols.push(
      { id: 'reason', header: t('col.reason'), meta: { cardHidden: true }, cell: ({ row: { original: r } }) => <span className="line-clamp-2 text-sm">{r.reason}</span> },
      {
        id: 'service',
        header: t('col.service'),
        meta: { cardHidden: true },
        cell: ({ row: { original: r } }) =>
          r.serviceItemId && r.itemNumber ? (
            frontDesk ? (
              <bdi className="ltr-nums font-mono text-xs">{r.itemNumber}</bdi>
            ) : (
              <Link to={`/work/${r.serviceItemId}`} className="font-mono text-xs text-primary hover:underline">
                <bdi className="ltr-nums">{r.itemNumber}</bdi>
              </Link>
            )
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      { id: 'created', header: t('col.createdAt'), cell: ({ row: { original: r } }) => <DateTime value={r.resolvedAt ?? r.sentAt ?? r.createdAt} className="text-xs text-muted-foreground" /> },
    )
    if (write) {
      cols.push({
        id: 'actions',
        header: t('common:common.actions'),
        meta: { alwaysVisible: true, align: 'end' },
        cell: ({ row: { original: r } }) => {
          const next = nextReturnStatuses(r.status)
          if (!next.length) return null
          return (
            <div className="flex flex-wrap justify-end gap-1">
              {r.status === 'Draft' && (
                <Tooltip content={t('actions.editReturn')}>
                  <Button size="icon-sm" variant="ghost" aria-label={t('actions.editReturn')} onClick={() => setForm({ existing: r })}>
                    <Pencil />
                  </Button>
                </Tooltip>
              )}
              {next.map((to) => {
                const blocked = returnStatusBlocked(r, to)
                const label = to === 'Sent' ? t('actions.send') : to === 'Credited' ? t('actions.credit') : r.status === 'Draft' ? t('actions.cancelDraft') : t('actions.reject')
                const button = (
                  <Button key={to} size="sm" variant={to === 'Rejected' ? 'destructive-outline' : to === 'Sent' ? 'default' : 'outline'} disabled={!!blocked} onClick={() => setMove({ item: r, to })}>
                    {label}
                  </Button>
                )
                return blocked ? (
                  <Tooltip key={to} content={t(`errors.${blocked}`)}>
                    <span>{button}</span>
                  </Tooltip>
                ) : (
                  button
                )
              })}
            </div>
          )
        },
      })
    }
    return cols
  }, [t, pick, costs, write, frontDesk, scope.selected])

  return (
    <>
      <PageHeader
        title={t('title')}
        description={scope.selected ? `${scope.selected.name} · ${t('tabs.returns')}` : t('tabs.returns')}
        actions={
          write ? (
            <Button size="lg" onClick={() => setForm({ existing: null })}>
              <Plus /> {t('actions.addReturn')}
            </Button>
          ) : undefined
        }
      />
      <InventoryTabs />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <EnumFilter enumName="SupplierReturnStatus" value={state.status} onChange={(status) => set({ status })} label={t('filter.status')} />
        <SupplierSelect value={state.supplierId || null} onChange={(id) => set({ supplierId: id ?? '' })} emptyLabel={t('filter.anySupplier')} className="h-8 w-auto min-w-[9rem] text-xs" />
      </div>
      <DataTable
        id="inventory-returns"
        columns={columns}
        query={list}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={(page) => set({ page })}
        onPageSizeChange={(pageSize) => set({ pageSize })}
        getRowId={(r) => r.id}
        filtered={active.length > 0}
        onClearFilters={() => reset()}
        emptyTitle={t('empty.returns')}
      />
      {write && (
        <>
          <ReturnFormDialog open={!!form} onOpenChange={(o) => !o && setForm(null)} existing={form?.existing} />
          <ReturnStatusDialog open={!!move} onOpenChange={(o) => !o && setMove(null)} item={move?.item ?? null} to={move?.to ?? null} showCosts={costs} />
        </>
      )}
    </>
  )
}
