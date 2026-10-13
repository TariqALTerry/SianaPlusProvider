import * as LabelPrimitive from '@radix-ui/react-label'
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export const Label = forwardRef<HTMLLabelElement, ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(function Label(
  { className, ...props },
  ref,
) {
  return <LabelPrimitive.Root ref={ref} className={cn('text-sm font-medium leading-none', className)} {...props} />
})

interface FieldProps {
  label?: ReactNode
  htmlFor?: string
  required?: boolean
  optional?: boolean
  hint?: ReactNode
  error?: string
  className?: string
  children: ReactNode
}

/** Label + control + hint/error — the one form row used everywhere. */
export function Field({ label, htmlFor, required, optional, hint, error, className, children }: FieldProps) {
  const { t } = useTranslation()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor} className="flex items-center gap-1">
          {label}
          {required && <span className="text-destructive" aria-hidden>*</span>}
          {optional && <span className="text-xs font-normal text-muted-foreground">({t('common.optional')})</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
