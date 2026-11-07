import { Check } from 'lucide-react'
import { useLang } from '@/hooks/useLang'
import { enumLabel, type EnumName } from '@/i18n/enums'
import { cn } from '@/lib/utils'

interface FlagChipsProps<V extends string> {
  enum: EnumName
  values: readonly V[]
  selected: readonly V[]
  onToggle: (value: V) => void
  label: string
  disabled?: boolean
}

/** Large toggle chips for a multi-select enum (accessories, condition flags): easy to hit on a counter tablet. */
export function FlagChips<V extends string>({ enum: name, values, selected, onToggle, label, disabled }: FlagChipsProps<V>) {
  const { lang } = useLang()
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {values.map((v) => {
        const on = selected.includes(v)
        return (
          <button
            key={v}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onToggle(v)}
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors disabled:opacity-50',
              on ? 'border-primary bg-primary-soft text-primary' : 'bg-surface hover:bg-muted',
            )}
          >
            {on && <Check className="size-4" aria-hidden />}
            {enumLabel(name, v, lang)}
          </button>
        )
      })}
    </div>
  )
}

/** Single choice as large buttons (powers on, payment method, estimate type). */
export function ChoiceChips<V extends string>({
  enum: name,
  values,
  value,
  onChange,
  label,
  allowNone,
  noneLabel,
}: {
  enum: EnumName
  values: readonly V[]
  value: V | null
  onChange: (value: V | null) => void
  label: string
  allowNone?: boolean
  noneLabel?: string
}) {
  const { lang } = useLang()
  const options: Array<V | null> = allowNone ? [null, ...values] : [...values]
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((v) => {
        const on = v === value
        return (
          <button
            key={v ?? 'none'}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(v)}
            className={cn(
              'inline-flex h-11 items-center rounded-lg border px-4 text-sm font-medium transition-colors',
              on ? 'border-primary bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted',
            )}
          >
            {v === null ? noneLabel : enumLabel(name, v, lang)}
          </button>
        )
      })}
    </div>
  )
}
