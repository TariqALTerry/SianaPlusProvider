import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TeamMemberResponse } from '@/api/types'
import { DateTime } from '@/components/Format'
import { PhoneText } from '@/components/PhoneText'
import { StatusBadge } from '@/components/StatusBadge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { useIsDesktopTable } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { ActiveBadge } from './Bits'
import '../i18n'

/**
 * A non-paginated member array (§8.7, rule 3): a simple table on desktop, one card per member
 * on phones. `actions` renders per-row controls (supervisor enable/disable).
 */
export function MemberList({
  members,
  loading,
  showRole = true,
  actions,
}: {
  members: readonly TeamMemberResponse[]
  loading?: boolean
  showRole?: boolean
  actions?: (m: TeamMemberResponse) => ReactNode
}) {
  const { t } = useTranslation('team')
  const desktop = useIsDesktopTable()

  if (loading) {
    return (
      <Card className="space-y-3 p-4" aria-busy>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </Card>
    )
  }

  if (!desktop) {
    return (
      <Card className="overflow-hidden">
        <ul className="divide-y">
          {members.map((m) => (
            <li key={m.id} className={cn('space-y-1.5 p-3', !m.isActive && 'bg-muted/30')}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{m.fullName || m.username}</p>
                  <p className="ltr-nums truncate text-xs text-muted-foreground" dir="ltr">
                    {m.username}
                  </p>
                </div>
                {showRole && <StatusBadge enum="ProviderMemberRole" value={m.role} dot={false} />}
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[0.8125rem]">
                <dt className="text-muted-foreground">{t('columns.phone')}</dt>
                <dd className="text-end">
                  <PhoneText phone={m.phone} />
                </dd>
                {m.email && (
                  <>
                    <dt className="text-muted-foreground">{t('columns.email')}</dt>
                    <dd className="truncate text-end" dir="ltr">
                      {m.email}
                    </dd>
                  </>
                )}
                <dt className="text-muted-foreground">{t('columns.active')}</dt>
                <dd className="text-end">
                  <ActiveBadge active={m.isActive} />
                </dd>
                <dt className="text-muted-foreground">{t('columns.joinedAt')}</dt>
                <dd className="text-end">
                  <DateTime value={m.joinedAt} mode="date" className="text-xs" />
                </dd>
              </dl>
              {actions && <div className="flex justify-end">{actions(m)}</div>}
            </li>
          ))}
        </ul>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <THead>
            <Tr className="border-b">
              <Th>{t('columns.name')}</Th>
              <Th>{t('columns.username')}</Th>
              {showRole && <Th>{t('columns.role')}</Th>}
              <Th>{t('columns.phone')}</Th>
              <Th>{t('columns.email')}</Th>
              <Th>{t('columns.active')}</Th>
              <Th>{t('columns.joinedAt')}</Th>
              {actions && <Th className="text-end">{t('columns.actions')}</Th>}
            </Tr>
          </THead>
          <TBody>
            {members.map((m) => (
              <Tr key={m.id} className={cn(!m.isActive && 'bg-muted/30 text-muted-foreground')}>
                <Td className="py-2.5 font-medium">{m.fullName || '—'}</Td>
                <Td className="py-2.5">
                  <span className="ltr-nums font-latin text-xs" dir="ltr">
                    {m.username}
                  </span>
                </Td>
                {showRole && (
                  <Td className="py-2.5">
                    <StatusBadge enum="ProviderMemberRole" value={m.role} dot={false} />
                  </Td>
                )}
                <Td className="py-2.5">
                  <PhoneText phone={m.phone} className="text-xs" />
                </Td>
                <Td className="py-2.5 text-xs">
                  {m.email ? (
                    <span dir="ltr" className="font-latin">
                      {m.email}
                    </span>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td className="py-2.5">
                  <ActiveBadge active={m.isActive} />
                </Td>
                <Td className="py-2.5">
                  <DateTime value={m.joinedAt} mode="date" className="text-xs" />
                </Td>
                {actions && <Td className="py-2.5 text-end">{actions(m)}</Td>}
              </Tr>
            ))}
          </TBody>
        </Table>
      </div>
    </Card>
  )
}
