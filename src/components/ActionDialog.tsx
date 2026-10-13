import { AlertTriangle } from 'lucide-react'
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { InlineError } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface ActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  /** Restates what is being acted on: `SI-10053-2 · صيانة غسالة`. */
  target?: ReactNode
  /** "What will change" summary (e.g. `Pending → Approved`, an amount). */
  changes?: ReactNode
  confirmLabel?: ReactNode
  destructive?: boolean
  /** Two-step confirm for last-resort actions: first click arms, second submits. */
  twoStep?: boolean
  submitting?: boolean
  submitDisabled?: boolean
  error?: unknown
  onSubmit: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children?: ReactNode
}

/**
 * The one dialog shell for mutating actions (§4.4): target restated, changes summarized,
 * submit blocks double-submit, the server's error stays inside the dialog.
 */
export function ActionDialog({
  open,
  onOpenChange,
  title,
  description,
  target,
  changes,
  confirmLabel,
  destructive,
  twoStep,
  submitting,
  submitDisabled,
  error,
  onSubmit,
  size = 'md',
  children,
}: ActionDialogProps) {
  const { t } = useTranslation()
  const [armed, setArmed] = useState(false)
  // An error left over from a previous attempt (the mutation keeps it) must not greet the
  // user when the dialog is reopened: only errors that change while open are shown.
  const [staleError, setStaleError] = useState<unknown>(null)

  useEffect(() => {
    if (!open) setArmed(false)
    else setStaleError(error ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const visibleError = error && error !== staleError ? error : null

  const handle = (e: FormEvent) => {
    e.preventDefault()
    // The dialog is portalled, but React still bubbles submit to any page <form> around it.
    e.stopPropagation()
    if (submitting || submitDisabled) return
    if (twoStep && !armed) {
      setArmed(true)
      return
    }
    onSubmit()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent size={size} onInteractOutside={(e) => submitting && e.preventDefault()}>
        <form onSubmit={handle} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle className={cn(destructive && 'text-destructive')}>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <DialogBody className="space-y-4">
            {target && (
              <div className={cn('rounded-md border px-3 py-2 text-sm font-medium', destructive ? 'border-destructive/30 bg-destructive-soft' : 'bg-muted/50')}>
                {target}
              </div>
            )}
            {changes && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{t('common.whatWillChange')}</p>
                <div className="text-sm">{changes}</div>
              </div>
            )}
            {children}
            {twoStep && armed && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive-soft px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{t('dialogs.armedWarning')}</span>
              </div>
            )}
            <InlineError error={visibleError} />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t('actions.cancel')}
            </Button>
            <Button type="submit" variant={destructive ? 'destructive' : 'default'} loading={submitting} disabled={submitDisabled}>
              {twoStep && armed ? t('dialogs.confirmAgain') : confirmLabel ?? t('actions.confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export type ConfirmDialogProps = Omit<ActionDialogProps, 'children'>

export function ConfirmDialog(props: ConfirmDialogProps) {
  return <ActionDialog size="sm" {...props} />
}

export interface ReasonDialogProps extends Omit<ActionDialogProps, 'onSubmit' | 'children'> {
  onSubmit: (reason: string) => void
  /** Default true: the textarea must be filled. */
  required?: boolean
  label?: ReactNode
  placeholder?: string
  children?: ReactNode
}

/** An action that takes a reason / notes textarea (required by default). */
export function ReasonDialog({ onSubmit, required = true, label, placeholder, open, children, ...rest }: ReasonDialogProps) {
  const { t } = useTranslation()
  const id = useId()
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) setReason('')
  }, [open])

  const empty = reason.trim().length === 0

  return (
    <ActionDialog {...rest} open={open} submitDisabled={(required && empty) || rest.submitDisabled} onSubmit={() => onSubmit(reason.trim())}>
      {children}
      <Field label={label ?? t('common.reason')} htmlFor={id} required={required} optional={!required}>
        <Textarea
          id={id}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={placeholder ?? t('common.reasonPlaceholder')}
          rows={3}
          autoFocus
          maxLength={1000}
        />
      </Field>
    </ActionDialog>
  )
}
