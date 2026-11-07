import { useTranslation } from 'react-i18next'
import type { BranchOptionResponse } from '@/api/types'
import { Select } from '@/components/ui/input'
import { useMyBranches } from './api'
import './i18n'

interface BranchSelectProps {
  id?: string
  value: string | null
  onChange: (branchId: string | null) => void
  /** Text of the empty option; omit to force a branch. */
  emptyLabel?: string
  /** Extra filter (e.g. counter on, receives platform devices). Stopped branches are never offered. */
  filter?: (b: BranchOptionResponse) => boolean
  disabled?: boolean
  className?: string
  'aria-invalid'?: boolean
}

/**
 * A branch picker over the caller's own branches (`me/branches`): the owner sees all of them, a supervisor only theirs,
 * which is exactly what the server accepts for a service's branch, a technician's home branch or a device's arrival.
 */
export function BranchSelect({ id, value, onChange, emptyLabel, filter, disabled, className, ...rest }: BranchSelectProps) {
  const { t } = useTranslation('branches')
  const mine = useMyBranches()
  const options = (mine.data?.branches ?? []).filter((b) => b.isActive && (!filter || filter(b)))
  // Keep showing a current value that is no longer offered (a stopped branch), so the select never lies.
  const current = mine.data?.branches.find((b) => b.id === value)
  const showCurrent = !!current && !options.some((b) => b.id === current.id)

  return (
    <Select
      id={id}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={disabled || mine.isPending}
      className={className}
      placeholder={emptyLabel}
      aria-invalid={rest['aria-invalid']}
    >
      {showCurrent && (
        <option value={current.id} disabled>
          {current.name} ({t('switcher.inactive')})
        </option>
      )}
      {options.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name} · {b.code}
          {b.isMain ? ` — ${t('switcher.main')}` : ''}
        </option>
      ))}
    </Select>
  )
}
