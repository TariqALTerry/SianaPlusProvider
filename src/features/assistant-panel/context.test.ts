import { describe, expect, it } from 'vitest'
import type { StaffAssistantSectionResponse } from '@/api/types'
import { contextFor, isSafeRoute, sectionFor } from './context'
import { parseSse } from './stream'

const section = (key: string, routes: string[]): StaffAssistantSectionResponse => ({
  key, routes, nameAr: key, nameEn: key, assistantNameAr: key, assistantNameEn: key, suggestions: [], readTools: 1, writeTools: 0,
})

const sections = [section('general', ['/']), section('work', ['/work', '/board']), section('finance', ['/payments', '/refunds']), section('reports', ['/reports', '/tracking'])]

describe('assistant page context', () => {
  it('names the record of a detail page', () => {
    const id = '2d2b0c5e-1a52-4a4c-9b7d-8d9a8f3e2c11'
    expect(contextFor(`/work/${id}`, '?tab=timeline')).toEqual({ route: `/work/${id}?tab=timeline`, entityType: 'serviceItem', entityId: id, branchId: null })
    expect(contextFor('/work')).toMatchObject({ entityType: null, entityId: null })
  })

  it('picks the section that owns the path, the longest prefix first', () => {
    expect(sectionFor('/work/abc', sections)).toBe('work')
    expect(sectionFor('/refunds', sections)).toBe('finance')
    expect(sectionFor('/tracking/audit', sections)).toBe('reports')
    expect(sectionFor('/', sections)).toBe('general')
    expect(sectionFor('/elsewhere', sections)).toBe('general')
  })

  it('follows only paths of this app', () => {
    expect(isSafeRoute('/orders?status=Paid')).toBe(true)
    expect(isSafeRoute('https://evil.example')).toBe(false)
    expect(isSafeRoute('//evil.example')).toBe(false)
    expect(isSafeRoute('javascript:alert(1)')).toBe(false)
    expect(isSafeRoute(null)).toBe(false)
  })
})

describe('server-sent events', () => {
  it('splits complete events and keeps the unfinished tail', () => {
    const { events, rest } = parseSse('event: status\ndata: {"stage":"tool","tool":"finance_summary"}\n\nevent: delta\ndata: {"text":"دخ"}\n\nevent: delta\ndata: {"te')
    expect(events).toEqual([
      { event: 'status', data: '{"stage":"tool","tool":"finance_summary"}' },
      { event: 'delta', data: '{"text":"دخ"}' },
    ])
    expect(rest).toBe('event: delta\ndata: {"te')
  })
})
