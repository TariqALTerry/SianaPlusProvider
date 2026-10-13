// Order matters: the global `L` must exist before geoman evaluates.
import L from './leafletGlobal'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import 'leaflet/dist/leaflet.css'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { CoverageAreaResponse } from '@/api/types'
import { toneColor } from '@/components/map/LazyMap'
import { RIYADH, RIYADH_ZOOM } from '../../geo'
import type { DraftGeometry } from '../../logic'

/**
 * Leaflet + geoman for the organization's own coverage, driven imperatively (adapted from the
 * admin dashboard's CoverageMapEngine): React owns the state, this owns the layers.
 */

export interface CoverageMapProps {
  areas: CoverageAreaResponse[]
  selectedId: string | null
  /** The saved layer of the area being edited is hidden while its editable copy is shown. */
  hiddenId: string | null
  /** Where to look when there is nothing to fit (the organization's base, else Riyadh). */
  fallbackCenter: [number, number] | null
  labelFor: (area: CoverageAreaResponse) => string
  onAreaClick: (id: string) => void
  onDraftChange: (geometry: DraftGeometry | null) => void
  onDrawFinished: (geometry: DraftGeometry) => void
  /** Drawing ended without a shape (geoman's cancel, or a programmatic cancel). */
  onDrawCancelled: () => void
  className?: string
}

export interface CoverageMapHandle {
  startDraw: (shape: 'Polygon' | 'Circle') => void
  cancelDraw: () => void
  /** Puts an editable (vertex-editing, draggable) copy of a shape on the map. */
  editDraft: (geometry: DraftGeometry) => void
  clearDraft: () => void
  fitAll: () => void
  focusArea: (id: string) => void
}

interface LayerEntry {
  layer: L.Path
  sig: string
  area: CoverageAreaResponse
}

function areaSig(a: CoverageAreaResponse, label: string): string {
  return JSON.stringify([a.shape, a.latitude, a.longitude, a.radiusKm, a.polygon, label])
}

function buildLayer(a: CoverageAreaResponse): L.Path | null {
  if (a.shape === 'Polygon' && a.polygon.length >= 3) return L.polygon(a.polygon.map((p) => [p.latitude, p.longitude] as [number, number]))
  if (a.shape === 'Circle' && a.latitude != null && a.longitude != null && a.radiusKm) {
    return L.circle([a.latitude, a.longitude], { radius: a.radiusKm * 1000 })
  }
  return null // CityDistrict areas have no geometry.
}

function readGeometry(layer: L.Layer): DraftGeometry | null {
  if (layer instanceof L.Circle) {
    const c = layer.getLatLng()
    return { kind: 'Circle', latitude: c.lat, longitude: c.lng, radiusKm: layer.getRadius() / 1000 }
  }
  if (layer instanceof L.Polygon) {
    const rings = layer.getLatLngs() as L.LatLng[][]
    const ring = (Array.isArray(rings[0]) ? rings[0] : (rings as unknown as L.LatLng[])) as L.LatLng[]
    return { kind: 'Polygon', points: ring.map((p) => ({ latitude: p.lat, longitude: p.lng })) }
  }
  return null
}

const DRAFT_TONE = 'info'

