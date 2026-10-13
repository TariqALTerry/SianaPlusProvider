import { useVirtualizer } from '@tanstack/react-virtual'
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/menu'
import { cn } from '@/lib/utils'

export interface ComboOption {
  value: string
  label: string
  description?: ReactNode
  disabled?: boolean
}

interface ComboboxProps {
  value: string | null
  /** Label for the selected value when it's not in the current option list. */
  selectedLabel?: string | null
  onChange: (value: string | null, option: ComboOption | null) => void
  options: ComboOption[]
  loading?: boolean
  placeholder: string
  /** Server-side search: called with the (debounced) query. Omit to filter client-side. */
  onSearch?: (query: string) => void
  clearable?: boolean
  className?: string
  disabled?: boolean
  size?: 'sm' | 'default'
  id?: string
}

const ROW_HEIGHT = 40

/**
 * Searchable single-select. Virtualized, so it stays fast over hundreds of rows (§14.8).
 */
export function Combobox({
  value,
  selectedLabel,
  onChange,
  options,
  loading,
  placeholder,
  onSearch,
  clearable = true,
  className,
  disabled,
  size = 'default',
  id,
}: ComboboxProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (onSearch || !query.trim()) return options
    const q = query.trim().toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase() === q)
  }, [options, query, onSearch])

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  })

  const current = options.find((o) => o.value === value)
  const label = current?.label ?? selectedLabel ?? null

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) {
          setQuery('')
          onSearch?.('')
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-md border border-input bg-surface px-3 text-start text-sm shadow-sm disabled:opacity-50',
            size === 'sm' ? 'h-8 text-xs' : 'h-9',
            className,
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={cn('truncate', !label && 'text-muted-foreground')}>{label ?? placeholder}</span>
          <span className="flex shrink-0 items-center gap-1">
            {clearable && value && (
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(null, null)
                }}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                aria-label={t('actions.clearFilters')}
              >
                <X className="size-3.5" />
              </span>
            )}
            <ChevronsUpDown className="size-3.5 text-muted-foreground" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[16rem] p-0">
        <div className="border-b p-2">
          <Input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              onSearch?.(e.target.value)
            }}
            placeholder={t('actions.search')}
            className="h-8"
          />
        </div>
        <div ref={listRef} className="max-h-72 overflow-y-auto p-1" role="listbox">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {t('common.loading')}
            </div>
          )}
          {!loading && filtered.length === 0 && <div className="py-6 text-center text-xs text-muted-foreground">{t('table.empty')}</div>}
          {!loading && filtered.length > 0 && (
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map((vi) => {
                const o = filtered[vi.index]!
                const selected = o.value === value
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={o.disabled}
                    onClick={() => {
                      onChange(o.value, o)
                      setOpen(false)
                    }}
                    className="absolute inset-x-0 flex items-center gap-2 rounded-sm px-2 text-start text-sm hover:bg-muted disabled:opacity-50"
                    style={{ top: vi.start, height: ROW_HEIGHT }}
                  >
                    <Check className={cn('size-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{o.label}</span>
                      {o.description && <span className="block truncate text-xs text-muted-foreground">{o.description}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
