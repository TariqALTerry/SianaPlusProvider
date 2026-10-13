import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Circle, CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'

export interface MapMarker {
  id: string
  lat: number
  lng: number
  /** CSS colour (use `hsl(var(--tone-…))`). */
  color?: string
  /** Square-ish executor pin vs round customer pin. */
  variant?: 'customer' | 'executor'
  label?: ReactNode
  popup?: ReactNode
  highlighted?: boolean
  onClick?: () => void
}

export interface MapCircle {
  id: string
  lat: number
  lng: number
  radiusKm: number
  color?: string
  label?: ReactNode
}

export interface MapLine {
  id: string
  from: [number, number]
  to: [number, number]
  color?: string
}

export interface MapViewProps {
  markers?: MapMarker[]
  circles?: MapCircle[]
  lines?: MapLine[]
  className?: string
  /** Fit to content only on first render, so polling refreshes keep the user's zoom/pan. */
  fitOnce?: boolean
  zoom?: number
  /** Pans to this point whenever it changes (e.g. the row the user just selected). */
  focus?: { lat: number; lng: number } | null
}

function FocusOn({ focus }: { focus: { lat: number; lng: number } | null | undefined }) {
  const map = useMap()
  const lat = focus?.lat
  const lng = focus?.lng
  useEffect(() => {
    if (lat === undefined || lng === undefined) return
    map.panTo([lat, lng], { animate: true })
  }, [map, lat, lng])
  return null
}

const RIYADH: [number, number] = [24.7136, 46.6753]

function FitBounds({ points, once }: { points: Array<[number, number]>; once: boolean }) {
  const map = useMap()
  const fitted = useRef(false)
  useEffect(() => {
    if (!points.length || (once && fitted.current)) return
    fitted.current = true
    if (points.length === 1) map.setView(points[0]!, Math.max(map.getZoom(), 13))
    else map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 15 })
  }, [map, points, once])
  return null
}

/** Leaflet + OpenStreetMap tiles (no API key). Loaded lazily via `LazyMap`. */
export default function MapView({ markers = [], circles = [], lines = [], className, fitOnce = true, zoom = 11, focus }: MapViewProps) {
  const points = useMemo<Array<[number, number]>>(
    () => [...markers.map((m) => [m.lat, m.lng] as [number, number]), ...circles.map((c) => [c.lat, c.lng] as [number, number])],
    [markers, circles],
  )

  return (
    <MapContainer center={points[0] ?? RIYADH} zoom={zoom} scrollWheelZoom className={className} style={{ height: '100%', width: '100%' }}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds points={points} once={fitOnce} />
      <FocusOn focus={focus} />
      {circles.map((c) => (
        <Circle key={c.id} center={[c.lat, c.lng]} radius={c.radiusKm * 1000} pathOptions={{ color: c.color ?? 'hsl(174 72% 32%)', weight: 1, fillOpacity: 0.12 }}>
          {c.label && <Tooltip>{c.label}</Tooltip>}
        </Circle>
      ))}
      {lines.map((l) => (
        <Polyline key={l.id} positions={[l.from, l.to]} pathOptions={{ color: l.color ?? 'hsl(243 60% 50%)', weight: 2, dashArray: '4 4' }} />
      ))}
      {markers.map((m) => (
        <CircleMarker
          key={m.id}
          center={[m.lat, m.lng]}
          radius={m.highlighted ? 10 : m.variant === 'executor' ? 6 : 7}
          pathOptions={{
            color: m.variant === 'executor' ? '#fff' : m.color ?? 'hsl(214 80% 45%)',
            weight: m.variant === 'executor' ? 2 : m.highlighted ? 3 : 1.5,
            fillColor: m.color ?? 'hsl(214 80% 45%)',
            fillOpacity: m.variant === 'executor' ? 1 : 0.75,
          }}
          eventHandlers={m.onClick ? { click: m.onClick } : undefined}
        >
          {m.label && <Tooltip>{m.label}</Tooltip>}
          {m.popup && <Popup>{m.popup}</Popup>}
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