export const CoverageMap = forwardRef<CoverageMapHandle, CoverageMapProps>(function CoverageMap(props, ref) {
  const { t } = useTranslation('organization')
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layersRef = useRef(new Map<string, LayerEntry>())
  const draftRef = useRef<L.Path | null>(null)
  const createdRef = useRef(false)
  const fittedRef = useRef(false)

  // Latest props for Leaflet handlers bound once.
  const live = useRef(props)
  live.current = props

  // ── Map lifecycle ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const center = live.current.fallbackCenter ?? RIYADH
    const map = L.map(el, { zoomControl: true, keyboard: true, worldCopyJump: true }).setView(center, RIYADH_ZOOM)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    map.pm.setGlobalOptions({ allowSelfIntersection: false, snappable: false, continueDrawing: false })
    map.pm.setLang(
      'custom' as never,
      {
        tooltips: {
          placeMarker: t('coverage.geoman.placeMarker'),
          firstVertex: t('coverage.geoman.firstVertex'),
          continueLine: t('coverage.geoman.continueLine'),
          finishLine: t('coverage.geoman.finishLine'),
          finishPoly: t('coverage.geoman.finishPoly'),
          finishRect: t('coverage.geoman.finishRect'),
          startCircle: t('coverage.geoman.startCircle'),
          finishCircle: t('coverage.geoman.finishCircle'),
          placeCircleMarker: t('coverage.geoman.placeCircleMarker'),
        },
        actions: {
          finish: t('coverage.geoman.finish'),
          cancel: t('coverage.geoman.cancel'),
          removeLastVertex: t('coverage.geoman.removeLastVertex'),
        },
      } as never,
      'en',
    )

    map.on('pm:drawstart', () => {
      createdRef.current = false
    })
    map.on('pm:create', (e: { layer: L.Layer }) => {
      createdRef.current = true
      const geometry = readGeometry(e.layer)
      map.removeLayer(e.layer)
      if (geometry) live.current.onDrawFinished(geometry)
    })
    map.on('pm:drawend', () => {
      if (!createdRef.current) live.current.onDrawCancelled()
    })

    mapRef.current = map
    const layers = layersRef.current
    return () => {
      map.remove()
      mapRef.current = null
      layers.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Area layers, rebuilt only when an area's geometry or label changes ────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const layers = layersRef.current
    const seen = new Set<string>()
    for (const a of props.areas) {
      seen.add(a.id)
      const label = live.current.labelFor(a)
      const sig = areaSig(a, label)
      const existing = layers.get(a.id)
      if (existing && existing.sig === sig) {
        existing.area = a
        continue
      }
      existing?.layer.remove()
      const layer = buildLayer(a)
      if (!layer) {
        layers.delete(a.id)
        continue
      }
      layer.bindTooltip(label, { sticky: true })
      layer.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e)
        if (map.pm.globalDrawModeEnabled()) return
        live.current.onAreaClick(a.id)
      })
      layers.set(a.id, { layer, sig, area: a })
    }
    for (const [id, entry] of layers) {
      if (!seen.has(id)) {
        entry.layer.remove()
        layers.delete(id)
      }
    }
  }, [props.areas])

  // ── Visibility + style ────────────────────────────────────────────────────
  const { areas, selectedId, hiddenId } = props
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const active = toneColor('active')
    const muted = toneColor('muted')
    for (const [id, entry] of layersRef.current) {
      if (id === hiddenId) {
        if (map.hasLayer(entry.layer)) entry.layer.remove()
        continue
      }
      if (!map.hasLayer(entry.layer)) entry.layer.addTo(map)
      const selected = id === selectedId
      const color = entry.area.isActive ? active : muted
      entry.layer.setStyle({
        color,
        fillColor: color,
        weight: selected ? 3 : 2,
        fillOpacity: selected ? 0.32 : entry.area.isActive ? 0.16 : 0.06,
        // Dashed = disabled, so colour is never the only signal.
        dashArray: entry.area.isActive ? undefined : '6 6',
      })
      if (selected) entry.layer.bringToFront()
    }

    // First load: fit everything drawn.
    if (!fittedRef.current && layersRef.current.size > 0) {
      const bounds = L.latLngBounds([])
      // Circle bounds need the layer on the map (they are computed from its projection).
      for (const e of layersRef.current.values()) if (map.hasLayer(e.layer)) bounds.extend((e.layer as L.Polygon).getBounds())
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 })
        fittedRef.current = true
      }
    }
  }, [areas, selectedId, hiddenId])

  // ── Imperative API ────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => {
    const emitDraft = () => live.current.onDraftChange(draftRef.current ? readGeometry(draftRef.current) : null)
    const removeDraft = () => {
      if (draftRef.current) {
        draftRef.current.pm?.disable()
        draftRef.current.remove()
      }
      draftRef.current = null
    }
    return {
      startDraw: (shape) => {
        const map = mapRef.current
        if (!map) return
        const color = toneColor(DRAFT_TONE)
        map.pm.enableDraw(shape, {
          pathOptions: { color, fillColor: color, fillOpacity: 0.25, weight: 2 },
          templineStyle: { color },
          hintlineStyle: { color, dashArray: '4 4' },
        } as never)
      },
      cancelDraw: () => {
        const map = mapRef.current
        if (map?.pm.globalDrawModeEnabled()) map.pm.disableDraw()
      },
      editDraft: (geometry) => {
        const map = mapRef.current
        if (!map) return
        removeDraft()
        const color = toneColor(DRAFT_TONE)
        const layer =
          geometry.kind === 'Polygon'
            ? L.polygon(geometry.points.map((p) => [p.latitude, p.longitude] as [number, number]))
            : L.circle([geometry.latitude, geometry.longitude], { radius: geometry.radiusKm * 1000 })
        layer.setStyle({ color, fillColor: color, fillOpacity: 0.3, weight: 3, dashArray: '8 4' })
        layer.addTo(map)
        layer.pm.enable({ allowSelfIntersection: false, draggable: true } as never)
        layer.on('pm:edit pm:dragend pm:vertexadded pm:vertexremoved pm:markerdragend pm:change', emitDraft)
        draftRef.current = layer
        emitDraft()
      },
      clearDraft: () => {
        removeDraft()
        live.current.onDraftChange(null)
      },
      fitAll: () => {
        const map = mapRef.current
        if (!map) return
        const bounds = L.latLngBounds([])
        for (const e of layersRef.current.values()) if (map.hasLayer(e.layer)) bounds.extend((e.layer as L.Polygon).getBounds())
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 })
      },
      focusArea: (id) => {
        const map = mapRef.current
        const entry = layersRef.current.get(id)
        if (!map || !entry || !map.hasLayer(entry.layer)) return
        map.fitBounds((entry.layer as L.Polygon).getBounds(), { padding: [32, 32], maxZoom: 15 })
      },
    }
  }, [])

  return <div ref={containerRef} dir="ltr" className={props.className} role="application" aria-label={t('coverage.mapLabel')} />
})
