import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Combobox, type ComboOption } from '@/components/Pickers'
import { LOOKUP_STALE_TIME } from '@/api/queryClient'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useLang } from '@/hooks/useLang'
import { formatMoney } from '@/lib/format'
import '../i18n'
import { catalogApi, catalogKeys } from '../api'
import { useServiceName } from './useServiceName'

interface ServicePickerProps {
  id?: string
  value: string | null
  onChange: (value: string | null) => void
  invalid?: boolean
}

/** Searchable picker over `GET /api/catalog/services/search?q=` (non-empty query, ≤ 20 results). */
export function ServicePicker({ id, value, onChange, invalid }: ServicePickerProps) {
  const { t } = useTranslation('store')
  const { pick, lang } = useLang()
  const [term, setTerm] = useState('')
  const q = useDebouncedValue(term.trim(), 300)
  // The label of the option picked in this session, so it shows before the catalog lookup returns.
  const [pickedLabel, setPickedLabel] = useState<string | null>(null)

  const search = useQuery({
    queryKey: catalogKeys.search(q),
    queryFn: ({ signal }) => catalogApi.searchServices(q, signal),
    enabled: q.length > 0,
    staleTime: LOOKUP_STALE_TIME,
  })

  const selected = useServiceName(value)

  const options = useMemo<ComboOption[]>(
    () =>
      (search.data ?? []).map((s) => ({
        value: s.id,
        label: pick(s.nameAr, s.nameEn),
        description: [s.code, s.basePrice !== null ? formatMoney(s.basePrice, lang) : null].filter(Boolean).join(' · '),
      })),
    [search.data, pick, lang],
  )

  const selectedLabel = value ? (selected.name ?? pickedLabel ?? (selected.missing ? t('picker.unavailable') : '…')) : null

  return (
    <Combobox
      id={id}
      value={value}
      selectedLabel={selectedLabel}
      onChange={(v, option) => {
        setPickedLabel(option?.label ?? null)
        onChange(v)
      }}
      options={options}
      loading={q.length > 0 && search.isFetching}
      placeholder={t('picker.placeholder')}
      onSearch={setTerm}
      className={invalid ? 'border-destructive' : undefined}
    />
  )
}
