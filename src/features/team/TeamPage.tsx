import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUrlState } from '@/hooks/useUrlState'
import { useLang } from '@/hooks/useLang'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useProvider } from '@/app/provider'
import { useMembers } from './api'
import { MembersTab } from './components/MembersTab'
import { SupervisorsTab } from './components/SupervisorsTab'
import { TechniciansTab } from './components/TechniciansTab'
import { TEAM_URL_SCHEMA, resolveTab, supervisorsOf, type TeamTab } from './utils'
import './i18n'

/**
 * الفريق — `/team` (§8.7). Tabs live in the URL (`?tab=`): الفنيون, الأعضاء and, for the owner
 * only (§7), المشرفون. A supervisor following a `?tab=supervisors` link lands on technicians.
 */
export function TeamPage() {
  const { t } = useTranslation('team')
  const { lang } = useLang()
  const { org, isOwner } = useProvider()
  const { state, set } = useUrlState(TEAM_URL_SCHEMA)
  const tab = resolveTab(state.tab, isOwner)
  const members = useMembers()

  // A new tab starts without the technicians list's filters.
  const changeTab = (next: string) => set({ tab: next, search: '', availability: '', active: '', page: 1 })

  const counts: Record<TeamTab, number | null> = {
    technicians: org.executorsCount,
    members: members.data?.length ?? org.membersCount,
    supervisors: members.data ? supervisorsOf(members.data).length : null,
  }

  const trigger = (key: TeamTab) => (
    <TabsTrigger value={key}>
      {t(`tabs.${key}`)}
      {counts[key] !== null && (
        <span className={cn('tabular rounded-full px-1.5 text-xs', tab === key ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
          {formatNumber(counts[key], lang)}
        </span>
      )}
    </TabsTrigger>
  )

  return (
    <div>
      <PageHeader title={t('title')} description={t('description')} />
      <Tabs value={tab} onValueChange={changeTab} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <TabsList aria-label={t('title')}>
          {trigger('technicians')}
          {trigger('members')}
          {isOwner && trigger('supervisors')}
        </TabsList>
        <TabsContent value="technicians">
          <TechniciansTab />
        </TabsContent>
        <TabsContent value="members">
          <MembersTab />
        </TabsContent>
        {isOwner && (
          <TabsContent value="supervisors">
            <SupervisorsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
