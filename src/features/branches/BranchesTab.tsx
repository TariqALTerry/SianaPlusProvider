import { Building2, CalendarOff, Clock, Crown, MoreHorizontal, Pencil, Plus, Power, PowerOff, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProviderBranchResponse } from '@/api/types'
import { fileUrl } from '@/api/files'
import { EmptyState, ErrorState } from '@/components/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useProvider } from '@/app/provider'
import { useLang } from '@/hooks/useLang'
import { enumLabel } from '@/i18n/enums'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useBranches } from './api'
import { BranchDialog } from './components/BranchDialog'
import { ActiveDialog, ClosuresDialog, HoursDialog, MembersDialog, SetMainDialog } from './components/BranchDialogs'
import { WEEK } from './logic'
import './i18n'

type Pending = { kind: 'edit' | 'hours' | 'closures' | 'members' | 'main' | 'active'; branch: ProviderBranchResponse }

/**
 * ملف المنشأة → الفروع (phase 1 §3): every branch, main first. Reading is for the owner and supervisors; every change is
 * the owner's (`OwnerOnly`), so a supervisor sees no buttons.
 */
export function BranchesTab() {
  const { t } = useTranslation('branches')
  const { isOwner, counterOnly, mode } = useProvider()
  const query = useBranches()
  const [creating, setCreating] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)
  const open = (kind: Pending['kind'], branch: ProviderBranchResponse) => setPending({ kind, branch })
  const close = () => setPending(null)
  const of = (kind: Pending['kind']) => (pending?.kind === kind ? pending.branch : null)

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl space-y-1">
          <p className="text-sm text-muted-foreground">{t('tab.hint')}</p>
          {counterOnly && mode !== 'full' && <p className="text-sm font-medium text-tone-info">{t('tab.counterOnlyFirst')}</p>}
          {!isOwner && <p className="text-xs text-muted-foreground">{t('tab.ownerOnly')}</p>}
        </div>
        {isOwner && (
          <Button size="sm" onClick={() => setCreating(true)} className="self-start">
            <Plus /> {t('tab.add')}
          </Button>
        )}
      </div>

      {query.isPending ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : query.isError ? (
        <Card>
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </Card>
      ) : query.data.length === 0 ? (
        <Card>
          <EmptyState icon={<Building2 className="size-5" />} title={t('tab.empty')} />
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {query.data.map((b) => (
            <BranchCard key={b.id} branch={b} isOwner={isOwner} onAction={open} />
          ))}
        </div>
      )}

      <BranchDialog open={creating} onOpenChange={setCreating} />
      <BranchDialog open={pending?.kind === 'edit'} onOpenChange={(o) => !o && close()} branch={of('edit')} />
      <HoursDialog branch={of('hours')} onOpenChange={(o) => !o && close()} />
      <ClosuresDialog branch={of('closures')} onOpenChange={(o) => !o && close()} />
      <MembersDialog branch={of('members')} onOpenChange={(o) => !o && close()} />
      <SetMainDialog branch={of('main')} onOpenChange={(o) => !o && close()} />
      <ActiveDialog branch={of('active')} onOpenChange={(o) => !o && close()} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  const { lang } = useLang()
  return (
    <div className="rounded-md bg-muted/50 px-2 py-1.5 text-center">
      <div className="tabular text-base font-semibold">{formatNumber(value, lang)}</div>
      <div className="text-[0.6875rem] text-muted-foreground">{label}</div>
    </div>
  )
}

