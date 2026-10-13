import { ChevronDown, Search, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input, Select } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/menu'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useLang } from '@/hooks/useLang'
import { enumLabel, enumOptions, type EnumName } from '@/i18n/enums'
import { cn } from '@/lib/utils'

/** Debounced (300 ms) search box bound to a URL param. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(value)
  const debounced = useDebouncedValue(draft, 300)

  // External changes (Back button, clear filters) win over the draft.
  useEffect(() => setDraft(value), [value])
  useEffect(() => {
    if (debounced !== value) onChange(debounced.trim())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <div className={cn('relative w-full sm:w-64', className)}>
      <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder ?? t('actions.search')}
        className="h-8 ps-8"
        aria-label={placeholder ?? t('actions.search')}
      />
    </div>
  )
}

/** Single-value enum filter (empty = all). */
export function EnumFilter<N extends EnumName>({
  enumName,
  value,
  onChange,
  label,
  exclude,
  className,
}: {
  enumName: N
  value: string
  onChange: (value: string) => void
  label: string
  exclude?: readonly string[]
  className?: string
}) {
  const { t } = useTranslation()
  const { lang } = useLang()
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className={cn('h-8 w-auto min-w-[9rem] text-xs', className)} aria-label={label}>
      <option value="">
        {label}: {t('filters.all')}
      </option>
      {enumOptions(enumName)
        .filter((v) => !exclude?.includes(v))
        .map((v) => (
          <option key={v} value={v}>
            {enumLabel(enumName, v, lang)}
          </option>
        ))}
    </Select>
  )
}

/** Multi-value enum filter (checkbox list in a popover); empty = all. */
export function MultiEnumFilter<N extends EnumName>({
  enumName,
  value,
  onChange,
  label,
  order,
}: {
  enumName: N
  value: string[]
  onChange: (value: string[]) => void
  label: string
  /** Display order (e.g. the service-item lifecycle); defaults to declaration order. */
  order?: readonly string[]
}) {
  const { t } = useTranslation()
  const { lang } = useLang()
  const options = order ?? enumOptions(enumName)
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs font-normal">
          {label}: {value.length === 0 ? t('filters.all') : value.length === 1 ? enumLabel(enumName, value[0], lang) : `${value.length}`}
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1">
        <div className="max-h-72 overflow-y-auto">
          {options.map((v) => (
            <label key={v} className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted">
              <Checkbox checked={value.includes(v)} onCheckedChange={() => toggle(v)} />
              {enumLabel(enumName, v, lang)}
            </label>
          ))}
        </div>
        {value.length > 0 && (
          <div className="border-t p-1">
            <Button variant="ghost" size="xs" className="w-full" onClick={() => onChange([])}>
              {t('actions.clearFilters')}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

/** Date range as two Riyadh-day inputs (YYYY-MM-DD); callers convert to UTC for the API. */
export function DateRangeFilter({
  from,
  to,
  onChange,
  label,
}: {
  from: string
  to: string
  onChange: (range: { from: string; to: string }) => void
  label?: string
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground" role="group" aria-label={label}>
      {label && <span>{label}</span>}
      <Input type="date" value={from} max={to || undefined} onChange={(e) => onChange({ from: e.target.value, to })} className="h-8 w-[8.5rem] text-xs" aria-label={t('filters.from')} />
      <span>–</span>
      <Input type="date" value={to} min={from || undefined} onChange={(e) => onChange({ from, to: e.target.value })} className="h-8 w-[8.5rem] text-xs" aria-label={t('filters.to')} />
    </div>
  )
}

export interface FilterChip {
  key: string
  label: ReactNode
  onRemove: () => void
}

/** "Active filters" row with per-chip remove and a clear-all button (§4.3). */
export function FilterChips({ chips, onClear }: { chips: FilterChip[]; onClear: () => void }) {
  const { t } = useTranslation()
  if (!chips.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">{t('table.activeFilters')}</span>
      {chips.map((c) => (
        <span key={c.key} className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-foreground">
          {c.label}
          <button type="button" onClick={c.onRemove} className="rounded-full p-0.5 hover:bg-primary/15" aria-label={`${t('actions.clearFilters')}: ${String(c.key)}`}>
            <X className="size-3" />
          </button>
        </span>
      ))}
      <Button variant="link" size="xs" onClick={onClear} className="text-xs">
        {t('actions.clearFilters')}
      </Button>
    </div>
  )
}

export interface QuickTab {
  key: string
  label: ReactNode
  count?: number | null
}

/** Saved quick views above a table, bound to a URL param. */
export function QuickTabs({ tabs, value, onChange, className }: { tabs: QuickTab[]; value: string; onChange: (key: string) => void; className?: string }) {
  return (
    <div role="tablist" className={cn('flex items-center gap-1 overflow-x-auto border-b [scrollbar-width:none]', className)}>
      {tabs.map((tab) => {
        const active = tab.key === value
        return (
          <button
            key={tab.key}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className={cn(
              '-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count !== null && (
              <span className={cn('tabular rounded-full px-1.5 text-xs', active ? 'bg-primary text-primary-foreground' : 'bg-muted')}>{tab.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
