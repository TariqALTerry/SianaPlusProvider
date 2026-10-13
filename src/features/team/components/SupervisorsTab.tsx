import { Power, PowerOff, ShieldPlus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState, ErrorState } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useMembers } from '../api'
import { supervisorsOf } from '../utils'
import { MemberList } from './MemberList'
import { SupervisorDialog } from './SupervisorDialog'
import { ToggleActiveDialog, type ToggleTarget } from './ToggleActiveDialog'
import '../i18n'

/**
 * المشرفون (owner only, §7): the members with role Supervisor, plus add and enable/disable.
 * The page never mounts this for a supervisor; the server would answer `OwnerOnly` anyway.
 */
export function SupervisorsTab() {
  const { t } = useTranslation('team')
  const members = useMembers()
  const supervisors = supervisorsOf(members.data)
  const [adding, setAdding] = useState(false)
  const [toggle, setToggle] = useState<ToggleTarget | null>(null)

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl text-sm text-muted-foreground">{t('supervisors.intro')}</p>
        <Button size="sm" onClick={() => setAdding(true)} className="self-start">
          <ShieldPlus /> {t('supervisors.add')}
        </Button>
      </div>

      {members.isError ? (
        <Card>
          <ErrorState error={members.error} onRetry={() => void members.refetch()} />
        </Card>
      ) : members.data && supervisors.length === 0 ? (
        <Card>
          <EmptyState
            title={t('supervisors.empty')}
            description={t('supervisors.emptyHint')}
            action={
              <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
                <ShieldPlus /> {t('supervisors.add')}
              </Button>
            }
          />
        </Card>
      ) : (
        <MemberList
          members={supervisors}
          loading={members.isPending}
          showRole={false}
          actions={(m) => {
            const target: ToggleTarget = { kind: 'supervisor', id: m.id, name: m.fullName || m.username, phone: m.phone, isActive: m.isActive }
            return m.isActive ? (
              <Button size="xs" variant="ghost" className="text-destructive hover:bg-destructive-soft" onClick={() => setToggle(target)}>
                <PowerOff /> {t('toggle.deactivate')}
              </Button>
            ) : (
              <Button size="xs" variant="ghost" onClick={() => setToggle(target)}>
                <Power /> {t('toggle.activate')}
              </Button>
            )
          }}
        />
      )}

      <SupervisorDialog open={adding} onOpenChange={setAdding} />
      <ToggleActiveDialog target={toggle} onOpenChange={(o) => !o && setToggle(null)} />
    </div>
  )
}
