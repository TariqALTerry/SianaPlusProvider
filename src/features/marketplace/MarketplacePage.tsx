import { useTranslation } from 'react-i18next'
import { QuickTabs } from '@/components/Filters'
import { PageHeader } from '@/components/PageHeader'
import { useUrlState } from '@/hooks/useUrlState'
import './i18n'
import { MyOffersTab } from './components/MyOffersTab'
import { OpenTendersTab } from './components/OpenTendersTab'
import { marketplaceUrlSchema } from './urlState'

/** `/marketplace`: open tenders and my offers, the tab in the URL (§8.8). */
export function MarketplacePage() {
  const { t } = useTranslation('marketplace')
  const url = useUrlState(marketplaceUrlSchema)
  const tab = url.state.tab === 'offers' ? 'offers' : 'open'

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <QuickTabs
        className="mb-3"
        value={tab}
        // Each tab has its own filters: switching starts clean.
        onChange={(key) => url.set({ tab: key, search: '', status: '' })}
        tabs={[
          { key: 'open', label: t('tabs.open') },
          { key: 'offers', label: t('tabs.offers') },
        ]}
      />
      {tab === 'open' ? <OpenTendersTab url={url} /> : <MyOffersTab url={url} />}
    </>
  )
}
