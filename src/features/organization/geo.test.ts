import { describe, expect, it } from 'vitest'
import { areaSizeKm2, MAX_POLYGON_POINTS, polygonAreaKm2, preparePolygon } from './geo'

const pt = (latitude: number, longitude: number) => ({ latitude, longitude })
// ~1.1 km square in north Riyadh.
const square = [pt(24.8, 46.6), pt(24.8, 46.61), pt(24.81, 46.61), pt(24.81, 46.6)]
// A rough ring over حي النسيم (east Riyadh) — the acceptance-test polygon.
const alNaseem = [pt(24.7445, 46.8105), pt(24.7445, 46.8525), pt(24.7155, 46.8525), pt(24.7155, 46.8105)]

describe('polygon pre-validation', () => {
  it('accepts a simple polygon and drops a closing duplicate', () => {
    const r = preparePolygon([...square, square[0]!])
    expect(r.problem).toBeNull()
    expect(r.points).toHaveLength(4)
    expect(polygonAreaKm2(r.points)).toBeGreaterThan(1)
  })

  it('accepts a polygon over Al-Naseem', () => {
    const r = preparePolygon(alNaseem)
    expect(r.problem).toBeNull()
    expect(polygonAreaKm2(r.points)).toBeGreaterThan(5)
  })

  it('refuses a self-intersecting (bow-tie) polygon', () => {
    const bowTie = [pt(24.8, 46.6), pt(24.81, 46.61), pt(24.8, 46.61), pt(24.81, 46.6)]
    expect(preparePolygon(bowTie).problem).toBe('SelfIntersecting')
  })

  it('flags too few points and zero area (collinear first)', () => {
    expect(preparePolygon([pt(24.8, 46.6), pt(24.81, 46.61)]).problem).toBe('TooFewPoints')
    expect(preparePolygon([pt(24.8, 46.6), pt(24.8, 46.6), pt(24.81, 46.61)]).problem).toBe('TooFewPoints')
    expect(preparePolygon([pt(24.8, 46.6), pt(24.8, 46.605), pt(24.8, 46.61)]).problem).toBe('ZeroArea')
  })

  it('simplifies polygons above 200 points', () => {
    const circle = Array.from({ length: 600 }, (_, i) => {
      const a = (i / 600) * 2 * Math.PI
      return pt(24.75 + 0.05 * Math.sin(a), 46.7 + 0.05 * Math.cos(a))
    })
    const r = preparePolygon(circle)
    expect(r.simplified).toBe(true)
    expect(r.points.length).toBeLessThanOrEqual(MAX_POLYGON_POINTS)
    expect(r.points.length).toBeGreaterThanOrEqual(3)
    expect(r.problem).toBeNull()
  })
})

describe('area size', () => {
  it('measures polygons and circles, not city/district areas', () => {
    expect(areaSizeKm2({ shape: 'Circle', polygon: [], radiusKm: 1 })).toBeCloseTo(Math.PI)
    expect(areaSizeKm2({ shape: 'CityDistrict', polygon: [], radiusKm: null })).toBeNull()
    expect(areaSizeKm2({ shape: 'Polygon', polygon: square, radiusKm: null })).toBeGreaterThan(1)
  })
})
