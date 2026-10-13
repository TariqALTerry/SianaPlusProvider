import { useQueryClient } from '@tanstack/react-query'
import { Circle, Hexagon, Locate, MapPin, MapPinned, Maximize2, Pencil, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBlocker } from 'react-router'
import { toApiError } from '@/api/http'
import { qk } from '@/api/keys'
import type { CoverageAreaRequest, CoverageAreaResponse } from '@/api/types'
import { ConfirmDialog } from '@/components/ActionDialog'
import { EmptyState } from '@/components/States'
import { EnumText } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useProvider } from '@/app/provider'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { organizationApi, organizationKeys } from '../../api'
import { areaSizeKm2, preparePolygon } from '../../geo'
import { areaGeometry, buildCoverageRequest, isLastActiveArea, type AreaKind, type AreaLabels, type DraftGeometry } from '../../logic'
import { AreaForm } from './AreaForm'
import { CoverageMap, type CoverageMapHandle } from './CoverageMap'

type Editor =
  | null
  | { phase: 'drawing'; kind: 'Polygon' | 'Circle' }
  | { phase: 'form'; kind: AreaKind; area: CoverageAreaResponse | null; initial: AreaLabels }

interface SaveVars {
  id: string | null
  body: CoverageAreaRequest
}

/**
 * مناطق التغطية map editor (§8.9). Loaded lazily by `CoverageTab`, so Leaflet, geoman and turf
 * live only in this chunk.
 */
