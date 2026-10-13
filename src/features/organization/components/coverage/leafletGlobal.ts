import L from 'leaflet'

/**
 * leaflet-geoman is a classic plugin that patches the global `L`. ES-module Leaflet doesn't
 * create that global, so it's set here — this module must be imported before geoman.
 */
;(window as unknown as { L: typeof L }).L = L

export default L
