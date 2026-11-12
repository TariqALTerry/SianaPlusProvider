import { Crosshair, ExternalLink } from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toApiError } from '@/api/http'
import type { StoreWarehouseRequest, StoreWarehouseResponse } from '@/api/types'
import { ActionDialog } from '@/components/ActionDialog'
import { CityInput } from '@/components/CityInput'
import { LazyPointPicker } from '@/components/map/LazyMap'
import { useErrorMessage } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/checkbox'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useProvider } from '@/app/provider'
import { useAction } from '@/hooks/useAction'
import { storeWarehousesApi, warehouseActionInvalidation } from '../api'
import {
  EMPTY_WAREHOUSE,
  googleMapsUrl,
  parseCoordinates,
  validateWarehouse,
  WAREHOUSE_LIMITS,
  warehouseDraft,
  warehouseFieldForError,
  warehouseRequest,
  type WarehouseDraft,
  type WarehouseField,
} from '../warehouses'
import '../i18n'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-lg border p-3">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  )
}

const coordsText = (lat: number | null, lng: number | null) => (lat !== null && lng !== null ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : '')

/**
 * Add or edit a store warehouse (2026-11-12): a full replace of `StoreWarehouseRequest`. The location is required: it is
 * where the courier picks the products up. Picked on the same map as a branch, or pasted as coordinates.
 */
