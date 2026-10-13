import type { HTMLAttributes } from 'react'
import type { Tone } from '@/i18n/enums'
import { cn } from '@/lib/utils'

const toneClass: Record<Tone, string> = {
  neutral: 'bg-tone-neutral-soft text-tone-neutral',
  info: 'bg-tone-info-soft text-tone-info',
  waiting: 'bg-tone-waiting-soft text-tone-waiting',
  active: 'bg-tone-active-soft text-tone-active',
  attention: 'bg-tone-attention-soft text-tone-attention',
  success: 'bg-tone-success-soft text-tone-success',
  danger: 'bg-tone-danger-soft text-tone-danger',
  muted: 'bg-tone-muted-soft text-tone-muted',
}

export const toneDot: Record<Tone, string> = {
  neutral: 'bg-tone-neutral',
  info: 'bg-tone-info',
  waiting: 'bg-tone-waiting',
  active: 'bg-tone-active',
  attention: 'bg-tone-attention',
  success: 'bg-tone-success',
  danger: 'bg-tone-danger',
  muted: 'bg-tone-muted',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
  dot?: boolean
}

export function Badge({ tone = 'neutral', dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
        toneClass[tone],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn('size-1.5 shrink-0 rounded-full', toneDot[tone])} aria-hidden />}
      <span className="truncate">{children}</span>
    </span>
  )
}
