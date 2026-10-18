import type { ColumnDef } from '@tanstack/react-table'
import { Activity, MoreHorizontal, Pencil, Power, PowerOff, Sparkles, UserPlus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ActiveFilter, ExecutorAvailability, ExecutorResponse } from '@/api/types'
import { DataTable } from '@/components/DataTable'
import { EnumFilter, FilterChips, SearchInput, type FilterChip } from '@/components/Filters'
import { PhoneText } from '@/components/PhoneText'
import { Rating } from '@/components/Stars'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { insightKeys, insightsApi } from '@/features/insights/api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/menu'
import { useLang } from '@/hooks/useLang'
import { useUrlState } from '@/hooks/useUrlState'
import { enumLabel } from '@/i18n/enums'
import { cn } from '@/lib/utils'
import { useExecutors, useMembers, type ExecutorListParams } from '../api'
import { TEAM_URL_SCHEMA, executorSearchTerm, ownerUserIds } from '../utils'
import { ActiveBadge, LoadBar, OwnerBadge, RoleBadges, SkillChips } from './Bits'
import { AvailabilityDialog } from './AvailabilityDialog'
import { ExecutorDialog } from './ExecutorDialog'
import { SkillsDialog } from './SkillsDialog'
import { ToggleActiveDialog, type ToggleTarget } from './ToggleActiveDialog'
import '../i18n'

/**
 * الفنيون (§8.7): `GET …/team/executors` — paginated, filters in the URL. Every write here is
 * open to the owner and supervisors alike (§7).
 */
