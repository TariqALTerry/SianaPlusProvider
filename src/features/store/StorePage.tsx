import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { PenLine, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { DataTable } from '@/components/DataTable'
import { FilterChips, QuickTabs, SearchInput, type FilterChip } from '@/components/Filters'
import { Money, Num } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listQueryOptions } from '@/api/queryClient'
import type { ActiveFilter, StoreProductResponse } from '@/api/types'
import { useProvider } from '@/app/provider'
import { useLang } from '@/hooks/useLang'
import { paginationDefaults, useUrlState } from '@/hooks/useUrlState'
import { cn } from '@/lib/utils'
import './i18n'
import { isStoreGateError, LOW_STOCK_THRESHOLD, prefetchStoreProduct, storeProductKeys, storeProductsApi, type StoreProductListParams } from './api'
import { CategoryPicker } from './components/CategoryPicker'
import { AiBadge, DraftBadge, NotOperationalNote, ProductThumb, StoreUnavailable } from './components/StoreBits'
import { useCategoryIndex, useCategoryTree } from './hooks'

/** §3.1 tabs → `status`: the server lists on-sale products only when it is omitted. */
const TABS: Record<string, ActiveFilter | undefined> = { live: undefined, drafts: 'Inactive', all: 'All' }

const schema = { ...paginationDefaults, tab: 'live', search: '', categoryId: '' }

