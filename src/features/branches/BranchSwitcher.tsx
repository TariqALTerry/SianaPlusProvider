import { Building, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/menu'
import { cn } from '@/lib/utils'
import { useBranchScope } from './scope'
import './i18n'

/**
 * The branch switcher in the top bar (phase 1 §4). Hidden while loading and for an organization with one branch and
 * nothing else to pick; a single linked branch shows as a label; several show a menu.
 */
export function BranchSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation('branches')
  const scope = useBranchScope()

  if (scope.mode === 'loading') return null
  if (scope.mode === 'none') {
    return <span className={cn('hidden rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground sm:inline', className)}>{t('switcher.none')}</span>
  }
  // One branch and no "all" choice worth showing.
  if (scope.mode === 'fixed' || (scope.mode === 'all' && scope.branches.length === 1)) {
    const only = scope.branches[0]!
    return (
      <span className={cn('inline-flex max-w-[11rem] items-center gap-1.5 truncate rounded-md px-2 py-1 text-sm', className)} title={only.name}>
        <Building className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate">{only.name}</span>
      </span>
    )
  }

  const label = scope.selected?.name ?? t('switcher.all')
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn('max-w-[13rem] gap-1.5', className)} aria-label={`${t('switcher.label')}: ${label}`}>
          <Building className="text-muted-foreground" aria-hidden />
          <span className="truncate">{label}</span>
          <ChevronDown className="text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel>{t('switcher.choose')}</DropdownMenuLabel>
        {scope.mode === 'all' && (
          <>
            <DropdownMenuCheckboxItem checked={!scope.selected} onCheckedChange={() => scope.select(null)}>
              {t('switcher.all')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
          </>
        )}
        {scope.branches.map((b) => (
          <DropdownMenuCheckboxItem key={b.id} checked={scope.selected?.id === b.id} onCheckedChange={() => scope.select(b.id)}>
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span className={cn('truncate', !b.isActive && 'text-muted-foreground')}>{b.name}</span>
              <bdi className="ltr-nums font-latin text-[0.6875rem] text-muted-foreground">{b.code}</bdi>
              {b.isMain && <span className="rounded bg-primary-soft px-1 text-[0.625rem] text-primary">{t('switcher.main')}</span>}
              {!b.isActive && <span className="rounded bg-muted px-1 text-[0.625rem] text-muted-foreground">{t('switcher.inactive')}</span>}
            </span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
