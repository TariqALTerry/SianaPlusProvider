import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LOOKUP_STALE_TIME } from '@/api/queryClient'
import { Combobox, type ComboOption } from '@/components/Pickers'
import { catalogApi, catalogKeys } from '@/features/store/api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useLang } from '@/hooks/useLang'
import { useService } from '../hooks'
import '../i18n'

/**
 * The work type of a counter intake (`canonicalServiceId`): a search over the public catalog (the same services the
 * customer app shows), at most 20 matches.
 */
export function ServiceField({ id, value, onChange, invalid }: { id?: string; value: string | null; onChange: (id: string | null) => void; invalid?: boolean }) {
  const { t } = useTranslation('counter')
  const { pick } = useLang()
  const [term, setTerm] = useState('')
  const q = useDebouncedValue(term.trim(), 300)
  const [pickedLabel, setPickedLabel] = useState<string | null>(null)
  const search = useQuery({ queryKey: catalogKeys.search(q), queryFn: ({ signal }) => catalogApi.searchServices(q, signal), enabled: q.length > 0, staleTime: LOOKUP_STALE_TIME })
  const selected = useService(value)

  const options = useMemo<ComboOption[]>(() => (search.data ?? []).map((s) => ({ value: s.id, label: pick(s.nameAr, s.nameEn), description: s.code })), [search.data, pick])

  return (
    <Combobox
      id={id}
      value={value}
      selectedLabel={value ? (selected.data ? pick(selected.data.nameAr, selected.data.nameEn) : (pickedLabel ?? '…')) : null}
      onChange={(v, option) => {
        setPickedLabel(option?.label ?? null)
        onChange(v)
      }}
      options={options}
      loading={q.length > 0 && search.isFetching}
      placeholder={t('wizard.servicePlaceholder')}
      onSearch={setTerm}
      className={invalid ? 'h-11 border-destructive text-base' : 'h-11 text-base'}
    />
  )
}