/** `/store` (SMART-STORE-PROVIDER-PLATFORM-PROMPT §3.1): the organization's own products. */
export function StorePage() {
  const { t } = useTranslation('store')
  const { pick } = useLang()
  const { operational } = useProvider()
  const queryClient = useQueryClient()
  const { state, set, reset, active } = useUrlState(schema)
  const categories = useCategoryIndex(useCategoryTree().data)

  const params: StoreProductListParams = {
    status: TABS[state.tab],
    search: state.search || undefined,
    categoryId: state.categoryId || undefined,
    page: state.page,
    pageSize: state.pageSize,
  }

  const query = useQuery({
    queryKey: storeProductKeys.list(params),
    queryFn: ({ signal }) => storeProductsApi.list(params, signal),
    ...listQueryOptions,
  })

  const prefetchNext = () => {
    const next = { ...params, page: state.page + 1 }
    void queryClient.prefetchQuery({ queryKey: storeProductKeys.list(next), queryFn: ({ signal }) => storeProductsApi.list(next, signal) })
  }

  const missingLabel = (items: string[]) => items.map((m) => t(`readiness.short.${m}`, { defaultValue: m })).join('، ')

  const columns = useMemo<ColumnDef<StoreProductResponse, unknown>[]>(
    () => [
      {
        id: 'product',
        header: t('products.columns.product'),
        meta: { alwaysVisible: true, cardTitle: true },
        cell: ({ row: { original: p } }) => (
          <div className="flex items-center gap-3">
            <ProductThumb url={p.imageUrl} />
            <div className="min-w-0 max-w-[20rem]">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-medium">{pick(p.nameAr, p.nameEn)}</span>
                {p.isAiGenerated && <AiBadge className="shrink-0" />}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {p.categoryId ? `${pick(p.sectionNameAr, p.sectionNameEn)} › ${pick(p.categoryNameAr, p.categoryNameEn)}` : t('products.noCategory')}
              </div>
              {p.missingForSale.length > 0 && (
                <div className="mt-0.5 text-[11px] font-medium text-tone-attention">
                  {t('products.missing')}: {missingLabel(p.missingForSale)}
                </div>
              )}
            </div>
          </div>
        ),
      },
      {
        id: 'sku',
        header: t('products.columns.sku'),
        meta: { cardHidden: true },
        cell: ({ row: { original: p } }) => <span className="ltr-nums font-latin text-xs text-muted-foreground">{p.sku}</span>,
      },
      {
        id: 'price',
        header: t('products.columns.price'),
        meta: { align: 'end' },
        cell: ({ row: { original: p } }) => (
          <span className="inline-flex flex-col items-end">
            <span>
              {p.hasVariants && <span className="text-xs text-muted-foreground">{t('products.from')} </span>}
              <Money value={p.price} />
            </span>
            {p.compareAtPrice && p.compareAtPrice > p.price ? <Money value={p.compareAtPrice} className="text-xs text-muted-foreground line-through" /> : null}
          </span>
        ),
      },
      {
        id: 'stock',
        header: t('products.columns.stock'),
        meta: { align: 'end' },
        cell: ({ row: { original: p } }) => (
          <span className="inline-flex items-center gap-2">
            {p.stockQuantity <= 0 ? (
              <Badge tone="danger">{t('products.outOfStock')}</Badge>
            ) : p.stockQuantity <= LOW_STOCK_THRESHOLD ? (
              <Badge tone="attention">{t('products.lowStock')}</Badge>
            ) : null}
            <Num value={p.stockQuantity} className={cn('font-medium', p.stockQuantity <= LOW_STOCK_THRESHOLD && 'text-tone-danger')} />
          </span>
        ),
      },
      {
        id: 'sold',
        header: t('products.columns.sold'),
        meta: { align: 'end' },
        cell: ({ row: { original: p } }) => <Num value={p.soldCount} />,
      },
      {
        id: 'status',
        header: t('products.columns.status'),
        cell: ({ row: { original: p } }) => (p.isActive ? <StatusBadge enum="ActiveFilter" value="Active" /> : <DraftBadge />),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, pick],
  )

  if (isStoreGateError(query.error)) return <StoreUnavailable error={query.error} />

  const category = state.categoryId ? categories.get(state.categoryId) : undefined
  const chips: FilterChip[] = [
    ...(state.search ? [{ key: 'search', label: `“${state.search}”`, onRemove: () => set({ search: '' }) }] : []),
    ...(state.categoryId
      ? [
          {
            key: 'category',
            label: `${t('products.filters.category')}: ${category ? pick(category.category.nameAr, category.category.nameEn) : '…'}`,
            onRemove: () => set({ categoryId: '' }),
          },
        ]
      : []),
  ]
  const filterKeys = active.filter((k) => k !== 'tab')
  const disabledTitle = operational ? undefined : t('notOperational')

  return (
    <>
      <PageHeader
        title={t('products.title')}
        description={t('products.description')}
        actions={
          operational ? (
            <>
              <Button asChild size="sm" variant="outline">
                <Link to="/store/products/new">
                  <PenLine /> {t('products.addManual')}
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/store/products/ai">
                  <Sparkles /> {t('products.addAi')}
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" disabled title={disabledTitle}>
                <PenLine /> {t('products.addManual')}
              </Button>
              <Button size="sm" disabled title={disabledTitle}>
                <Sparkles /> {t('products.addAi')}
              </Button>
            </>
          )
        }
      />
      {!operational && <NotOperationalNote />}

      <QuickTabs className="mb-3" value={state.tab} onChange={(tab) => set({ tab })} tabs={Object.keys(TABS).map((key) => ({ key, label: t(`products.tabs.${key}`) }))} />

      <div className="mb-3">
        <FilterChips chips={chips} onClear={() => reset(['tab'])} />
      </div>

      <DataTable
        id="store-products"
        columns={columns}
        query={query}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={(page) => set({ page })}
        onPageSizeChange={(pageSize) => set({ pageSize })}
        getRowId={(p) => p.id}
        rowHref={(p) => `/store/products/${p.id}`}
        onRowHover={(p) => void prefetchStoreProduct(queryClient, p.id)}
        onPrefetchNext={prefetchNext}
        rowClassName={(p) => cn(!p.isActive && 'bg-brand-yellow/5')}
        filtered={filterKeys.length > 0}
        onClearFilters={() => reset(['tab'])}
        emptyTitle={filterKeys.length > 0 ? undefined : state.tab === 'live' ? t('products.emptyLive') : t('products.empty')}
        toolbar={
          <>
            <SearchInput value={state.search} onChange={(search) => set({ search })} placeholder={t('products.filters.search')} />
            <CategoryPicker
              mode="any"
              size="sm"
              className="w-56"
              clearable
              value={state.categoryId || null}
              onChange={(id) => set({ categoryId: id ?? '' })}
              placeholder={t('products.filters.category')}
            />
          </>
        }
      />
    </>
  )
}
