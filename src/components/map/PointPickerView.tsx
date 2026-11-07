import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'

export interface PointPickerProps {
  lat: number | null
  lng: number | null
  onPick: (point: { lat: number; lng: number }) => void
  /** Where to open when no point is set yet (e.g. the organization's base). */
  fallback?: { lat: number; lng: number } | null
}

const RIYADH = { lat: 24.7136, lng: 46.6753 }

function ClickToPick({ onPick }: { onPick: PointPickerProps['onPick'] }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

/** Keeps the picked point in view when it changes from outside (typed coordinates, "my location"). */
function Follow({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap()
  useEffect(() => {
    if (lat === null || lng === null) return
    if (!map.getBounds().contains([lat, lng])) map.setView([lat, lng], Math.max(map.getZoom(), 14))
  }, [map, lat, lng])
  return null
}

/**
 * A single point chosen by clicking the map (a branch's location). Same Leaflet + OpenStreetMap stack as `MapView`,
 * with a vector marker so no image assets are needed. Loaded lazily through `LazyPointPicker`.
 */
export default function PointPickerView({ lat, lng, onPick, fallback }: PointPickerProps) {
  const has = lat !== null && lng !== null
  const center = has ? { lat: lat!, lng: lng! } : (fallback ?? RIYADH)
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={has || fallback ? 14 : 11} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickToPick onPick={onPick} />
      <Follow lat={lat} lng={lng} />
      {has && (
        <CircleMarker center={[lat!, lng!]} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: 'hsl(166 93% 24%)', fillOpacity: 1 }} />
      )}
    </MapContainer>
  )
}
