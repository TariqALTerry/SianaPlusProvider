import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type VisibilityState,
} from '@tanstack/react-table'
import type { UseQueryResult } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Columns3, Rows3 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { EmptyState, ErrorState } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { useIsDesktopTable } from '@/hooks/useMediaQuery'
import { PAGE_SIZES } from '@/hooks/useUrlState'
import { useLang } from '@/hooks/useLang'
import { canPrefetch } from '@/api/netStatus'
import type { PaginatedResponse } from '@/api/types'
import { formatNumber } from '@/lib/format'
import { readItem, writeItem } from '@/lib/storage'
import { cn } from '@/lib/utils'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Money/number columns: `end` (right in LTR, left in RTL). */
    align?: 'start' | 'end' | 'center'
    className?: string
    headerClassName?: string
    /** Cannot be hidden from the column menu (e.g. the number column). */
    alwaysVisible?: boolean
    /** Hidden by default until the user enables it. */
    defaultHidden?: boolean
    /** Phone cards (< 768 px): this cell is the card's title row. */
    cardTitle?: boolean
    /** Phone cards: leave this cell out (actions menus, redundant columns). */
    cardHidden?: boolean
  }
}

type Density = 'comfortable' | 'compact'

interface TablePrefs {
  visibility?: VisibilityState
  density?: Density
}

export interface DataTableProps<T> {
  /** Stable id: column visibility and density persist per list under it. */
  id: string
  columns: ColumnDef<T, unknown>[]
  query: Pick<UseQueryResult<PaginatedResponse<T>>, 'data' | 'isPending' | 'isError' | 'error' | 'refetch' | 'isFetching' | 'isPlaceholderData'>
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  getRowId?: (row: T) => string
  /** Row click navigates here; Ctrl/⌘/middle-click opens it in a new tab. */
  rowHref?: (row: T) => string
  /** Alternative to rowHref, e.g. opening a drawer. */
  onRowClick?: (row: T) => void
  /** Hover prefetch (150 ms delay, only under the request budget). */
  onRowHover?: (row: T) => void
  /** Prefetch the next page when the user reaches the last rows. */
  onPrefetchNext?: () => void
  rowClassName?: (row: T) => string | undefined
  /** True when filters are active — the empty state then offers to clear them. */
  filtered?: boolean
  onClearFilters?: () => void
  emptyTitle?: ReactNode
  toolbar?: ReactNode
  className?: string
}

const SKELETON_ROWS = 8

