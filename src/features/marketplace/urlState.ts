import { paginationDefaults, type useUrlState } from '@/hooks/useUrlState'

/** `/marketplace` list state: the tab plus each tab's filters (search for tenders, status for offers). */
export const marketplaceUrlSchema = {
  ...paginationDefaults,
  tab: 'open',
  search: '',
  status: '',
}

export type MarketplaceUrl = ReturnType<typeof useUrlState<typeof marketplaceUrlSchema>>
