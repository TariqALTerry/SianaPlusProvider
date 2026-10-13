import type { SettlementLineResponse, SettlementResponse } from '@/api/types'
import { enumLabel } from '@/i18n/enums'
import { pickLocalized } from '@/i18n'
import type { CsvColumn } from '@/lib/csv'
import { formatDate, formatDateTime } from '@/lib/format'

type Translate = (key: string) => string

/** Money as a plain two-decimal number, so spreadsheets can sum it. */
const money = (value: number | null | undefined) => (value === null || value === undefined ? '' : value.toFixed(2))

/** Columns of the settlements list export (the current filters, every page). */
export function settlementCsvColumns(t: Translate, lang: string): CsvColumn<SettlementResponse>[] {
  return [
    { header: t('columns.number'), value: (r) => r.settlementNumber },
    { header: t('columns.party'), value: (r) => enumLabel('SettlementPartyType', r.partyType, lang) },
    { header: t('columns.executor'), value: (r) => r.executorName },
    { header: t('columns.periodStart'), value: (r) => formatDate(r.periodStart, lang) },
    { header: t('columns.periodEnd'), value: (r) => formatDate(r.periodEnd, lang) },
    { header: t('columns.lines'), value: (r) => r.linesCount },
    { header: t('columns.gross'), value: (r) => money(r.grossAmount) },
    { header: t('columns.commission'), value: (r) => money(r.commissionAmount) },
    { header: t('columns.net'), value: (r) => money(r.netAmount) },
    { header: t('columns.status'), value: (r) => enumLabel('SettlementStatus', r.status, lang) },
    { header: t('columns.approvedAt'), value: (r) => (r.approvedAt ? formatDateTime(r.approvedAt, lang) : '') },
    { header: t('columns.paidAt'), value: (r) => (r.paidAt ? formatDateTime(r.paidAt, lang) : '') },
    { header: t('columns.reference'), value: (r) => r.paymentReference },
    { header: t('columns.notes'), value: (r) => r.notes },
    { header: t('columns.createdAt'), value: (r) => formatDateTime(r.createdAt, lang) },
  ]
}

/** Columns of one settlement's lines export. */
export function settlementLineCsvColumns(t: Translate, lang: string): CsvColumn<SettlementLineResponse>[] {
  return [
    { header: t('lines.item'), value: (l) => l.itemNumber },
    { header: t('lines.order'), value: (l) => l.orderNumber },
    { header: t('lines.service'), value: (l) => pickLocalized(lang, l.serviceNameAr, l.serviceNameEn) },
    { header: t('lines.executor'), value: (l) => l.executorName },
    { header: t('lines.completedAt'), value: (l) => (l.completedAt ? formatDateTime(l.completedAt, lang) : '') },
    { header: t('lines.gross'), value: (l) => money(l.grossAmount) },
    { header: t('lines.commission'), value: (l) => money(l.commissionAmount) },
    { header: t('lines.net'), value: (l) => money(l.netAmount) },
  ]
}
