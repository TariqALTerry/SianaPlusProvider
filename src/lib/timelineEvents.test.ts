import { describe, expect, it } from 'vitest'
import ar from '@/i18n/ar.json'
import en from '@/i18n/en.json'
import { eventLabelValues } from './timelineEvents'

describe('timeline event labels', () => {
  it('reads the distance of a far arrival from the metadata', () => {
    expect(eventLabelValues('ArrivedFarFromAddress', '{"distanceKm":3.4,"executorId":"x"}', 'ar')).toEqual({ distanceKm: '3.4' })
    expect(eventLabelValues('ArrivedFarFromAddress', '{"DistanceKm":12}', 'en')).toEqual({ distanceKm: '12' })
  })

  it('falls back to the plain label when a value is missing or the metadata is unreadable', () => {
    expect(eventLabelValues('ArrivedFarFromAddress', '{"distanceKm":null}', 'ar')).toBeNull()
    expect(eventLabelValues('ArrivedFarFromAddress', null, 'ar')).toBeNull()
    expect(eventLabelValues('ArrivedFarFromAddress', 'not json', 'ar')).toBeNull()
    expect(eventLabelValues('StatusChanged', '{"distanceKm":3}', 'ar')).toBeNull()
    expect(eventLabelValues(null, '{}', 'ar')).toBeNull()
  })

  it('labels the new events in both languages', () => {
    for (const type of ['ArrivedFarFromAddress', 'ArrivedWithoutLocation', 'ReturnedToPlatform', 'CrewRated', 'ClosedAfterInspection']) {
      expect(ar.timelineEvents).toHaveProperty(type)
      expect(en.timelineEvents).toHaveProperty(type)
    }
    expect(ar.timelineEventDetails.ArrivedFarFromAddress).toContain('{{distanceKm}}')
    expect(en.timelineEventDetails.ArrivedFarFromAddress).toContain('{{distanceKm}}')
    // A close after the inspection may be at 0 SAR: the label must not claim a fee.
    expect(ar.timelineEvents.ClosedAfterInspection).not.toContain('رسوم')
  })
})
