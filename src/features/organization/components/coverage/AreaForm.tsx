import { AlertTriangle, Circle, Hexagon, MapPinned } from 'lucide-react'
import { useEffect, useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toApiError } from '@/api/http'
import { CityInput } from '@/components/CityInput'
import { InlineError } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useLang } from '@/hooks/useLang'
import { formatNumber } from '@/lib/format'
import { polygonAreaKm2, preparePolygon } from '../../geo'
import { clampRadiusKm, MAX_RADIUS_KM, MIN_RADIUS_KM, type AreaKind, type AreaLabels, type DraftGeometry } from '../../logic'

interface AreaFormProps {
  isNew: boolean
  kind: AreaKind
  geometry: DraftGeometry | null
  initial: AreaLabels
  submitting: boolean
  error: unknown
  onSubmit: (labels: AreaLabels) => void
  onCancel: () => void
  /** Typed radius for a circle (the keyboard alternative to dragging). */
  onRadiusChange: (km: number) => void
}

/** Server validation keys that belong to one field; everything else is shown under the form. */
const FIELD_OF: Record<string, keyof AreaLabels | 'radius'> = {
  CityRequired: 'city',
  CityTooLong: 'city',
  DistrictTooLong: 'district',
  CoverageNameTooLong: 'name',
  RadiusOutOfRange: 'radius',
}

/**
 * The save form after drawing / while editing. The drawn geometry stays on the map and is
 * never discarded on a server error.
 */
export function AreaForm({ isNew, kind, geometry, initial, submitting, error, onSubmit, onCancel, onRadiusChange }: AreaFormProps) {
  const { t } = useTranslation('organization')
  const { lang } = useLang()
  const id = useId()
  const [values, setValues] = useState<AreaLabels>(initial)
  const [tried, setTried] = useState(false)

  const radius = geometry?.kind === 'Circle' ? geometry.radiusKm : null
  const [radiusText, setRadiusText] = useState(radius != null ? String(clampRadiusKm(radius)) : '')
  // Follow the map when the circle is resized by dragging.
  useEffect(() => {
    if (radius == null) return
    setRadiusText((prev) => (Number(prev) === clampRadiusKm(radius) ? prev : String(clampRadiusKm(radius))))
  }, [radius])

  const server = toApiError(error ?? null)
  const errorField = error ? FIELD_OF[server.errorCode ?? ''] : undefined
  const fieldError = (f: keyof AreaLabels | 'radius') => (error && errorField === f ? server.message : undefined)

  const polygon = geometry?.kind === 'Polygon' ? preparePolygon(geometry.points) : null
  const shapeMissing = kind !== 'CityDistrict' && !geometry
  const blocked = !!polygon?.problem || shapeMissing
  const cityMissing = !values.city.trim()

  const typedRadius = Number(radiusText)
  const radiusInvalid = kind === 'Circle' && !(typedRadius > 0 && typedRadius <= MAX_RADIUS_KM)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setTried(true)
    if (submitting || blocked || cityMissing || radiusInvalid) return
    onSubmit(values)
  }

  const Icon = kind === 'Polygon' ? Hexagon : kind === 'Circle' ? Circle : MapPinned
  const title = !isNew ? t('coverage.form.edit') : kind === 'Polygon' ? t('coverage.form.newPolygon') : kind === 'Circle' ? t('coverage.form.newCircle') : t('coverage.form.newCity')

  return (
    <form onSubmit={submit} className="space-y-3" noValidate aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-primary" aria-hidden />
        {title}
      </h3>

      {kind === 'CityDistrict' && <p className="text-xs text-muted-foreground">{t('coverage.form.cityDistrictHint')}</p>}
      {kind !== 'CityDistrict' && <p className="text-xs text-muted-foreground">{t('coverage.editing')}</p>}

      {polygon && (
        <p className="tabular text-xs text-muted-foreground">
          {t('coverage.form.points', { count: polygon.points.length })} · {t('coverage.size', { km2: formatNumber(polygonAreaKm2(polygon.points), lang, 2) })}
        </p>
      )}
      {polygon?.simplified && <p className="text-xs text-tone-info">{t('coverage.form.simplified')}</p>}
      {polygon?.problem && (
        <p role="alert" className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {t(`coverage.problems.${polygon.problem}`)}
        </p>
      )}

      {kind === 'Circle' && (
        <Field
          label={t('coverage.form.radiusKm')}
          htmlFor={`${id}-radius`}
          required
          hint={t('coverage.form.radiusRange')}
          error={fieldError('radius') ?? (tried && radiusInvalid ? t('coverage.form.radiusRange') : undefined)}
        >
          <Input
            id={`${id}-radius`}
            type="number"
            inputMode="decimal"
            min={MIN_RADIUS_KM}
            max={MAX_RADIUS_KM}
            step={0.1}
            dir="ltr"
            className="w-32 text-start tabular"
            value={radiusText}
            aria-invalid={tried && radiusInvalid}
            onChange={(e) => {
              setRadiusText(e.target.value)
              const km = Number(e.target.value)
              if (km > 0 && km <= MAX_RADIUS_KM) onRadiusChange(km)
            }}
          />
        </Field>
      )}

      <Field label={t('coverage.form.name')} htmlFor={`${id}-name`} optional error={fieldError('name')}>
        <Input
          id={`${id}-name`}
          value={values.name}
          maxLength={100}
          placeholder={t('coverage.form.namePlaceholder')}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Field
          label={t('coverage.form.city')}
          htmlFor={`${id}-city`}
          required
          error={fieldError('city') ?? (tried && cityMissing ? t('coverage.form.cityRequired') : undefined)}
        >
          <CityInput
            id={`${id}-city`}
            value={values.city}
            onChange={(e) => setValues((v) => ({ ...v, city: e.target.value }))}
            aria-invalid={!!fieldError('city') || (tried && cityMissing)}
          />
        </Field>
        <Field label={t('coverage.form.district')} htmlFor={`${id}-district`} optional hint={kind === 'CityDistrict' ? t('coverage.form.districtHint') : undefined} error={fieldError('district')}>
          <Input id={`${id}-district`} value={values.district} maxLength={100} onChange={(e) => setValues((v) => ({ ...v, district: e.target.value }))} />
        </Field>
      </div>

      {!!error && !errorField && <InlineError error={error} />}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
          {t('coverage.form.cancel')}
        </Button>
        <Button type="submit" size="sm" loading={submitting} disabled={blocked}>
          {t('coverage.form.save')}
        </Button>
      </div>
    </form>
  )
}
