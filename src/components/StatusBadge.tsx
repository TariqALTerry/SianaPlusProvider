import { Badge } from '@/components/ui/badge'
import { useLang } from '@/hooks/useLang'
import { enumLabel, enumTone, type EnumName, type Tone } from '@/i18n/enums'

interface StatusBadgeProps {
  enum: EnumName
  value: string | null | undefined
  /** Override the tone from the map (e.g. to grey out a row). */
  tone?: Tone
  className?: string
  dot?: boolean
}

/** Every enum on screen goes through here: label by language, colour by §13, raw fallback. */
export function StatusBadge({ enum: name, value, tone, className, dot = true }: StatusBadgeProps) {
  const { lang } = useLang()
  if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">—</span>
  return (
    <Badge tone={tone ?? enumTone(name, value)} dot={dot} className={className} title={value}>
      {enumLabel(name, value, lang)}
    </Badge>
  )
}

/** Plain-text enum label (no badge), for dense cells and selects. */
export function EnumText({ enum: name, value }: { enum: EnumName; value: string | null | undefined }) {
  const { lang } = useLang()
  return <>{enumLabel(name, value, lang)}</>
}
