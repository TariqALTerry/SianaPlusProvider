import { AlertTriangle, Check, CheckCircle2, Info, UserPlus } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { LookupResponse } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useLang } from '@/hooks/useLang'
import { formatNumber } from '@/lib/format'
import { cn, ratio } from '@/lib/utils'
import type { SkillOption } from '../utils'
import '../i18n'

/** `activeJobs / maxConcurrentJobs` with a thin bar; full turns red, ¾ turns amber. */
export function LoadBar({ active, max, className }: { active: number; max: number; className?: string }) {
  const { t } = useTranslation('team')
  const { lang } = useLang()
  const pct = Math.min(100, Math.round(ratio(active, max) * 100))
  const full = max > 0 && active >= max
  return (
    <div className={cn('inline-flex min-w-[5.5rem] flex-col gap-1', className)} title={t('loadLabel', { active, max })}>
      <span className={cn('tabular text-xs', full && 'font-medium text-tone-danger')}>
        {formatNumber(active, lang)} / {formatNumber(max, lang)}
      </span>
      <span
        role="meter"
        aria-label={t('loadLabel', { active, max })}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={active}
        className="block h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <span
          className={cn('block h-full rounded-full', full ? 'bg-tone-danger' : pct >= 75 ? 'bg-tone-attention' : 'bg-tone-success')}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  )
}

export function ActiveBadge({ active }: { active: boolean }) {
  const { t } = useTranslation('team')
  return (
    <Badge tone={active ? 'success' : 'muted'} dot>
      {active ? t('active') : t('inactive')}
    </Badge>
  )
}

export function OwnerBadge() {
  const { t } = useTranslation('team')
  return (
    <Badge tone="active" className="text-[0.6875rem]">
      {t('owner')}
    </Badge>
  )
}

/** Read-only skill chips for a cell: the first `limit`, then "+N" (all names in the tooltip). */
export function SkillChips({ skills, limit = 3 }: { skills: readonly LookupResponse[]; limit?: number }) {
  const { t } = useTranslation('team')
  const { pick } = useLang()
  if (!skills.length) return <span className="text-xs text-muted-foreground">{t('noSkills')}</span>
  const shown = skills.slice(0, limit)
  const rest = skills.length - shown.length
  return (
    <span className="inline-flex flex-wrap justify-end gap-1 md:justify-start" title={skills.map((s) => pick(s.nameAr, s.nameEn)).join('، ')}>
      {shown.map((s) => (
        <Badge key={s.id} tone="neutral">
          {pick(s.nameAr, s.nameEn)}
        </Badge>
      ))}
      {rest > 0 && <Badge tone="muted">{t('moreSkills', { count: rest })}</Badge>}
    </span>
  )
}

/** Toggle chips for choosing skills (`role="checkbox"` buttons: Tab + Space work). */
export function SkillPicker({
  options,
  selected,
  onChange,
  labelledBy,
  invalid,
  disabled,
}: {
  options: readonly SkillOption[]
  selected: readonly string[]
  onChange: (ids: string[]) => void
  labelledBy?: string
  invalid?: boolean
  disabled?: boolean
}) {
  const { t } = useTranslation('team')
  const { pick } = useLang()
  const set = new Set(selected)
  // Compose toggles from the latest selection, so two fast toggles before a re-render both count.
  const latest = useRef(selected)
  latest.current = selected
  const toggle = (id: string) => {
    const next = new Set(latest.current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    const ordered = options.filter((o) => next.has(o.id)).map((o) => o.id)
    latest.current = ordered
    onChange(ordered)
  }
  return (
    <div role="group" aria-labelledby={labelledBy} className={cn('flex flex-wrap gap-1.5 rounded-md', invalid && 'ring-1 ring-destructive ring-offset-2 ring-offset-surface')}>
      {options.map((o) => {
        const on = set.has(o.id)
        return (
          <button
            key={o.id}
            type="button"
            role="checkbox"
            aria-checked={on}
            disabled={disabled || (o.outside && !on)}
            onClick={() => toggle(o.id)}
            className={cn(
              'inline-flex min-h-8 items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
              on ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-surface hover:bg-muted',
              on && o.outside && 'border-destructive bg-destructive-soft text-destructive',
            )}
          >
            {on && <Check className="size-3" aria-hidden />}
            {pick(o.nameAr, o.nameEn)}
            {o.outside && <span className="opacity-80">({t('form.outside')})</span>}
          </button>
        )
      })}
    </div>
  )
}

/** The org has no capabilities: skills cannot be chosen until it does (§8.7). */
export function NoCapabilitiesHint() {
  const { t } = useTranslation('team')
  return (
    <div className="space-y-2 rounded-md border border-dashed bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
      <p className="flex items-start gap-2">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>{t('form.noOrgCapabilities')}</span>
      </p>
      <Link to="/organization?tab=capabilities" className="ms-6 inline-flex text-sm font-medium text-primary hover:underline">
        {t('form.openCapabilities')}
      </Link>
    </div>
  )
}

export function Hint({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'attention' }) {
  const Icon = tone === 'attention' ? AlertTriangle : Info
  return (
    <p
      role={tone === 'attention' ? 'note' : undefined}
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2 text-xs',
        tone === 'attention' ? 'border-tone-attention/40 bg-tone-attention-soft text-tone-attention' : 'border-dashed bg-muted/40 text-muted-foreground',
      )}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

/** After an account is created: who can now sign in, where, and with which number. */
export function CreatedDialog({
  open,
  onOpenChange,
  title,
  message,
  onAnother,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  onAnother: () => void
}) {
  const { t } = useTranslation('team')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div role="status" className="flex items-start gap-2 rounded-md border border-tone-success/40 bg-tone-success-soft px-3 py-2.5 text-sm text-tone-success">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p className="flex-1 font-medium">{message}</p>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onAnother}>
            <UserPlus /> {t('add.another')}
          </Button>
          <Button onClick={() => onOpenChange(false)} autoFocus>
            {t('common:actions.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
