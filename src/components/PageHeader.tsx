import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useLang } from '@/hooks/useLang'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** Badges and meta shown next to / under the title. */
  meta?: ReactNode
  actions?: ReactNode
  back?: { to: string; label: string }
  className?: string
}

export function PageHeader({ title, description, meta, actions, back, className }: PageHeaderProps) {
  const { isRtl } = useLang()
  const BackIcon = isRtl ? ArrowRight : ArrowLeft
  return (
    <header className={cn('mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between', className)}>
      <div className="min-w-0">
        {back && (
          <Link to={back.to} className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <BackIcon className="size-3.5" />
            {back.label}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {meta}
        </div>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
