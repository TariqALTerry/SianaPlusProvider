import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from '@/components/DataTable'
import { SearchInput } from '@/components/Filters'
import { DateTime, Money, Num } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { listQueryOptions } from '@/api/queryClient'
import type { ActiveFilter, StoreProductResponse } from '@/api/types'
import { useProvider } from '@/app/provider'
import { useLang } from '@/hooks/useLang'
import { paginationDefaults, useUrlState } from '@/hooks/useUrlState'
import { cn } from '@/lib/utils'
import './i18n'
import { prefetchProduct, storeApi, storeKeys, type StoreProductListParams } from './api'
import { FulfilmentBadges, OutOfStockBadge, Thumb, VisibilityBadge } from './components/ProductBits'
import { ProductDrawer } from './components/ProductDrawer'
import { ProductEditorDialog } from './components/ProductEditorDialog'

/** The API lists active products when `status` is omitted; `Active` is that default here. */
const schema = { ...paginationDefaults, status: 'Active', search: '', open: '' }

const STATUS_OPTIONS: Array<{ value: ActiveFilter; key: string }> = [
  { value: 'Active', key: 'filters.active' },
  { value: 'Inactive', key: 'filters.inactive' },
  { value: 'All', key: 'filters.all' },
]

/** `/store` (§8.13): the organization's products; one opens in a drawer at `?open=:id`. */
export function StorePage() {
  const { t } = useTranslation('store')
  const { pick } = useLang()
  const { operational } = useProvider()
  const queryClient = useQueryClient()
  const { state, set, reset, active } = useUrlState(schema)
  const [creating, setCreating] = useState(false)

  const status: ActiveFilter = state.status === 'All' || state.status === 'Inactive' ? state.status : 'Active'
  // Omit = active only (§8.13).
  const params: StoreProductListParams = {
    status: status === 'Active' ? undefined : status,
    search: state.search || undefined,
    page: state.page,
    pageSize: state.pageSize,
  }

  const query = useQuery({
    queryKey: storeKeys.list(params),
    queryFn: ({ signal }) => storeApi.list(params, signal),
    ...listQueryOptions,
  })

  const prefetchNext = () => {
    const next = { ...params, page: state.page + 1 }
    void queryClient.prefetchQuery({ queryKey: storeKeys.list(next), queryFn: ({ signal }) => storeApi.list(next, signal) })
  }

  // `open` is not a filter: opening/closing the drawer keeps the page.
  const openProduct = (id: string) => set({ open: id, page: state.page })
  const closeProduct = () => set({ open: '', page: state.page }, { replace: true })

  const columns = useMemo<ColumnDef<StoreProductResponse, unknown>[]>(
    () => [
      {
        id: 'product',
        header: t('columns.product'),
        meta: { alwaysVisible: true, cardTitle: true },
        cell: ({ row: { original: p } }) => (
          <div className="flex items-center gap-3">
            <Thumb url={p.imageUrl} />
            <div className="min-w-0 max-w-[18rem]">
              <div className="truncate font-medium">{pick(p.nameAr, p.nameEn)}</div>
              <div className="ltr-nums truncate font-mono text-xs text-muted-foreground">{p.sku}</div>
            </div>
          </div>
        ),
      },
      { id: 'price', header: t('columns.price'), meta: { align: 'end' }, cell: ({ row: { original: p } }) => <Money value={p.price} /> },
      {
        id: 'stock',
        header: t('columns.stock'),
        meta: { align: 'end' },
        cell: ({ row: { original: p } }) => (
          <span className="inline-flex items-center gap-2">
            <OutOfStockBadge quantity={p.stockQuantity} />
            <Num value={p.stockQuantity} className={cn('font-medium', p.stockQuantity <= 0 && 'text-tone-danger')} />
          </span>
        ),
      },
      { id: 'fulfilment', header: t('columns.fulfilment'), cell: ({ row: { original: p } }) => <FulfilmentBadges product={p} /> },
      { id: 'status', header: t('columns.status'), cell: ({ row: { original: p } }) => <VisibilityBadge active={p.isActive} /> },
      {
        id: 'createdAt',
        header: t('columns.createdAt'),
        meta: { defaultHidden: true, cardHidden: true },
        cell: ({ row: { original: p } }) => <DateTime value={p.createdAt} className="text-xs text-muted-foreground" />,
      },
    ],
    [t, pick],
  )

  const filterKeys = active.filter((k) => k !== 'open')
  const placeholder = state.open ? query.data?.items.find((p) => p.id === state.open) : undefined

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button size="sm" onClick={() => setCreating(true)} disabled={!operational} title={operational ? undefined : t('notOperational')}>
            <Plus /> {t('add')}
          </Button>
        }
      />
      {!operational && <p className="mb-3 rounded-md bg-tone-attention-soft px-3 py-2 text-sm text-tone-attention">{t('notOperational')}</p>}

      <DataTable
        id="store-products"
        columns={columns}
        query={query}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={(page) => set({ page })}
        onPageSizeChange={(pageSize) => set({ pageSize })}
        getRowId={(p) => p.id}
        onRowClick={(p) => openProduct(p.id)}
        onRowHover={(p) => void prefetchProduct(queryClient, p.id)}
        onPrefetchNext={prefetchNext}
        rowClassName={(p) => cn(!p.isActive && 'opacity-70', p.id === state.open && 'bg-primary-soft/40')}
        filtered={filterKeys.length > 0}
        onClearFilters={() => reset()}
        emptyTitle={filterKeys.length > 0 ? undefined : t('empty')}
        toolbar={
          <>
            <SearchInput value={state.search} onChange={(search) => set({ search })} placeholder={t('filters.search')} />
            <Select value={status} onChange={(e) => set({ status: e.target.value })} className="h-8 w-auto min-w-[9rem] text-xs" aria-label={t('filters.status')}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {t('filters.status')}: {t(o.key)}
                </option>
              ))}
            </Select>
          </>
        }
      />

      <ProductDrawer productId={state.open || null} placeholder={placeholder} onClose={closeProduct} />
      <ProductEditorDialog open={creating} onClose={() => setCreating(false)} product={null} onCreated={(p) => openProduct(p.id)} />
    </>
  )
}
