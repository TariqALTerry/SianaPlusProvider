import { Check, type LucideIcon } from 'lucide-react'
import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface Choice<V extends string> {
  value: V
  title: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
}

interface ChoiceCardsProps<V extends string> {
  label: string
  value: V | null | undefined
  onChange: (value: V) => void
  choices: readonly Choice<V>[]
  columns?: 2 | 3
  disabled?: boolean
  invalid?: boolean
}

/** Big selectable cards with radio-group semantics (arrow keys move between them). */
export function ChoiceCards<V extends string>({ label, value, onChange, choices, columns = 2, disabled, invalid }: ChoiceCardsProps<V>) {
  const onKey = (e: KeyboardEvent, index: number) => {
    const rtl = document.documentElement.dir === 'rtl'
    const delta = { ArrowDown: 1, ArrowUp: -1, ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[e.key]
    if (!delta) return
    e.preventDefault()
    const next = choices[(index + delta + choices.length) % choices.length]!
    onChange(next.value)
    ;(e.currentTarget.parentElement?.children[(index + delta + choices.length) % choices.length] as HTMLElement | undefined)?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-invalid={invalid || undefined}
      className={cn('grid gap-3', columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}
    >
      {choices.map((c, i) => {
        const selected = c.value === value
        const Icon = c.icon
        return (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (!value && i === 0) ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(c.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              'relative flex items-start gap-3 rounded-xl border bg-surface p-4 text-start transition-colors disabled:opacity-60',
              selected ? 'border-primary bg-primary-soft/60 ring-1 ring-primary' : 'hover:border-primary/40 hover:bg-muted/50',
              invalid && !value && 'border-destructive',
            )}
          >
            {Icon && (
              <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                <Icon className="size-5" />
              </span>
            )}
            <span className="min-w-0 flex-1 space-y-0.5">
              <span className="block font-semibold">{c.title}</span>
              {c.hint && <span className="block text-xs leading-relaxed text-muted-foreground">{c.hint}</span>}
            </span>
            {selected && (
              <span className="absolute end-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3.5" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
