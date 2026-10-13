import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface KeyValueItem {
  label: ReactNode
  value: ReactNode
  /** Spans the full row (long text). */
  wide?: boolean
  hidden?: boolean
}

/** Label/value grid for detail cards. Empty values render as an em dash. */
export function KeyValue({ items, columns = 2, className }: { items: KeyValueItem[]; columns?: 1 | 2 | 3; className?: string }) {
  const cols = columns === 1 ? 'sm:grid-cols-1' : columns === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'
  return (
    <dl className={cn('grid grid-cols-1 gap-x-6 gap-y-3', cols, className)}>
      {items
        .filter((i) => !i.hidden)
        .map((item, idx) => (
          <div key={idx} className={cn('min-w-0', item.wide && 'sm:col-span-full')}>
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="mt-0.5 break-words text-sm">
              {item.value === null || item.value === undefined || item.value === '' ? <span className="text-muted-foreground">—</span> : item.value}
            </dd>
          </div>
        ))}
    </dl>
  )
}
