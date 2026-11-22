import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { DateTime } from '@/components/Format'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/States'
import { EnumText, StatusBadge } from '@/components/StatusBadge'
import { Card } from '@/components/ui/card'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { workKeys, workApi } from '../api'
import { formatCallDuration } from '../calls'

/** The in-app call log of a service (no phone numbers). */
export function CallsTab({ itemId }: { itemId: string }) {
  const { t } = useTranslation('work')
  const query = useQuery({ queryKey: workKeys.calls(itemId), queryFn: ({ signal }) => workApi.calls(itemId, signal) })
  if (query.isPending) return <PageSkeleton />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  if (!query.data.length) return <EmptyState title={t('detail.calls.empty')} />
  return (
    <Card className="overflow-x-auto">
      <Table>
        <THead>
          <Tr>
            <Th>{t('detail.calls.startedAt')}</Th>
            <Th>{t('detail.calls.parties')}</Th>
            <Th>{t('detail.calls.side')}</Th>
            <Th>{t('detail.calls.outcome')}</Th>
            <Th>{t('detail.calls.duration')}</Th>
          </Tr>
        </THead>
        <TBody>
          {query.data.map((c) => (
            <Tr key={c.id}>
              <Td>
                <DateTime value={c.startedAt} mode="absolute" className="text-xs" />
              </Td>
              <Td>
                {c.callerName} ← {c.calleeName}
              </Td>
              <Td>
                <EnumText enum="ServiceCallSide" value={c.callerSide} />
              </Td>
              <Td>
                <StatusBadge enum="ServiceCallOutcome" value={c.outcome} />
              </Td>
              <Td className="tabular" dir="ltr">
                {formatCallDuration(c)}
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </Card>
  )
}