export function WarehouseDialog({ open, onOpenChange, warehouse }: { open: boolean; onOpenChange: (open: boolean) => void; warehouse?: StoreWarehouseResponse | null }) {
  const { t } = useTranslation('store')
  const { org } = useProvider()
  const uid = useId()
  const id = (k: string) => `${uid}-${k}`
  const [draft, setDraft] = useState<WarehouseDraft>(EMPTY_WAREHOUSE)
  const [coords, setCoords] = useState('')
  const [tried, setTried] = useState(false)
  const serverMessage = useErrorMessage()

  const save = useAction<StoreWarehouseRequest, StoreWarehouseResponse>({
    mutationFn: (body) => (warehouse ? storeWarehousesApi.update(warehouse.id, body) : storeWarehousesApi.create(body)),
    invalidate: warehouseActionInvalidation,
    success: warehouse ? t('warehouses.form.saved') : t('warehouses.form.created'),
    onSuccess: () => onOpenChange(false),
  })
  const { reset } = save

  useEffect(() => {
    if (!open) return
    const d = warehouse ? warehouseDraft(warehouse) : EMPTY_WAREHOUSE
    setDraft(d)
    setCoords(coordsText(d.latitude, d.longitude))
    setTried(false)
    reset()
  }, [open, warehouse, reset])

  const errors = validateWarehouse(draft)
  const serverField = warehouseFieldForError(save.error ? toApiError(save.error).errorCode : null)
  const show = (k: WarehouseField): string | undefined =>
    serverField === k ? serverMessage(save.error) : tried && errors[k] ? t(`warehouses.errors.${errors[k]}`) : undefined
  const patch = (p: Partial<WarehouseDraft>) => {
    setDraft((d) => ({ ...d, ...p }))
    if (serverField) reset()
  }
  const setPoint = (lat: number, lng: number) => {
    patch({ latitude: lat, longitude: lng })
    setCoords(coordsText(lat, lng))
  }

  const coordsParsed = coords.trim() ? parseCoordinates(coords) : null
  const coordsInvalid = coords.trim() !== '' && !coordsParsed
  const locate = () => navigator.geolocation?.getCurrentPosition((pos) => setPoint(pos.coords.latitude, pos.coords.longitude), undefined, { timeout: 10_000 })
  const fallback = org.baseLatitude !== null && org.baseLongitude !== null ? { lat: org.baseLatitude, lng: org.baseLongitude } : null
  const hasPoint = draft.latitude !== null && draft.longitude !== null

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={warehouse ? t('warehouses.form.editTitle') : t('warehouses.form.createTitle')}
      target={warehouse ? warehouse.name : undefined}
      confirmLabel={warehouse ? t('warehouses.form.save') : t('warehouses.form.create')}
      submitting={save.isPending}
      error={serverField ? null : save.error}
      onSubmit={() => {
        setTried(true)
        if (Object.keys(errors).length === 0) save.mutate(warehouseRequest(draft))
      }}
    >
      <Section title={t('warehouses.form.basics')}>
        <Field label={t('warehouses.form.name')} htmlFor={id('name')} required error={show('name')}>
          <Input id={id('name')} value={draft.name} maxLength={WAREHOUSE_LIMITS.name} onChange={(e) => patch({ name: e.target.value })} aria-invalid={!!show('name') || undefined} autoFocus />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('warehouses.form.city')} htmlFor={id('city')} required error={show('city')}>
            <CityInput id={id('city')} value={draft.city} maxLength={WAREHOUSE_LIMITS.city} onChange={(e) => patch({ city: e.target.value })} aria-invalid={!!show('city') || undefined} />
          </Field>
          <Field label={t('warehouses.form.district')} htmlFor={id('district')} optional error={show('district')}>
            <Input id={id('district')} value={draft.district} maxLength={WAREHOUSE_LIMITS.district} onChange={(e) => patch({ district: e.target.value })} />
          </Field>
        </div>
        <Field label={t('warehouses.form.addressLine')} htmlFor={id('address')} optional error={show('addressLine')}>
          <Input id={id('address')} value={draft.addressLine} maxLength={WAREHOUSE_LIMITS.addressLine} onChange={(e) => patch({ addressLine: e.target.value })} />
        </Field>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">
                {t('warehouses.form.location')} <span className="text-destructive">*</span>
              </p>
              <p className="text-xs text-muted-foreground">{t('warehouses.form.locationHint')}</p>
            </div>
            <div className="flex gap-1">
              {'geolocation' in navigator && (
                <Button size="xs" variant="outline" onClick={locate}>
                  <Crosshair /> {t('warehouses.form.myLocation')}
                </Button>
              )}
              {hasPoint && (
                <Button asChild size="xs" variant="ghost">
                  <a href={googleMapsUrl(draft.latitude!, draft.longitude!)} target="_blank" rel="noreferrer">
                    <ExternalLink /> {t('warehouses.openMap')}
                  </a>
                </Button>
              )}
            </div>
          </div>
          {open && <LazyPointPicker lat={draft.latitude} lng={draft.longitude} fallback={fallback} onPick={(p) => setPoint(p.lat, p.lng)} />}
          <Field
            label={t('warehouses.form.coordinates')}
            htmlFor={id('coords')}
            error={show('location') ?? (coordsInvalid ? t('warehouses.form.coordinatesInvalid') : undefined)}
            hint={hasPoint ? undefined : t('warehouses.form.noLocation')}
          >
            <Input
              id={id('coords')}
              dir="ltr"
              inputMode="decimal"
              className="ltr-nums font-latin"
              placeholder={t('warehouses.form.coordinatesPlaceholder')}
              value={coords}
              aria-invalid={!!show('location') || coordsInvalid || undefined}
              onChange={(e) => {
                setCoords(e.target.value)
                const point = parseCoordinates(e.target.value)
                if (point) patch({ latitude: point.lat, longitude: point.lng })
                else if (!e.target.value.trim()) patch({ latitude: null, longitude: null })
              }}
            />
          </Field>
        </div>
      </Section>

      <Section title={t('warehouses.form.contact')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('warehouses.form.contactName')} htmlFor={id('contact')} optional error={show('contactName')}>
            <Input id={id('contact')} value={draft.contactName} maxLength={WAREHOUSE_LIMITS.contactName} onChange={(e) => patch({ contactName: e.target.value })} />
          </Field>
          <Field label={t('warehouses.form.contactPhone')} htmlFor={id('phone')} optional error={show('contactPhone')}>
            <Input
              id={id('phone')}
              type="tel"
              dir="ltr"
              className="font-latin"
              value={draft.contactPhone}
              maxLength={WAREHOUSE_LIMITS.contactPhone}
              onChange={(e) => patch({ contactPhone: e.target.value })}
            />
          </Field>
        </div>
        <Field label={t('warehouses.form.notes')} htmlFor={id('notes')} optional error={show('notes')}>
          <Textarea
            id={id('notes')}
            rows={2}
            dir="auto"
            placeholder={t('warehouses.form.notesPlaceholder')}
            value={draft.notes}
            maxLength={WAREHOUSE_LIMITS.notes}
            onChange={(e) => patch({ notes: e.target.value })}
          />
        </Field>
      </Section>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <label htmlFor={id('active')} className="cursor-pointer text-sm font-medium">
            {t('warehouses.form.isActive')}
          </label>
          <p className="text-xs leading-relaxed text-muted-foreground">{t('warehouses.form.isActiveHint')}</p>
        </div>
        <Switch id={id('active')} checked={draft.isActive} onCheckedChange={(isActive) => patch({ isActive })} className="mt-0.5" />
      </div>
    </ActionDialog>
  )
}
