import type { ServiceItemStatus, ServiceItemStatusCountResponse } from '@/api/types'
import { PROVIDER_ACTIVE_STATUSES } from '@/features/work/logic'
import { SERVICE_ITEM_LIFECYCLE } from '@/i18n/enums'

export interface DistributionSegment {
  status: ServiceItemStatus
  count: number
  /** Share of the active total, 0..1. */
  share: number
}

/**
 * The home distribution bar (§8.2): active statuses only (the backend's
 * `IsActiveForProvider`, which `activeItems` sums), in lifecycle order, empty ones dropped.
 */
export function activeDistribution(itemsByStatus: readonly ServiceItemStatusCountResponse[]): DistributionSegment[] {
  const counts = new Map<ServiceItemStatus, number>()
  for (const row of itemsByStatus) {
    if (PROVIDER_ACTIVE_STATUSES.includes(row.status) && row.count > 0) counts.set(row.status, (counts.get(row.status) ?? 0) + row.count)
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0)
  return SERVICE_ITEM_LIFECYCLE.filter((s) => counts.has(s)).map((status) => {
    const count = counts.get(status)!
    return { status, count, share: total > 0 ? count / total : 0 }
  })
}

/** `/work?status=X` — the work list's URL schema (see `features/work/WorkPage`). */
export function workHrefForStatus(status: ServiceItemStatus): string {
  return `/work?${new URLSearchParams({ status }).toString()}`
}
