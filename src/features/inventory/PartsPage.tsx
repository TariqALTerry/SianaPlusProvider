import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listQueryOptions } from '@/api/queryClient'
import type { PartResponse } from '@/api/types'
import { DataTable } from '@/components/DataTable'
import { QuickTabs, SearchInput } from '@/components/Filters'
import { Money } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRoleKind } from '@/features/auth/authStore'
import { useLang } from '@/hooks/useLang'
import { useUrlState } from '@/hooks/useUrlState'
import { inventoryApi, inventoryKeys, type PartListParams } from './api'
import { PartDialog } from './components/PartDialog'
import { SettingsCard } from './components/SettingsCard'
import { InventoryTabs, Qty } from './components/Shared'
import { canSeeCosts, canWriteInventory } from './logic'
import './i18n'

const schema = { state: 'active', search: '', page: 1, pageSize: 25 }

/**
 * `/inventory/parts` (phase 6 §3): the organization's workshop parts catalogue, with the default labour warranty above
 * it. No delete: a part is stopped with `isActive: false` and then cannot be received or issued.
 */
export function PartsPage() {
  const { t } = useTranslation('inventory')
  const { pick } = useLang()
  const role = useRoleKind()
  const write = canWriteInventory(role)
  const costs = canSeeCosts(role)
  const { state, set } = useUrlState(schema)
  const [editing, setEditing] = useState<PartResponse | null | undefined>(undefined)

  const params: PartListParams = {
    search: state.search || undefined,
    isActive: state.state === 'active' ? true : state.state === 'inactive' ? false : undefined,
    page: state.page,
    pageSize: state.pageSize,
  }
  const list = useQuery({ queryKey: inventoryKeys.parts(params), queryFn: ({ signal }) => inventoryApi.parts(params, signal), ...listQueryOptions })

  const columns = useMemo<ColumnDef<PartResponse, unknown>[]>(() => {
    const cols: ColumnDef<PartResponse, unknown>[] = [
      {
        id: 'part',
        header: t('col.part'),
        meta: { alwaysVisible: true, cardTitle: true },
        cell: ({ row: { original: p } }) => (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate font-medium">{pick(p.nameAr, p.nameEn)}</span>
              {!p.isActive && <Badge tone="muted">{t('inactive')}</Badge>}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              <bdi className="ltr-nums font-mono">{p.sku}</bdi>
              {p.barcode && (
                <>
                  {' · '}
                  <bdi className="ltr-nums font-mono">{p.barcode}</bdi>
                </>
              )}
            </div>
          </div>
        ),
      },
      {
        id: 'category',
        header: t('col.category'),
        meta: { cardHidden: true },
        cell: ({ row: { original: p } }) => <span className="text-sm">{[p.category, p.brand].filter(Boolean).join(' · ') || '—'}</span>,
      },
      { id: 'price', header: t('col.price'), meta: { align: 'end' }, cell: ({ row: { original: p } }) => <Money value={p.defaultPrice} /> },
    ]
    if (costs) cols.push({ id: 'cost', header: t('col.cost'), meta: { align: 'end', cardHidden: true }, cell: ({ row: { original: p } }) => <Money value={p.defaultCost} /> })
    cols.push(
      {
        id: 'warranty',
        header: t('col.warranty'),
        cell: ({ row: { original: p } }) => <span className="text-sm">{p.defaultWarrantyDays ? t('days', { count: p.defaultWarrantyDays }) : <span className="text-muted-foreground">{t('noWarranty')}</span>}</span>,
      },
      { id: 'reorder', header: t('col.reorderLevel'), meta: { align: 'end', cardHidden: true }, cell: ({ row: { original: p } }) => <Qty value={p.reorderLevel} className="text-muted-foreground" /> },
      { id: 'onHand', header: t('col.totalOnHand'), meta: { align: 'end' }, cell: ({ row: { original: p } }) => <Qty value={p.totalOnHand} unit={p.unit} className="font-semibold" /> },
    )
    return cols
  }, [t, pick, costs])

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('tabs.parts')}
        actions={
          write ? (
            <Button size="lg" onClick={() => setEditing(null)}>
              <Plus /> {t('actions.addPart')}
            </Button>
          ) : undefined
        }
      />
      <InventoryTabs />
      <SettingsCard />

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <QuickTabs
          value={state.state}
          onChange={(v) => set({ state: v })}
          tabs={[
            { key: 'active', label: t('filter.active') },
            { key: 'inactive', label: t('filter.inactive') },
            { key: 'all', label: t('filter.allStates') },
          ]}
        />
        <SearchInput value={state.search} onChange={(search) => set({ search })} placeholder={t('search.parts')} />
      </div>

      <DataTable
        id="inventory-parts"
        columns={columns}
        query={list}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={(page) => set({ page })}
        onPageSizeChange={(pageSize) => set({ pageSize })}
        getRowId={(p) => p.id}
        onRowClick={write ? (p) => setEditing(p) : undefined}
        filtered={!!state.search}
        onClearFilters={() => set({ search: '' })}
        emptyTitle={state.search ? t('empty.stockSearch') : t('empty.parts')}
      />

      {write && <PartDialog open={editing !== undefined} onOpenChange={(o) => !o && setEditing(undefined)} part={editing} />}
    </>
  )
}
