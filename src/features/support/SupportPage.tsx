import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from '@/components/DataTable'
import { QuickTabs } from '@/components/Filters'
import { DateTime } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listQueryOptions } from '@/api/queryClient'
import type { SupportTicketSummaryResponse } from '@/api/types'
import { useLang } from '@/hooks/useLang'
import { usePollingInterval } from '@/hooks/usePageVisible'
import { paginationDefaults, useUrlState } from '@/hooks/useUrlState'
import { enumLabel } from '@/i18n/enums'
import { supportApi, supportKeys, type SupportListParams } from './api'
import { NewTicketDialog } from './components/NewTicketDialog'
import './i18n'

const schema = { ...paginationDefaults, tab: 'current' }

/** `/support` "الدعم الفني" (SUPPORT-TICKETS-PROVIDER-PLATFORM-PROMPT §2): my tickets, current or all, and a new one. */
export function SupportPage() {
  const { t } = useTranslation('support')
  const { lang } = useLang()
  const { state, set } = useUrlState(schema)
  const [newOpen, setNewOpen] = useState(false)
  const interval = usePollingInterval(30_000)

  const params: SupportListParams = { openOnly: state.tab === 'current' ? true : undefined, page: state.page, pageSize: state.pageSize }
  const query = useQuery({
    queryKey: supportKeys.list(params),
    queryFn: ({ signal }) => supportApi.list(params, signal),
    refetchInterval: interval,
    ...listQueryOptions,
  })

  const columns = useMemo<ColumnDef<SupportTicketSummaryResponse, unknown>[]>(
    () => [
      {
        id: 'number',
        header: t('columns.number'),
        meta: { alwaysVisible: true },
        cell: ({ row: { original: r } }) => (
          <span className="flex items-center gap-1.5">
            <span
              className={r.hasUnread ? 'size-2 shrink-0 rounded-full bg-tone-danger' : 'size-2 shrink-0'}
              title={r.hasUnread ? t('unread') : undefined}
              aria-label={r.hasUnread ? t('unread') : undefined}
              role={r.hasUnread ? 'img' : undefined}
            />
            <span className="ltr-nums font-mono text-[0.8125rem] font-medium text-primary">{r.ticketNumber}</span>
          </span>
        ),
      },
      {
        id: 'subject',
        header: t('columns.subject'),
        meta: { cardTitle: true },
        cell: ({ row: { original: r } }) => (
          <div className="max-w-[26rem]">
            <div className="flex items-center gap-2">
              <span className={r.hasUnread ? 'truncate font-semibold' : 'truncate'} dir="auto">
                {r.subject}
              </span>
              {r.status === 'WaitingForReply' && <Badge tone="attention">{t('replyNeeded')}</Badge>}
            </div>
            {(r.lastMessagePreview || r.itemNumber) && (
              <div className="truncate text-xs text-muted-foreground" dir="auto">
                {r.itemNumber && <span className="ltr-nums me-2 font-mono">{r.itemNumber}</span>}
                {r.lastMessagePreview}
              </div>
            )}
          </div>
        ),
      },
      { id: 'category', header: t('columns.category'), cell: ({ row: { original: r } }) => <span className="text-xs">{enumLabel('SupportTicketCategory', r.category, lang)}</span> },
      { id: 'priority', header: t('columns.priority'), cell: ({ row: { original: r } }) => <StatusBadge enum="SupportTicketPriority" value={r.priority} /> },
      { id: 'status', header: t('columns.status'), cell: ({ row: { original: r } }) => <StatusBadge enum="SupportTicketStatus" value={r.status} /> },
      { id: 'lastActivity', header: t('columns.lastActivity'), cell: ({ row: { original: r } }) => <DateTime value={r.updatedAt} className="text-xs text-muted-foreground" /> },
    ],
    [t, lang],
  )

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button onClick={() => setNewOpen(true)}>
            <Plus /> {t('new')}
          </Button>
        }
      />

      <QuickTabs
        className="mb-3"
        value={state.tab}
        onChange={(tab) => set({ tab })}
        tabs={[
          { key: 'current', label: t('tabs.current') },
          { key: 'all', label: t('tabs.all') },
        ]}
      />

      <DataTable
        id="support-tickets"
        columns={columns}
        query={query}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={(page) => set({ page })}
        onPageSizeChange={(pageSize) => set({ pageSize })}
        getRowId={(r) => r.id}
        rowHref={(r) => `/support/${r.id}`}
        // No hover prefetch: reading a ticket marks it read.
        emptyTitle={state.tab === 'current' ? t('emptyCurrent') : t('empty')}
      />

      <NewTicketDialog open={newOpen} onOpenChange={setNewOpen} />
    </>
  )
}
