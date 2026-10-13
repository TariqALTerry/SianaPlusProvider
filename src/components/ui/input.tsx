import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const fieldBase =
  'w-full rounded-md border border-input bg-surface px-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, type = 'text', ...props },
  ref,
) {
  return <input ref={ref} type={type} className={cn(fieldBase, 'h-9 py-1', className)} {...props} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, rows = 3, ...props },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={cn(fieldBase, 'min-h-[4.5rem] py-2 leading-relaxed', className)} {...props} />
})

export interface NativeSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Renders an empty-value first option with this text. */
  placeholder?: string
}

/** Native select: accessible, keyboard-friendly, RTL-correct, and cheap for long lists. */
export const Select = forwardRef<HTMLSelectElement, NativeSelectProps>(function Select(
  { className, children, placeholder, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn(fieldBase, 'h-9 cursor-pointer py-1 pe-8', className)} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {children}
    </select>
  )
})
