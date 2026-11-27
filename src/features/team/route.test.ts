import { describe, expect, it } from 'vitest'
import type { RouteStopResponse } from '@/api/types'
import { lateCount, routeLegs, routePins } from './route'

const stop = (order: number, lat: number | null, lng: number | null, lateRisk = false) =>
  ({ order, serviceItemId: `s${order}`, latitude: lat, longitude: lng, lateRisk }) as RouteStopResponse

describe('technician route', () => {
  const route = { startLatitude: 24.7, startLongitude: 46.6, stops: [stop(1, 24.71, 46.62), stop(2, null, null), stop(3, 24.75, 46.7, true)] }

  it('pins located stops with their order', () => {
    expect(routePins(route).map((p) => p.text)).toEqual(['1', '3'])
  })

  it('draws legs from the start through the pins', () => {
    const legs = routeLegs(route)
    expect(legs).toHaveLength(2)
    expect(legs[0]!.from).toEqual([24.7, 46.6])
    expect(legs[1]!.to).toEqual([24.75, 46.7])
    expect(routeLegs({ ...route, startLatitude: null, startLongitude: null })).toHaveLength(1)
  })

  it('counts the visits at risk', () => {
    expect(lateCount(route)).toBe(1)
  })
})
