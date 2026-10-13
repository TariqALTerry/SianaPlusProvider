import { forwardRef, type InputHTMLAttributes } from 'react'
import { SAUDI_PREFIX, localMobileDigits } from '@/lib/phone'
import { cn } from '@/lib/utils'

interface PhoneFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** The 9 local digits (`5XXXXXXXX`). */
  value: string
  onChange: (localDigits: string) => void
}

/**
 * Saudi mobile input (§4): a fixed `+966` prefix and 9 digits, LTR-isolated inside RTL forms.
 * Pasting any spelling (`05…`, `+9665…`, Arabic-Indic digits) keeps just the local digits.
 * Submit `toSaudiE164(value)`.
 */
export const PhoneField = forwardRef<HTMLInputElement, PhoneFieldProps>(function PhoneField(
  { value, onChange, className, ...props },
  ref,
) {
  return (
    <div
      dir="ltr"
      className={cn(
        'flex h-10 w-full items-center overflow-hidden rounded-md border border-input bg-surface shadow-sm transition-colors focus-within:border-ring has-[[aria-invalid=true]]:border-destructive',
        className,
      )}
    >
      <span className="flex h-full items-center border-e bg-muted px-3 font-latin text-sm text-muted-foreground tabular" aria-hidden>
        {SAUDI_PREFIX}
      </span>
      <input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="5XXXXXXXX"
        value={value}
        onChange={(e) => onChange(localMobileDigits(e.target.value))}
        className="h-full min-w-0 flex-1 bg-transparent px-3 font-latin text-base tracking-wider tabular outline-none placeholder:text-muted-foreground/60 focus-visible:shadow-none"
        {...props}
      />
    </div>
  )
})
