import { describe, expect, it } from 'vitest'
import type { SettlementLineResponse, SettlementResponse } from '@/api/types'
import { toCsv } from '@/lib/csv'
import { settlementCsvColumns, settlementLineCsvColumns } from './csv'

const t = (key: string) => key

const settlement: SettlementResponse = {
  id: 's1',
  settlementNumber: 'ST-1001',
  partyType: 'Provider',
  providerOrganizationId: 'p1',
  providerName: 'Org',
  executorId: null,
  executorName: null,
  periodStart: '2026-09-01T00:00:00Z',
  periodEnd: '2026-09-30T20:59:59Z',
  grossAmount: 1000,
  commissionAmount: 150.5,
  netAmount: 849.5,
  status: 'Paid',
  linesCount: 3,
  approvedAt: '2026-10-01T09:00:00Z',
  paidAt: '2026-10-02T09:00:00Z',
  paymentReference: 'TRX-9',
  notes: 'شكرًا, "تم"',
  createdAt: '2026-10-01T08:00:00Z',
}

const line: SettlementLineResponse = {
  id: 'l1',
  serviceItemId: 'i1',
  itemNumber: 'SI-10053-2',
  orderNumber: 'SO-10053',
  serviceNameAr: 'صيانة غسالة',
  serviceNameEn: 'Washer repair',
  executorName: 'Ali',
  completedAt: null,
  grossAmount: 200,
  commissionAmount: 30,
  netAmount: 170,
}

describe('settlement CSV', () => {
  it('maps a settlement row with provider labels and plain two-decimal money', () => {
    const cols = settlementCsvColumns(t, 'ar')
    const row = Object.fromEntries(cols.map((c) => [c.header, c.value(settlement)]))
    expect(row['columns.number']).toBe('ST-1001')
    expect(row['columns.party']).toBe('المنشأة')
    expect(row['columns.status']).toBe('مصروفة')
    expect(row['columns.gross']).toBe('1000.00')
    expect(row['columns.commission']).toBe('150.50')
    expect(row['columns.net']).toBe('849.50')
    expect(row['columns.periodStart']).toBe('2026/09/01')
    expect(row['columns.paidAt']).toBe('2026/10/02 12:00')
    expect(row['columns.executor']).toBeNull()
  })

  it('escapes commas and quotes in free text', () => {
    const csv = toCsv([settlement], settlementCsvColumns(t, 'en'))
    expect(csv.split('\r\n')[1]).toContain('"شكرًا, ""تم"""')
    expect(csv.split('\r\n')[1]).toContain(',Paid,')
  })

  it('maps settlement lines, picking the service name by language', () => {
    const cols = settlementLineCsvColumns(t, 'en')
    const values = cols.map((c) => c.value(line))
    expect(cols.map((c) => c.header)).toEqual([
      'lines.item',
      'lines.order',
      'lines.service',
      'lines.executor',
      'lines.completedAt',
      'lines.gross',
      'lines.commission',
      'lines.net',
    ])
    expect(values).toEqual(['SI-10053-2', 'SO-10053', 'Washer repair', 'Ali', '', '200.00', '30.00', '170.00'])
    expect(settlementLineCsvColumns(t, 'ar')[2]!.value(line)).toBe('صيانة غسالة')
  })
})