function BranchCard({ branch: b, isOwner, onAction }: { branch: ProviderBranchResponse; isOwner: boolean; onAction: (kind: Pending['kind'], b: ProviderBranchResponse) => void }) {
  const { t } = useTranslation('branches')
  const { lang } = useLang()
  const address = [b.addressLine, b.district, b.city].filter(Boolean).join('، ')
  const logo = fileUrl(b.receiptLogoUrl)
  const hours = WEEK.map((day) => ({ day, h: b.openingHours.find((x) => x.dayOfWeek === day) })).filter((x) => x.h)

  return (
    <Card className={cn(!b.isActive && 'opacity-75')}>
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          {logo ? (
            <img src={logo} alt="" className="size-10 shrink-0 rounded-md border bg-surface object-contain" />
          ) : (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
              <Building2 className="size-5" />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="flex flex-wrap items-center gap-2 font-semibold">
              <span className="truncate">{b.name}</span>
              <bdi className="ltr-nums font-latin text-xs font-normal text-muted-foreground">{b.code}</bdi>
            </h3>
            <div className="mt-1 flex flex-wrap gap-1">
              {b.isMain && (
                <Badge tone="active">
                  <Crown className="size-3" /> {t('tab.main')}
                </Badge>
              )}
              {!b.isActive && <Badge tone="muted">{t('tab.inactive')}</Badge>}
              {b.counterEnabled && <Badge tone="info">{t('tab.counterOn')}</Badge>}
              {!b.receivesPlatformDevices && <Badge tone="neutral">{t('tab.noPlatform')}</Badge>}
            </div>
          </div>
        </div>
        {isOwner && (
          <div className="flex shrink-0 items-center gap-1">
            <Button size="xs" variant="outline" onClick={() => onAction('edit', b)}>
              <Pencil /> {t('tab.edit')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon-sm" variant="ghost" aria-label={t('tab.more')}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onAction('hours', b)}>
                  <Clock /> {t('tab.editHours')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAction('closures', b)}>
                  <CalendarOff /> {t('tab.editClosures')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAction('members', b)}>
                  <Users /> {t('tab.editMembers')}
                </DropdownMenuItem>
                {!b.isMain && b.isActive && (
                  <DropdownMenuItem onSelect={() => onAction('main', b)}>
                    <Crown /> {t('tab.setMain')}
                  </DropdownMenuItem>
                )}
                {!b.isMain && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem destructive={b.isActive} onSelect={() => onAction('active', b)}>
                      {b.isActive ? <PowerOff /> : <Power />} {b.isActive ? t('tab.deactivate') : t('tab.activate')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      <CardBody className="space-y-3 text-sm">
        {address && <p className="text-muted-foreground">{address}</p>}
        {(b.phone || b.whatsAppNumber) && (
          <p className="ltr-nums flex flex-wrap gap-x-4 font-latin text-xs" dir="ltr">
            {b.phone && <a href={`tel:${b.phone}`}>{b.phone}</a>}
            {b.whatsAppNumber && <span>WhatsApp {b.whatsAppNumber}</span>}
          </p>
        )}
        <div className="grid grid-cols-3 gap-2">
          <Stat label={t('tab.executors')} value={b.executorsCount} />
          <Stat label={t('tab.openItems')} value={b.openItemsCount} />
          <Stat label={t('tab.devicesHere')} value={b.devicesInBranchCount} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('tab.hours')}</p>
          {hours.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('tab.noHours')}</p>
          ) : (
            <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs sm:grid-cols-3">
              {hours.map(({ day, h }) => (
                <li key={day} className="flex justify-between gap-2">
                  <span>{enumLabel('DayOfWeek', day, lang)}</span>
                  <bdi className="ltr-nums tabular text-muted-foreground">{h!.isClosed ? t('tab.closed') : `${h!.opens}–${h!.closes}`}</bdi>
                </li>
              ))}
            </ul>
          )}
        </div>
        {b.closures.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">{t('tab.closures')}</p>
            <ul className="mt-1 space-y-0.5 text-xs">
              {b.closures.slice(0, 3).map((c) => (
                <li key={c.id}>
                  <bdi className="ltr-nums tabular">{c.startsOn === c.endsOn ? c.startsOn : `${c.startsOn} → ${c.endsOn}`}</bdi>
                  {c.reason && <span className="ms-2 text-muted-foreground">{c.reason}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground">{t('tab.members')}</p>
          <p className="text-xs">{b.members.length ? b.members.map((m) => `${m.fullName} (${enumLabel('ProviderMemberRole', m.role, lang)})`).join(lang === 'ar' ? '، ' : ', ') : <span className="text-muted-foreground">{t('tab.noMembers')}</span>}</p>
        </div>
        {b.termsText && (
          <p className="text-xs text-muted-foreground">
            {t('tab.terms')}: {t('tab.termsVersion', { version: b.termsVersion })}
          </p>
        )}
      </CardBody>
    </Card>
  )
}
