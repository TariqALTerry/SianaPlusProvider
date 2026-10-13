import type { MouseEvent, ReactNode } from 'react'
import { Link } from 'react-router'
import { CopyButton } from '@/components/CopyButton'
import { cn } from '@/lib/utils'

/** Detail routes for every entity a provider screen can reference. */
export const routes = {
  workItem: (id: string) => `/work/${id}`,
  marketplace: (id: string) => `/marketplace/${id}`,
  settlement: (id: string) => `/settlements/${id}`,
  dispute: (id: string) => `/disputes/${id}`,
  product: (id: string) => `/store?open=${id}`,
} as const

export type EntityKind = keyof typeof routes

interface EntityLinkProps {
  kind: EntityKind
  id: string | null | undefined
  /** Human number or name shown as the link text. */
  label: ReactNode
  /** Adds a one-click copy of this text (usually the human number). */
  copy?: string | null
  className?: string
  mono?: boolean
}

/**
 * A real link (middle-click / Ctrl-click open a new tab) with the human number as text.
 * Clicks don't bubble, so it works inside clickable table rows.
 */
export function EntityLink({ kind, id, label, copy, className, mono }: EntityLinkProps) {
  if (!id) return <span className={cn('text-muted-foreground', className)}>{label || '—'}</span>
  const stop = (e: MouseEvent) => e.stopPropagation()
  return (
    <span className="inline-flex max-w-full items-center gap-1">
      <Link
        to={routes[kind](id)}
        onClick={stop}
        className={cn('truncate font-medium text-primary hover:underline', mono && 'ltr-nums font-mono text-[0.8125rem]', className)}
      >
        {label || '—'}
      </Link>
      {copy && <CopyButton value={copy} />}
    </span>
  )
}

/** A human number (`SI-10053-2`) as plain copyable text, when there is nothing to link to. */
export function HumanNumber({ value, className }: { value: string | null | undefined; className?: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="ltr-nums font-mono text-[0.8125rem]">{value}</span>
      <CopyButton value={value} />
    </span>
  )
}