export function TechniciansTab() {
  const { t } = useTranslation('team')
  const { lang } = useLang()
  const { state, set, reset } = useUrlState(TEAM_URL_SCHEMA)

  const params: ExecutorListParams = {
    page: state.page,
    pageSize: state.pageSize,
    search: executorSearchTerm(state.search),
    availability: (state.availability || undefined) as ExecutorAvailability | undefined,
    activeFilter: (state.active || undefined) as ActiveFilter | undefined,
  }
  const executors = useExecutors(params)
  const members = useMembers()
  const owners = useMemo(() => ownerUserIds(members.data), [members.data])
  // "في إجازة" (PHASE2 §5): the team map carries isOffNow for every technician in one call.
  const teamMap = useQuery({ queryKey: insightKeys.map, queryFn: ({ signal }) => insightsApi.teamMap(signal), staleTime: 60_000 })
  const offNow = useMemo(() => new Set((teamMap.data?.executors ?? []).filter((x) => x.isOffNow).map((x) => x.executorId)), [teamMap.data])

  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<ExecutorResponse | null>(null)
  const [skills, setSkills] = useState<ExecutorResponse | null>(null)
  const [availability, setAvailability] = useState<ExecutorResponse | null>(null)
  const [toggle, setToggle] = useState<ToggleTarget | null>(null)

  const columns = useMemo<ColumnDef<ExecutorResponse, unknown>[]>(
    () => [
      {
        id: 'name',
        header: t('columns.name'),
        meta: { cardTitle: true, alwaysVisible: true },
        cell: ({ row }) => {
          const e = row.original
          return (
            <div className={cn('flex flex-wrap items-center gap-1.5', !e.isActive && 'text-muted-foreground')}>
              <span className="font-medium">{e.fullName}</span>
              {owners.has(e.userId) && <OwnerBadge />}
              <RoleBadges canRepair={e.canRepair} canDeliver={e.canDeliver} />
              {offNow.has(e.id) && <Badge tone="muted">{t('schedule.offNow')}</Badge>}
            </div>
          )
        },
      },
      {
        id: 'phone',
        header: t('columns.phone'),
        cell: ({ row }) => <PhoneText phone={row.original.phone} className="text-xs" />,
      },
      {
        id: 'specialization',
        header: t('columns.specialization'),
        cell: ({ row }) => <span className="text-xs">{row.original.specialization || '—'}</span>,
      },
      {
        id: 'availability',
        header: t('columns.availability'),
        cell: ({ row }) => <StatusBadge enum="ExecutorAvailability" value={row.original.availability} />,
      },
      {
        id: 'load',
        header: t('columns.load'),
        cell: ({ row }) => <LoadBar active={row.original.activeJobs} max={row.original.maxConcurrentJobs} />,
      },
      {
        id: 'skills',
        header: t('columns.skills'),
        meta: { className: 'max-w-[16rem]' },
        cell: ({ row }) => <SkillChips skills={row.original.capabilities} />,
      },
      {
        id: 'rating',
        header: t('columns.rating'),
        cell: ({ row }) => <Rating value={row.original.averageRating} count={row.original.ratingsCount || undefined} />,
      },
      {
        id: 'active',
        header: t('columns.active'),
        cell: ({ row }) => <ActiveBadge active={row.original.isActive} />,
      },
      {
        id: 'actions',
        header: t('columns.actions'),
        meta: { align: 'end', alwaysVisible: true },
        cell: ({ row }) => {
          const e = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={t('menu.label', { name: e.fullName })} title={t('menu.label', { name: e.fullName })}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel className="max-w-[14rem] truncate">{e.fullName}</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => setEditing(e)}>
                  <Pencil /> {t('menu.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSkills(e)}>
                  <Sparkles /> {t('menu.skills')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setAvailability(e)}>
                  <Activity /> {t('menu.availability')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {e.isActive ? (
                  <DropdownMenuItem destructive onSelect={() => setToggle({ kind: 'executor', id: e.id, name: e.fullName, phone: e.phone, isActive: true })}>
                    <PowerOff /> {t('menu.deactivate')}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => setToggle({ kind: 'executor', id: e.id, name: e.fullName, phone: e.phone, isActive: false })}>
                    <Power /> {t('menu.activate')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [t, owners, offNow],
  )

  const chips: FilterChip[] = []
  if (state.search) chips.push({ key: 'search', label: `“${state.search}”`, onRemove: () => set({ search: '' }) })
  if (state.availability) {
    chips.push({
      key: 'availability',
      label: `${t('filters.availability')}: ${enumLabel('ExecutorAvailability', state.availability, lang)}`,
      onRemove: () => set({ availability: '' }),
    })
  }
  if (state.active) {
    chips.push({
      key: 'active',
      label: `${t('filters.active')}: ${enumLabel('ActiveFilter', state.active, lang)}`,
      onRemove: () => set({ active: '' }),
    })
  }

  const filtered = chips.length > 0
  const clear = () => reset(['tab'])

  return (
    <div className="space-y-3">
      <DataTable
        id="team.executors"
        columns={columns}
        query={executors}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={(page) => set({ page })}
        onPageSizeChange={(pageSize) => set({ pageSize })}
        getRowId={(e) => e.id}
        rowHref={(e) => `/team/${e.id}`}
        rowClassName={(e) => (!e.isActive ? 'bg-muted/30' : undefined)}
        filtered={filtered}
        onClearFilters={clear}
        emptyTitle={filtered ? undefined : t('technicians.empty')}
        toolbar={
          <>
            <SearchInput value={state.search} onChange={(search) => set({ search })} placeholder={t('filters.search')} className="sm:w-72" />
            <EnumFilter enumName="ExecutorAvailability" value={state.availability} onChange={(availability) => set({ availability })} label={t('filters.availability')} />
            <EnumFilter enumName="ActiveFilter" value={state.active} onChange={(active) => set({ active })} label={t('filters.active')} exclude={['All']} />
            <Button size="sm" className="ms-auto" onClick={() => setAdding(true)}>
              <UserPlus /> {t('technicians.add')}
            </Button>
          </>
        }
      />
      <FilterChips chips={chips} onClear={clear} />
      {!filtered && executors.data?.totalCount === 0 && <p className="text-center text-sm text-muted-foreground">{t('technicians.emptyHint')}</p>}

      <ExecutorDialog open={adding} onOpenChange={setAdding} />
      <ExecutorDialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} executor={editing} />
      <SkillsDialog executor={skills} onOpenChange={(o) => !o && setSkills(null)} />
      <AvailabilityDialog executor={availability} onOpenChange={(o) => !o && setAvailability(null)} />
      <ToggleActiveDialog target={toggle} onOpenChange={(o) => !o && setToggle(null)} />
    </div>
  )
}

