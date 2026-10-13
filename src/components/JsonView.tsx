import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyValue } from '@/components/KeyValue'
import { parseJson, cn } from '@/lib/utils'

/** Pretty-prints a JSON string (`dynamicFieldsJson`, `metadataJson`, `optionsJson`). */
export function JsonView({ json, className, collapsible = false }: { json: string | null | undefined; className?: string; collapsible?: boolean }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(!collapsible)
  if (!json) return <span className="text-muted-foreground">—</span>
  const parsed = parseJson(json)
  const text = parsed === null ? json : JSON.stringify(parsed, null, 2)

  return (
    <div className={className}>
      {collapsible && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronDown className={cn('size-3.5 transition-transform', !open && '-rotate-90 rtl:rotate-90')} />
          {t('common.json')}
        </button>
      )}
      {open && (
        <pre dir="ltr" className="mt-1 max-h-72 overflow-auto rounded-md bg-muted p-3 text-start font-mono text-xs leading-relaxed">
          {text}
        </pre>
      )}
    </div>
  )
}

function humanizeKey(key: string): string {
  return key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^\w/, (c) => c.toUpperCase())
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? '✓' : '✗'
  if (Array.isArray(value)) return value.map(renderValue).join('، ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * Dynamic fields as label/value pairs. The customer app stores `{ key: value }`; when a key
 * matches a known field definition its label is used, otherwise the key is humanized.
 */
export function DynamicFieldsView({ json, labels }: { json: string | null | undefined; labels?: Record<string, string> }) {
  const parsed = parseJson<Record<string, unknown> | Array<{ key?: string; label?: string; value?: unknown }>>(json)
  if (!parsed) return json ? <JsonView json={json} /> : <span className="text-muted-foreground">—</span>

  const entries: Array<[string, unknown]> = Array.isArray(parsed)
    ? parsed.map((p, i) => [p.label ?? p.key ?? String(i + 1), p.value])
    : Object.entries(parsed)

  if (!entries.length) return <span className="text-muted-foreground">—</span>

  return (
    <div className="space-y-2">
      <KeyValue items={entries.map(([k, v]) => ({ label: labels?.[k] ?? humanizeKey(k), value: renderValue(v) }))} />
      <JsonView json={json} collapsible />
    </div>
  )
}