export function DataTable<T>({
  id,
  columns,
  query,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  getRowId,
  rowHref,
  onRowClick,
  onRowHover,
  onPrefetchNext,
  rowClassName,
  filtered,
  onClearFilters,
  emptyTitle,
  toolbar,
  className,
}: DataTableProps<T>) {
  const { t } = useTranslation()
  const { lang, isRtl } = useLang()
  const navigate = useNavigate()
  const desktop = useIsDesktopTable()

  const prefsKey = `table.${id}`
  const [prefs, setPrefs] = useState<TablePrefs>(() => readItem<TablePrefs>(prefsKey, {}))
  useEffect(() => writeItem(prefsKey, prefs), [prefsKey, prefs])

  const defaultVisibility = useMemo(() => {
    const v: VisibilityState = {}
    for (const c of columns) {
      const key = (c.id ?? (c as { accessorKey?: string }).accessorKey) as string | undefined
      if (key && c.meta?.defaultHidden) v[key] = false
    }
    return v
  }, [columns])

  const rows = query.data?.items ?? []
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    manualPagination: true,
    state: { columnVisibility: { ...defaultVisibility, ...prefs.visibility } },
    onColumnVisibilityChange: (updater) =>
      setPrefs((p) => {
        const current = { ...defaultVisibility, ...p.visibility }
        return { ...p, visibility: typeof updater === 'function' ? updater(current) : updater }
      }),
  })

  const density = prefs.density ?? 'comfortable'
  const cellPad = density === 'compact' ? 'py-1.5' : 'py-2.5'

  // Hover prefetch with a delay so sweeping the mouse over a table fires nothing.
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>()
  const hover = (row: T) => {
    if (!onRowHover) return
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => canPrefetch() && onRowHover(row), 150)
  }
  const unhover = () => clearTimeout(hoverTimer.current)
  useEffect(() => () => clearTimeout(hoverTimer.current), [])

  // Next-page prefetch when the last rows scroll into view.
  const sentinelRef = useRef<HTMLElement | null>(null)
  const setSentinel = (el: HTMLElement | null) => {
    sentinelRef.current = el
  }
  const hasNext = query.data?.hasNextPage ?? false
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !onPrefetchNext || !hasNext) return
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && canPrefetch()) onPrefetchNext()
    })
    io.observe(el)
    return () => io.disconnect()
  }, [onPrefetchNext, hasNext, rows.length, desktop])

  const clickable = Boolean(rowHref || onRowClick)
  const activate = (row: T, e: MouseEvent) => {
    // React bubbles events out of portals (row menus, dialogs): only clicks physically inside the row count.
    if (!(e.currentTarget as HTMLElement).contains(e.target as Node)) return
    // Let real links, buttons and inputs inside the row do their own thing.
    if ((e.target as HTMLElement).closest('a,button,input,label,[role="checkbox"],[role="menuitem"],[data-no-row-click]')) return
    if (rowHref) {
      const href = rowHref(row)
      if (e.ctrlKey || e.metaKey || e.button === 1) window.open(href, '_blank', 'noopener')
      else navigate(href)
    } else onRowClick?.(row)
  }

  const visibleColumns = table.getVisibleLeafColumns()
  const total = query.data?.totalCount ?? 0
  const totalPages = Math.max(1, query.data?.totalPages ?? 1)
  const Prev = isRtl ? ChevronRight : ChevronLeft
  const Next = isRtl ? ChevronLeft : ChevronRight

  const alignClass = (a?: 'start' | 'end' | 'center') => (a === 'end' ? 'text-end' : a === 'center' ? 'text-center' : 'text-start')

  const emptyState = (
    <EmptyState
      title={emptyTitle ?? (filtered ? t('table.emptyFiltered') : t('table.empty'))}
      action={
        filtered && onClearFilters ? (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            {t('actions.clearFilters')}
          </Button>
        ) : undefined
      }
    />
  )

  // Phones: one card per row — the title cell on top, then "header: value" pairs.
  const cards = (
    <ul className={cn('divide-y', query.isPlaceholderData && 'opacity-60 transition-opacity')}>
      {query.isPending ? (
        Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="space-y-2 p-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-2/3" />
          </li>
        ))
      ) : query.isError ? (
        <li>
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </li>
      ) : rows.length === 0 ? (
        <li>{emptyState}</li>
      ) : (
        table.getRowModel().rows.map((row, index) => {
          const cells = row.getVisibleCells().filter((c) => !c.column.columnDef.meta?.cardHidden)
          const title = cells.find((c) => c.column.columnDef.meta?.cardTitle) ?? cells[0]
          return (
            <li
              key={row.id}
              ref={index === Math.max(0, rows.length - 3) ? setSentinel : undefined}
              onClick={clickable ? (e) => activate(row.original, e) : undefined}
              className={cn('space-y-1.5 p-3', clickable && 'cursor-pointer active:bg-muted/60', rowClassName?.(row.original))}
            >
              {title && <div className="font-medium">{flexRender(title.column.columnDef.cell, title.getContext())}</div>}
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[0.8125rem]">
                {cells
                  .filter((c) => c !== title)
                  .map((c) => (
                    <div key={c.id} className="contents">
                      <dt className="text-muted-foreground">{typeof c.column.columnDef.header === 'string' ? c.column.columnDef.header : ''}</dt>
                      <dd className="min-w-0 text-end">{flexRender(c.column.columnDef.cell, c.getContext())}</dd>
                    </div>
                  ))}
              </dl>
            </li>
          )
        })
      )}
    </ul>
  )

  return (
    <div className={cn('flex flex-col overflow-hidden rounded-lg border bg-surface shadow-sm', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{toolbar}</div>
        <div className="flex items-center gap-1">
          {query.isFetching && !query.isPending && <span className="me-2 size-2 animate-pulse rounded-full bg-primary" aria-label={t('table.loading')} />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t('table.columns')} title={t('table.columns')}>
                <Columns3 />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-80 overflow-y-auto">
              <DropdownMenuLabel>{t('table.columns')}</DropdownMenuLabel>
              {table
                .getAllLeafColumns()
                .filter((c) => !c.columnDef.meta?.alwaysVisible && typeof c.columnDef.header === 'string')
                .map((c) => (
                  <DropdownMenuCheckboxItem key={c.id} checked={c.getIsVisible()} onCheckedChange={(v) => c.toggleVisibility(v === true)} onSelect={(e) => e.preventDefault()}>
                    {c.columnDef.header as string}
                  </DropdownMenuCheckboxItem>
                ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t('table.density')}</DropdownMenuLabel>
              {(['comfortable', 'compact'] as const).map((d) => (
                <DropdownMenuCheckboxItem key={d} checked={density === d} onCheckedChange={() => setPrefs((p) => ({ ...p, density: d }))}>
                  <Rows3 className="size-3.5" /> {t(`table.${d}`)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {desktop ? (
      <div className="relative overflow-x-auto">
        <Table className={cn(query.isPlaceholderData && 'opacity-60 transition-opacity')}>
          <THead>
            {table.getHeaderGroups().map((hg) => (
              <Tr key={hg.id} className="border-b">
                {hg.headers.map((h) => (
                  <Th key={h.id} className={cn(alignClass(h.column.columnDef.meta?.align), h.column.columnDef.meta?.headerClassName)} style={{ width: h.column.columnDef.size !== 150 ? h.column.columnDef.size : undefined }}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </Th>
                ))}
              </Tr>
            ))}
          </THead>
          <TBody>
            {query.isPending ? (
              Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <Tr key={i}>
                  {visibleColumns.map((c) => (
                    <Td key={c.id} className={cellPad}>
                      <Skeleton className="h-4 w-full max-w-[10rem]" />
                    </Td>
                  ))}
                </Tr>
              ))
            ) : query.isError ? (
              <Tr>
                <Td colSpan={visibleColumns.length}>
                  <ErrorState error={query.error} onRetry={() => void query.refetch()} />
                </Td>
              </Tr>
            ) : rows.length === 0 ? (
              <Tr>
                <Td colSpan={visibleColumns.length}>{emptyState}</Td>
              </Tr>
            ) : (
              table.getRowModel().rows.map((row, index) => (
                <Tr
                  key={row.id}
                  ref={index === Math.max(0, rows.length - 3) ? setSentinel : undefined}
                  onClick={clickable ? (e) => activate(row.original, e) : undefined}
                  onAuxClick={rowHref ? (e) => e.button === 1 && activate(row.original, e) : undefined}
                  onMouseEnter={onRowHover ? () => hover(row.original) : undefined}
                  onMouseLeave={onRowHover ? unhover : undefined}
                  className={cn(clickable && 'cursor-pointer hover:bg-muted/50', rowClassName?.(row.original))}
                >
                  {row.getVisibleCells().map((cell) => (
                    <Td key={cell.id} className={cn(cellPad, alignClass(cell.column.columnDef.meta?.align), cell.column.columnDef.meta?.className)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Td>
                  ))}
                </Tr>
              ))
            )}
          </TBody>
        </Table>
      </div>
      ) : (
        cards
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
        <span className="tabular">{query.data ? t('table.total', { count: total, formattedCount: formatNumber(total, lang) }) : ' '}</span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5">
            {t('table.rowsPerPage')}
            <Select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} className="h-7 w-[4.5rem] py-0 text-xs">
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </label>
          <span className="tabular">{t('table.pageOf', { page, pages: totalPages })}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1 || query.isPending} aria-label={t('actions.previous')}>
              <Prev />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => onPageChange(page + 1)} disabled={!hasNext || query.isPending} aria-label={t('actions.next')}>
              <Next />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
