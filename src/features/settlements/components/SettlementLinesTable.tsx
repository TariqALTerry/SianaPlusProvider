import { useTranslation } from 'react-i18next'
import { EntityLink, HumanNumber } from '@/components/EntityLink'
import { DateTime, Money } from '@/components/Format'
import { EmptyState } from '@/components/States'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import type { SettlementLineResponse } from '@/api/types'
import { useIsDesktopTable } from '@/hooks/useMediaQuery'
import { useLang } from '@/hooks/useLang'
import { cn, sum } from '@/lib/utils'
import '../i18n'

/**
 * A settlement's lines (not paginated by the API): a table with a totals row on desktop, one card
 * per line on phones. Items link to the work item page.
 */
export function SettlementLinesTable({ lines }: { lines: SettlementLineResponse[] }) {
  const { t } = useTranslation('settlements')
  const { pick } = useLang()
  const desktop = useIsDesktopTable()
  if (!lines.length) return <EmptyState title={t('detail.linesEmpty')} className="py-6" />

  const totals = {
    gross: sum(lines, (l) => l.grossAmount),
    commission: sum(lines, (l) => l.commissionAmount),
    net: sum(lines, (l) => l.netAmount),
  }

  if (!desktop) {
    return (
      <ul className="divide-y">
        {lines.map((l, i) => (
          <li key={`${l.serviceItemId}-${i}`} className="space-y-1.5 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate font-medium">{pick(l.serviceNameAr, l.serviceNameEn)}</span>
              <Money value={l.netAmount} className="font-semibold" />
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[0.8125rem]">
              <dt className="text-muted-foreground">{t('lines.item')}</dt>
              <dd className="text-end">
                <EntityLink kind="workItem" id={l.serviceItemId} label={l.itemNumber} mono />
              </dd>
              <dt className="text-muted-foreground">{t('lines.executor')}</dt>
              <dd className="text-end">{l.executorName ?? '—'}</dd>
              <dt className="text-muted-foreground">{t('lines.completedAt')}</dt>
              <dd className="text-end">
                <DateTime value={l.completedAt} mode="absolute" className="text-xs" />
              </dd>
              <dt className="text-muted-foreground">{t('lines.gross')}</dt>
              <dd className="text-end">
                <Money value={l.grossAmount} />
              </dd>
              <dt className="text-muted-foreground">{t('lines.commission')}</dt>
              <dd className="text-end text-muted-foreground">
                <Money value={l.commissionAmount} />
              </dd>
            </dl>
          </li>
        ))}
        <li className="flex items-center justify-between gap-2 bg-muted/40 p-3 font-semibold">
          <span>
            {t('detail.totals')} · {lines.length}
          </span>
          <Money value={totals.net} />
        </li>
      </ul>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <THead>
          <Tr>
            <Th>{t('lines.item')}</Th>
            <Th>{t('lines.order')}</Th>
            <Th>{t('lines.service')}</Th>
            <Th>{t('lines.executor')}</Th>
            <Th>{t('lines.completedAt')}</Th>
            <Th className="text-end">{t('lines.gross')}</Th>
            <Th className="text-end">{t('lines.commission')}</Th>
            <Th className="text-end">{t('lines.net')}</Th>
          </Tr>
        </THead>
        <TBody>
          {lines.map((l, i) => (
            <Tr key={`${l.serviceItemId}-${i}`}>
              <Td>
                <EntityLink kind="workItem" id={l.serviceItemId} label={l.itemNumber} copy={l.itemNumber} mono />
              </Td>
              <Td>
                <HumanNumber value={l.orderNumber} />
              </Td>
              <Td className="max-w-[16rem] truncate">{pick(l.serviceNameAr, l.serviceNameEn)}</Td>
              <Td className="text-xs">{l.executorName ?? '—'}</Td>
              <Td>
                <DateTime value={l.completedAt} mode="absolute" className="text-xs" />
              </Td>
              <Td className="text-end">
                <Money value={l.grossAmount} />
              </Td>
              <Td className="text-end text-muted-foreground">
                <Money value={l.commissionAmount} />
              </Td>
              <Td className="text-end font-medium">
                <Money value={l.netAmount} />
              </Td>
            </Tr>
          ))}
        </TBody>
        <tfoot>
          <Tr className={cn('border-t-2 bg-muted/40 font-semibold')}>
            <Td colSpan={5}>
              {t('detail.totals')} · {lines.length}
            </Td>
            <Td className="text-end">
              <Money value={totals.gross} />
            </Td>
            <Td className="text-end">
              <Money value={totals.commission} />
            </Td>
            <Td className="text-end">
              <Money value={totals.net} />
            </Td>
          </Tr>
        </tfoot>
      </Table>
    </div>
  )
}
