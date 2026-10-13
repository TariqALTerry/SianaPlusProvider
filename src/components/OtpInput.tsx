import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface OtpInputProps {
  length: number
  value: string
  onChange: (code: string) => void
  /** Called once all boxes are filled. */
  onComplete?: (code: string) => void
  invalid?: boolean
  disabled?: boolean
  autoFocus?: boolean
  label: string
}

const toLatin = (s: string) =>
  s.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))

/**
 * One box per digit, always LTR. Typing advances, Backspace goes back, a pasted or SMS-autofilled
 * code fills every box. `value` is the whole code.
 */
export function OtpInput({ length, value, onChange, onComplete, invalid, disabled, autoFocus, label }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus()
  }, [autoFocus])

  // Cleared from outside (e.g. after OtpInvalid): back to the first box.
  useEffect(() => {
    if (value === '' && !disabled) refs.current[0]?.focus()
  }, [value, disabled])

  const set = (next: string) => {
    const code = toLatin(next).replace(/\D/g, '').slice(0, length)
    onChange(code)
    if (code.length === length) onComplete?.(code)
    return code
  }

  const onInput = (index: number, raw: string) => {
    const typed = toLatin(raw).replace(/\D/g, '')
    if (!typed) return
    // Autofill drops the whole code into one box.
    if (typed.length > 1) {
      const code = set(typed)
      refs.current[Math.min(code.length, length - 1)]?.focus()
      return
    }
    const chars = digits.slice()
    chars[index] = typed
    set(chars.join(''))
    refs.current[index + 1]?.focus()
  }

  const onKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const chars = digits.slice()
      if (chars[index]) chars[index] = ''
      else if (index > 0) {
        chars[index - 1] = ''
        refs.current[index - 1]?.focus()
      }
      onChange(chars.join('').slice(0, length))
    } else if (e.key === 'ArrowLeft') refs.current[index - 1]?.focus()
    else if (e.key === 'ArrowRight') refs.current[index + 1]?.focus()
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const code = set(e.clipboardData.getData('text'))
    refs.current[Math.min(code.length, length - 1)]?.focus()
  }

  return (
    <div dir="ltr" role="group" aria-label={label} className="flex justify-center gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          value={d}
          onChange={(e) => onInput(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          disabled={disabled}
          aria-label={`${label} ${i + 1}`}
          aria-invalid={invalid || undefined}
          className={cn(
            'size-12 rounded-md border border-input bg-surface text-center font-latin text-xl font-semibold tabular shadow-sm transition-colors focus-visible:border-ring disabled:opacity-50',
            d && 'border-primary/60',
            invalid && 'border-destructive',
          )}
        />
      ))}
    </div>
  )
}
