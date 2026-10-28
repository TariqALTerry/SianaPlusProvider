import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/menu'
import type { StoreCategoryResponse } from '@/api/types'
import { useLang } from '@/hooks/useLang'
import { cn } from '@/lib/utils'
import { useCategoryIndex, useCategoryTree } from '../hooks'
import '../i18n'

interface CategoryPickerProps {
  value: string | null
  onChange: (id: string | null, category: StoreCategoryResponse | null) => void
  /**
   * `leaf`: only a category can be picked, sections are headings (a product's category, §3.3).
   * `any`: a section (= all its categories) or a category (the list filter, §3.1).
   */
  mode: 'leaf' | 'any'
  clearable?: boolean
  placeholder?: string
  size?: 'sm' | 'default'
  id?: string
  disabled?: boolean
  invalid?: boolean
  className?: string
}

/** Two-level picker over the store's active sections and categories (`productsCount` is never shown: §4.1). */
export function CategoryPicker({ value, onChange, mode, clearable, placeholder, size = 'default', id, disabled, invalid, className }: CategoryPickerProps) {
  const { t } = useTranslation('store')
  const { pick } = useLang()
  const tree = useCategoryTree()
  const index = useCategoryIndex(tree.data)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = (c: StoreCategoryResponse) => !q || [c.nameAr, c.nameEn, c.code].some((s) => s.toLowerCase().includes(q))
    return (tree.data ?? [])
      .map((section) => ({ section, children: matches(section) ? section.children : section.children.filter(matches) }))
      .filter(({ section, children }) => children.length > 0 || (mode === 'any' && matches(section)))
  }, [tree.data, query, mode])

  const selected = value ? index.get(value) : undefined
  const label = selected
    ? selected.section
      ? `${pick(selected.section.nameAr, selected.section.nameEn)} › ${pick(selected.category.nameAr, selected.category.nameEn)}`
      : pick(selected.category.nameAr, selected.category.nameEn)
    : null

  const choose = (c: StoreCategoryResponse) => {
    onChange(c.id, c)
    setOpen(false)
  }

  const row = (c: StoreCategoryResponse, nested: boolean) => (
    <button
      key={c.id}
      type="button"
      role="option"
      aria-selected={c.id === value}
      onClick={() => choose(c)}
      className={cn('flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-start text-sm hover:bg-muted', nested && 'ps-6', !nested && 'font-semibold')}
    >
      <Check className={cn('size-4 shrink-0', c.id === value ? 'opacity-100' : 'opacity-0')} />
      <span className="min-w-0 flex-1 truncate">{pick(c.nameAr, c.nameEn)}</span>
      {!nested && mode === 'any' && <span className="shrink-0 text-[11px] font-normal text-muted-foreground">{t('categories.allOfSection')}</span>}
    </button>
  )

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setQuery('')
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-invalid={invalid}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-md border border-input bg-surface px-3 text-start text-sm shadow-sm disabled:opacity-50 aria-[invalid=true]:border-destructive',
            size === 'sm' ? 'h-8 text-xs' : 'h-9',
            className,
          )}
        >
          <span className={cn('truncate', !label && 'text-muted-foreground')}>{label ?? placeholder ?? t('categories.pick')}</span>
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
                aria-label={t('common:actions.clearFilters')}
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
          <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('common:actions.search')} className="h-8" />
        </div>
        <div className="max-h-80 overflow-y-auto p-1" role="listbox">
          {tree.isLoading && (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {t('common:common.loading')}
            </div>
          )}
          {!tree.isLoading && sections.length === 0 && <div className="py-6 text-center text-xs text-muted-foreground">{t('common:table.empty')}</div>}
          {sections.map(({ section, children }) => (
            <div key={section.id} role="group" aria-label={pick(section.nameAr, section.nameEn)}>
              {mode === 'any' ? (
                row(section, false)
              ) : (
                <div className="flex items-center gap-2 px-2 pb-1 pt-2 text-xs font-semibold text-muted-foreground">
                  {pick(section.nameAr, section.nameEn)}
                </div>
              )}
              {children.map((c) => row(c, true))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
