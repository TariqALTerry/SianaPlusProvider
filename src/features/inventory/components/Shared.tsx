import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'
import { Combobox, type ComboOption } from '@/components/Pickers'
import { Select } from '@/components/ui/input'
import { useRoleKind } from '@/features/auth/authStore'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useLang } from '@/hooks/useLang'
import { cn } from '@/lib/utils'
import { usePartOptions, useSupplierOptions } from '../api'
import { formatQuantity } from '../logic'
import '../i18n'

const SECTIONS = [
  { to: '/inventory/stock', key: 'stock', frontDesk: true },
  { to: '/inventory/low-stock', key: 'lowStock', frontDesk: true },
  { to: '/inventory/parts', key: 'parts', frontDesk: false },
  { to: '/inventory/suppliers', key: 'suppliers', frontDesk: false },
  { to: '/inventory/movements', key: 'movements', frontDesk: false },
  { to: '/inventory/supplier-returns', key: 'returns', frontDesk: false },
] as const

/**
 * The section bar shared by the inventory pages. The front desk sees stock and low stock only (phase 6 §1: its menu
 * entry is read-only stock); the other pages stay reachable by link for it, without costs.
 */
export function InventoryTabs({ className }: { className?: string }) {
  const { t } = useTranslation('inventory')
  const frontDesk = useRoleKind() === 'frontDesk'
  return (
    <nav aria-label={t('title')} className={cn('mb-4 flex items-center gap-1 overflow-x-auto border-b [scrollbar-width:none]', className)}>
      {SECTIONS.filter((s) => !frontDesk || s.frontDesk).map((s) => (
        <NavLink
          key={s.to}
          to={s.to}
          className={({ isActive }) =>
            cn(
              '-mb-px inline-flex h-11 shrink-0 items-center border-b-2 px-3 text-sm font-medium transition-colors',
              isActive ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )
          }
        >
          {t(`tabs.${s.key}`)}
        </NavLink>
      ))}
    </nav>
  )
}

/** A quantity with 0–2 decimals and its unit (`pcs` is not shown). */
export function Qty({ value, unit, className, signed }: { value: number | null | undefined; unit?: string | null; className?: string; signed?: boolean }) {
  const { lang } = useLang()
  const text = formatQuantity(value, lang)
  return (
    <span className={cn('tabular ltr-nums whitespace-nowrap', className)}>
      {signed && value !== null && value !== undefined && value > 0 ? '+' : ''}
      {text}
      {unit && unit !== 'pcs' && <span className="ms-1 text-xs text-muted-foreground">{unit}</span>}
    </span>
  )
}

/** Active parts, searched on the server. `selectedLabel` keeps a prefilled part readable before the list loads. */
export function PartPicker({
  id,
  value,
  selectedLabel,
  onChange,
  disabled,
  invalid,
  compact,
}: {
  id?: string
  /** Filter-bar height. */
  compact?: boolean
  value: string | null
  selectedLabel?: string | null
  onChange: (partId: string | null, label: string | null) => void
  disabled?: boolean
  invalid?: boolean
}) {
  const { t } = useTranslation('inventory')
  const { pick } = useLang()
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search, 300)
  const parts = usePartOptions(debounced.trim(), !disabled)
  const options: ComboOption[] = (parts.data?.items ?? []).map((p) => ({
    value: p.id,
    label: `${p.sku} · ${pick(p.nameAr, p.nameEn)}`,
    description: [p.brand, p.compatibleModels].filter(Boolean).join(' · ') || undefined,
  }))
  return (
    <Combobox
      id={id}
      value={value}
      selectedLabel={selectedLabel}
      onChange={(v, o) => onChange(v, o?.label ?? null)}
      options={options}
      loading={parts.isFetching && !parts.data}
      placeholder={t('form.partPlaceholder')}
      onSearch={setSearch}
      disabled={disabled}
      size={compact ? 'sm' : 'default'}
      className={cn(!compact && 'h-11', invalid && 'border-destructive')}
    />
  )
}

/** Active suppliers; the empty option = no supplier. */
export function SupplierSelect({
  id,
  value,
  currentLabel,
  onChange,
  emptyLabel,
  className,
}: {
  id?: string
  value: string | null
  /** The name of a current supplier that is no longer active (kept visible, never re-offered). */
  currentLabel?: string | null
  onChange: (id: string | null) => void
  emptyLabel?: string
  className?: string
}) {
  const { t } = useTranslation('inventory')
  const suppliers = useSupplierOptions()
  const items = suppliers.data?.items ?? []
  return (
    <Select
      id={id}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      placeholder={emptyLabel ?? t('form.supplierPlaceholder')}
      disabled={suppliers.isPending}
      className={cn('h-11', className)}
    >
      {value && !items.some((s) => s.id === value) && (
        <option value={value} disabled>
          {currentLabel ?? '—'}
        </option>
      )}
      {items.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </Select>
  )
}