export default function CoverageEditor({ areas }: { areas: CoverageAreaResponse[] }) {
  const { t } = useTranslation('organization')
  const { lang } = useLang()
  const { org } = useProvider()
  const queryClient = useQueryClient()
  const engine = useRef<CoverageMapHandle>(null)

  const [editor, setEditor] = useState<Editor>(null)
  const [draft, setDraft] = useState<DraftGeometry | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<CoverageAreaResponse | null>(null)
  const dirty = editor !== null

  const labelFor = useCallback((a: CoverageAreaResponse) => a.name || [a.district, a.city].filter(Boolean).join('، ') || t('coverage.unnamed'), [t])
  const blankLabels = (): AreaLabels => ({ name: '', city: org.city ?? '', district: '' })

  // ── Unsaved-drawing guard: leaving the page or the tab, or closing the window ──
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search),
  )
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm(t('coverage.unsaved'))) blocker.proceed()
    else blocker.reset()
  }, [blocker, t])
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  // ── Mutations ─────────────────────────────────────────────────────────────
  const refetchIfGone = (error: unknown) => {
    if (toApiError(error).errorCode === 'CoverageAreaNotFound') void queryClient.invalidateQueries({ queryKey: organizationKeys.coverage })
  }

  const save = useAction<SaveVars, CoverageAreaResponse>({
    mutationFn: ({ id, body }) => (id ? organizationApi.updateCoverage(id, body) : organizationApi.addCoverage(body)),
    invalidate: [qk.organization],
    success: t('coverage.saved'),
  })

  const remove = useAction<string, string>({
    mutationFn: organizationApi.deleteCoverage,
    invalidate: [qk.organization],
    success: t('coverage.deleted'),
    onSuccess: (_r, id) => {
      setDeleting(null)
      if (selectedId === id) setSelectedId(null)
    },
  })

  // ── Editor flow ───────────────────────────────────────────────────────────
  const resetEditor = useCallback(() => {
    engine.current?.cancelDraw()
    engine.current?.clearDraft()
    setEditor(null)
    setDraft(null)
    save.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const confirmDiscard = () => (dirty ? window.confirm(t('coverage.unsaved')) : true)

  const startDraw = (kind: AreaKind) => {
    if (editor && !confirmDiscard()) return
    resetEditor()
    setSelectedId(null)
    if (kind === 'CityDistrict') setEditor({ phase: 'form', kind, area: null, initial: blankLabels() })
    else {
      setEditor({ phase: 'drawing', kind })
      engine.current?.startDraw(kind)
    }
  }

  const startEdit = (area: CoverageAreaResponse) => {
    if (editor && !confirmDiscard()) return
    resetEditor()
    setSelectedId(area.id)
    const geometry = areaGeometry(area)
    if (geometry) {
      engine.current?.editDraft(geometry)
      engine.current?.focusArea(area.id)
    }
    setEditor({
      phase: 'form',
      kind: geometry ? geometry.kind : 'CityDistrict',
      area,
      initial: { name: area.name ?? '', city: area.city, district: area.district ?? '' },
    })
  }

  const onDrawFinished = (geometry: DraftGeometry) => {
    engine.current?.editDraft(geometry)
    setEditor({ phase: 'form', kind: geometry.kind, area: null, initial: blankLabels() })
  }

  const onDrawCancelled = () => setEditor((e) => (e?.phase === 'drawing' ? null : e))

  const onRadiusChange = (km: number) => {
    if (draft?.kind === 'Circle') engine.current?.editDraft({ ...draft, radiusKm: km })
  }

  const submit = (labels: AreaLabels) => {
    if (editor?.phase !== 'form') return
    const geometry: DraftGeometry | null =
      draft?.kind === 'Polygon' ? { kind: 'Polygon', points: preparePolygon(draft.points).points } : draft
    const pin = editor.area ? { latitude: editor.area.latitude, longitude: editor.area.longitude } : null
    const body = buildCoverageRequest(editor.kind, labels, geometry, pin)
    save.mutate(
      { id: editor.area?.id ?? null, body },
      {
        onSuccess: (saved) => {
          engine.current?.clearDraft()
          setEditor(null)
          setDraft(null)
          setSelectedId(saved.id)
        },
        onError: refetchIfGone,
      },
    )
  }

  const selectArea = (id: string) => {
    if (editor) return
    setSelectedId(id)
    engine.current?.focusArea(id)
  }

  const fallbackCenter: [number, number] | null =
    org.baseLatitude != null && org.baseLongitude != null ? [org.baseLatitude, org.baseLongitude] : null
  const hasGeometry = areas.some((a) => areaGeometry(a))

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      {/* Map column */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={editor?.kind === 'Polygon' ? 'default' : 'outline'} onClick={() => startDraw('Polygon')} disabled={save.isPending}>
            <Hexagon /> {t('coverage.drawPolygon')}
          </Button>
          <Button size="sm" variant={editor?.kind === 'Circle' ? 'default' : 'outline'} onClick={() => startDraw('Circle')} disabled={save.isPending}>
            <Circle /> {t('coverage.drawCircle')}
          </Button>
          <Button size="sm" variant={editor?.kind === 'CityDistrict' ? 'default' : 'outline'} onClick={() => startDraw('CityDistrict')} disabled={save.isPending}>
            <MapPinned /> {t('coverage.addCity')}
          </Button>
          {hasGeometry && (
            <Button size="sm" variant="ghost" className="ms-auto" onClick={() => engine.current?.fitAll()}>
              <Maximize2 /> {t('coverage.fitAll')}
            </Button>
          )}
        </div>

        {editor?.phase === 'drawing' && (
          <div role="status" className="flex items-center justify-between gap-2 rounded-md border border-tone-info/30 bg-tone-info-soft px-3 py-2 text-sm text-tone-info">
            <span>{editor.kind === 'Polygon' ? t('coverage.drawingPolygon') : t('coverage.drawingCircle')}</span>
            <Button size="xs" variant="ghost" onClick={resetEditor}>
              <X /> {t('coverage.cancelDrawing')}
            </Button>
          </div>
        )}

        <div className="relative isolate overflow-hidden rounded-lg border">
          <CoverageMap
            ref={engine}
            areas={areas}
            selectedId={selectedId}
            hiddenId={editor?.phase === 'form' ? (editor.area?.id ?? null) : null}
            fallbackCenter={fallbackCenter}
            labelFor={labelFor}
            onAreaClick={selectArea}
            onDraftChange={setDraft}
            onDrawFinished={onDrawFinished}
            onDrawCancelled={onDrawCancelled}
            className="h-[22rem] w-full sm:h-[28rem] lg:h-[32rem]"
          />
        </div>
      </div>

      {/* Side panel: the form while editing, otherwise the list */}
      <aside className="rounded-lg border bg-surface p-3 lg:max-h-[36rem] lg:overflow-y-auto">
        {editor?.phase === 'form' ? (
          <AreaForm
            key={editor.area?.id ?? `new-${editor.kind}`}
            isNew={!editor.area}
            kind={editor.kind}
            geometry={editor.kind === 'CityDistrict' ? null : draft}
            initial={editor.initial}
            submitting={save.isPending}
            error={save.error}
            onSubmit={submit}
            onCancel={resetEditor}
            onRadiusChange={onRadiusChange}
          />
        ) : (
          <div className="space-y-2">
            <h3 className="flex items-center justify-between text-sm font-semibold">
              {t('coverage.areas')}
              <span className="tabular text-xs font-normal text-muted-foreground">{formatNumber(areas.length, lang)}</span>
            </h3>
            {areas.length === 0 ? (
              <EmptyState icon={<MapPin className="size-5" />} title={t('coverage.empty')} description={t('coverage.emptyHint')} className="py-8" />
            ) : (
              <ul className="space-y-2">
                {areas.map((a) => (
                  <AreaRow
                    key={a.id}
                    area={a}
                    label={labelFor(a)}
                    selected={a.id === selectedId}
                    onSelect={() => selectArea(a.id)}
                    onEdit={() => startEdit(a)}
                    onDelete={() => setDeleting(a)}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </aside>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t('coverage.deleteTitle')}
        description={t('coverage.deleteText')}
        target={deleting ? labelFor(deleting) : null}
        changes={deleting && isLastActiveArea(areas, deleting.id) ? <span className="text-tone-waiting">{t('coverage.lastActive')}</span> : undefined}
        confirmLabel={t('coverage.delete')}
        destructive
        submitting={remove.isPending}
        error={remove.error}
        onSubmit={() => deleting && remove.mutate(deleting.id, { onError: refetchIfGone })}
      />
    </div>
  )
}

function AreaRow({
  area,
  label,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: {
  area: CoverageAreaResponse
  label: string
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation('organization')
  const { lang } = useLang()
  const size = areaSizeKm2(area)
  const hasGeometry = !!areaGeometry(area)

  return (
    <li className={cn('rounded-md border p-2.5 transition-colors', selected ? 'border-primary bg-primary-soft/40' : 'bg-surface')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-medium">{label}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">
              <EnumText enum="CoverageShape" value={area.shape} />
            </Badge>
            <Badge tone={area.isActive ? 'success' : 'muted'} dot title={area.isActive ? undefined : t('coverage.inactiveHint')}>
              {area.isActive ? t('coverage.active') : t('coverage.inactive')}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {area.city}
            {' · '}
            {area.district ?? t('coverage.wholeCity')}
            {area.shape === 'Circle' && area.radiusKm ? ` · ${t('coverage.radius', { km: formatNumber(area.radiusKm, lang, 1) })}` : ''}
            {area.shape === 'Polygon' && size != null ? ` · ${t('coverage.size', { km2: formatNumber(size, lang, 1) })}` : ''}
          </p>
          {!area.isActive && <p className="text-xs text-muted-foreground">{t('coverage.inactiveHint')}</p>}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {hasGeometry && (
          <Button size="xs" variant="ghost" onClick={onSelect}>
            <Locate /> {t('coverage.showOnMap')}
          </Button>
        )}
        <Button size="xs" variant="ghost" onClick={onEdit}>
          <Pencil /> {t('coverage.edit')}
        </Button>
        <Button size="xs" variant="ghost" className="text-destructive hover:bg-destructive-soft" onClick={onDelete}>
          <Trash2 /> {t('coverage.delete')}
        </Button>
      </div>
    </li>
  )
}
