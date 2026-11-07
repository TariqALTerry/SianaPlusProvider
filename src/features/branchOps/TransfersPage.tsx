import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { listQueryOptions } from '@/api/queryClient'
import type { BranchTransferResponse, BranchTransferStatus } from '@/api/types'
import { DataTable } from '@/components/DataTable'
import { EnumFilter } from '@/components/Filters'
import { DateTime } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { CheckboxField } from '@/components/ui/checkbox'
import { useBranchScope } from '@/features/branches/scope'
import { usePollingInterval } from '@/hooks/usePageVisible'
import { useUrlState } from '@/hooks/useUrlState'
import { useLang } from '@/hooks/useLang'
import { branchOpsApi, branchOpsKeys, type TransferListParams } from './api'
import { routeArrow, transferDirection } from './logic'
import './i18n'

const schema = { status: '', openOnly: true, page: 1, pageSize: 25 }

/**
 * `/counter/transfers` (phase 5 §5): transfers from or to the caller's branches, scoped by the branch switcher. Open
 * ones by default; a row opens the transfer, where it is sent, received or cancelled.
 */
export function TransfersPage() {
  const { t } = useTranslation('branchOps')
  const { pick, isRtl } = useLang()
  const { state, set } = useUrlState(schema)
  const scope = useBranchScope()
  const interval = usePollingInterval(60_000)
  const branchId = scope.branchId
  const here = scope.selected?.id ?? null

  const params: TransferListParams = {
    branchId,
    status: (state.status || undefined) as BranchTransferStatus | undefined,
    openOnly: state.openOnly || undefined,
    page: state.page,
    pageSize: state.pageSize,
  }
  const list = useQuery({
    queryKey: branchOpsKeys.transfers(params),
    queryFn: ({ signal }) => branchOpsApi.transfers(params, signal),
    ...listQueryOptions,
    refetchInterval: interval,
    enabled: scope.mode !== 'loading',
  })

  const columns = useMemo<ColumnDef<BranchTransferResponse, unknown>[]>(
    () => [
      {
        id: 'service',
        header: t('transfers.col.service'),
        meta: { alwaysVisible: true, cardTitle: true },
        cell: ({ row: { original: r } }) => {
          const dir = transferDirection(r, here)
          return (
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <bdi className="ltr-nums font-mono text-sm font-semibold">{r.intakeNumber ?? r.itemNumber}</bdi>
                {dir && <Badge tone={dir === 'in' ? 'info' : 'neutral'}>{t(`transfers.${dir}`)}</Badge>}
              </div>
              <div className="truncate text-xs text-muted-foreground">{pick(r.serviceNameAr, r.serviceNameEn)}</div>
            </div>
          )
        },
      },
      {
        id: 'route',
        header: t('transfers.col.route'),
        cell: ({ row: { original: r } }) => (
          <span className="text-sm">
            {r.fromBranch.name} <span className="text-muted-foreground">{routeArrow(isRtl)}</span> {r.toBranch.name}
          </span>
        ),
      },
      {
        id: 'devices',
        header: t('transfers.col.devices'),
        meta: { cardHidden: true },
        cell: ({ row: { original: r } }) => (
          <span className="text-xs">
            {r.devices.length === 1 ? [r.devices[0]!.name, r.devices[0]!.brand, r.devices[0]!.model].filter(Boolean).join(' · ') : t('transfers.devicesCount', { count: r.devices.length })}
          </span>
        ),
      },
      {
        id: 'status',
        header: t('transfers.col.status'),
        cell: ({ row: { original: r } }) => <StatusBadge enum="BranchTransferStatus" value={r.status} />,
      },
      {
        id: 'courier',
        header: t('transfers.col.courier'),
        meta: { cardHidden: true },
        cell: ({ row: { original: r } }) => <span className="text-sm">{r.courierName ?? <span className="text-xs text-muted-foreground">{t('transfers.noCourier')}</span>}</span>,
      },
      {
        id: 'created',
        header: t('transfers.col.created'),
        cell: ({ row: { original: r } }) => <DateTime value={r.createdAt} className="text-xs text-muted-foreground" />,
      },
    ],
    [t, pick, here, isRtl],
  )

  const filtered = !!state.status || !state.openOnly
  return (
    <>
      <PageHeader title={t('transfers.title')} description={scope.selected ? `${scope.selected.name} · ${t('transfers.description')}` : t('transfers.description')} />
      <DataTable
        id="counter-transfers"
        columns={columns}
        query={list}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={(page) => set({ page })}
        onPageSizeChange={(pageSize) => set({ pageSize })}
        getRowId={(r) => r.id}
        rowHref={(r) => `/counter/transfers/${r.id}`}
        filtered={filtered}
        onClearFilters={() => set({ status: '', openOnly: true })}
        emptyTitle={t('transfers.empty')}
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <EnumFilter enumName="BranchTransferStatus" value={state.status} onChange={(status) => set({ status })} label={t('transfers.status')} />
            <CheckboxField id="transfers-open-only" checked={state.openOnly} onCheckedChange={(openOnly) => set({ openOnly })} label={t('transfers.openOnly')} />
          </div>
        }
      />
    </>
  )
}
