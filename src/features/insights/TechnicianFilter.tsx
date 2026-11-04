import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { LOOKUP_STALE_TIME } from '@/api/queryClient'
import { Select } from '@/components/ui/input'
import { boardQueryOptions } from '@/features/work/api'
import './i18n'

/**
 * The technician picker of the insights pages. It lists the whole team (active first), so it keeps its options
 * while the page shows one technician; an id from a link that is no longer on the team still shows as selected.
 */
export function TechnicianFilter({ value, onChange }: { value: string; onChange: (executorId: string) => void }) {
  const { t } = useTranslation('insights')
  const board = useQuery({ ...boardQueryOptions, staleTime: LOOKUP_STALE_TIME })
  const executors = useMemo(
    () => [...(board.data?.executors ?? [])].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.fullName.localeCompare(b.fullName)),
    [board.data],
  )
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-auto min-w-[10rem] text-xs" aria-label={t('perf.filterTechnician')}>
      <option value="">{t('perf.allTechnicians')}</option>
      {executors.map((e) => (
        <option key={e.executorId} value={e.executorId}>
          {e.fullName}
          {e.isActive ? '' : ` (${t('perf.inactive')})`}
        </option>
      ))}
      {value && !executors.some((e) => e.executorId === value) && <option value={value}>…</option>}
    </Select>
  )
}
