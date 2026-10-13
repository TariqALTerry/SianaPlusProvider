import { Check, Copy } from 'lucide-react'
import { useState, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export function CopyButton({ value, className, label }: { value: string; className?: string; label?: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const copy = async (e: MouseEvent) => {
    // Copy buttons often sit inside clickable rows and links.
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // Clipboard can be blocked (insecure origin); nothing useful to do.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn('inline-flex shrink-0 items-center rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground', className)}
      aria-label={label ?? `${t('actions.copy')} ${value}`}
      title={copied ? t('actions.copied') : t('actions.copy')}
    >
      {copied ? <Check className="size-3.5 text-tone-success" /> : <Copy className="size-3.5" />}
    </button>
  )
}
