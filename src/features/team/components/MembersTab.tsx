import { useTranslation } from 'react-i18next'
import { EmptyState, ErrorState } from '@/components/States'
import { Card } from '@/components/ui/card'
import { useMembers } from '../api'
import { MemberList } from './MemberList'
import '../i18n'

/** الأعضاء (§8.7): everyone with an account in the organization, read-only. */
export function MembersTab() {
  const { t } = useTranslation('team')
  const members = useMembers()

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t('members.intro')}</p>
      {members.isError ? (
        <Card>
          <ErrorState error={members.error} onRetry={() => void members.refetch()} />
        </Card>
      ) : members.data && members.data.length === 0 ? (
        <Card>
          <EmptyState title={t('members.empty')} />
        </Card>
      ) : (
        <MemberList members={members.data ?? []} loading={members.isPending} />
      )}
    </div>
  )
}
