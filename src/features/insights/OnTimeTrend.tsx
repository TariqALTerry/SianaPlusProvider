import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PunctualityWeek } from '@/api/types'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { useLang } from '@/hooks/useLang'
import { formatNumber, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { axisLabelIndexes, trendGeometry, weekLabel } from './trackingLogic'
import './trackingI18n'

const HEIGHT = 168
/** Room for the end label above 100 % and the markers' rings at the edges. */
const PAD_TOP = 14
const PAD_BOTTOM = 6
/** The performance page colours an on-time rate under 80 % red: the same line here. */
const THRESHOLD = 0.8

/**
 * Weekly on-time rate: one series, so no legend (the card title names it). A fixed 0–100 % axis, a 2 px line
 * with a 10 % wash, 8 px markers with a surface ring, a crosshair that snaps to the week under the pointer (or
 * the focused week, with the keyboard) and the same numbers in a table below.
 */
export function OnTimeTrend({ weeks }: { weeks: readonly PunctualityWeek[] }) {
  const { t } = useTranslation('tracking')
  const { lang, isRtl } = useLang()
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const update = () => setWidth(Math.floor(el.getBoundingClientRect().width))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM
  const { band, points, segments, yOf } = trendGeometry(weeks, width, plotH, isRtl)
  const y = (v: number) => PAD_TOP + v
  const labels = axisLabelIndexes(weeks.length, width)
  const last = [...points].reverse().find((p) => p.y !== null)
  const pct = (v: number | null) => formatPercent(v, lang, 0)
  const hovered = active === null ? null : points[active]
  const withVisits = weeks.filter((w) => w.visits > 0)
  const summary = t('punct.trendLabel', {
    weeks: weeks.length,
    first: pct(withVisits[0]?.onTimeRate ?? null),
    last: pct(withVisits[withVisits.length - 1]?.onTimeRate ?? null),
  })

  return (
    <div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
        {/* The y-axis: 0, 50 and 100 % — clean ticks on a rate's natural scale. */}
        <div className="relative w-9 text-end text-[0.6875rem] text-muted-foreground" style={{ height: HEIGHT }} aria-hidden>
          {[1, 0.5, 0].map((v) => (
            <span key={v} className="tabular absolute end-0 -translate-y-1/2" style={{ top: y(yOf(v)) }}>
              {pct(v)}
            </span>
          ))}
        </div>
        <div ref={box} className="relative min-w-0" style={{ height: HEIGHT }} onPointerLeave={() => setActive(null)}>
          {width > 0 && (
            <svg width={width} height={HEIGHT} role="img" aria-label={summary} className="block overflow-visible">
              {[0, 0.5, 1].map((v) => (
                <line key={v} x1={0} x2={width} y1={y(yOf(v))} y2={y(yOf(v))} className="stroke-border" strokeWidth={1} shapeRendering="crispEdges" />
              ))}
              <line x1={0} x2={width} y1={y(yOf(THRESHOLD))} y2={y(yOf(THRESHOLD))} className="stroke-tone-attention" strokeOpacity={0.7} strokeWidth={1} shapeRendering="crispEdges" />
              {segments.map((seg, i) => {
                const path = seg.map((p, j) => `${j ? 'L' : 'M'}${p.x},${y(p.y!)}`).join(' ')
                const area = seg.length > 1 ? `${path} L${seg[seg.length - 1]!.x},${y(plotH)} L${seg[0]!.x},${y(plotH)} Z` : null
                return (
                  <g key={i}>
                    {area && <path d={area} className="fill-primary/10" />}
                    <path d={path} className="fill-none stroke-primary" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  </g>
                )
              })}
              {hovered && <line x1={hovered.x} x2={hovered.x} y1={PAD_TOP} y2={y(plotH)} className="stroke-muted-foreground/60" strokeWidth={1} />}
              {points.map((p) =>
                p.y === null ? null : (
                  <circle
                    key={p.index}
                    cx={p.x}
                    cy={y(p.y)}
                    r={active === p.index ? 5.5 : 4}
                    className="fill-primary stroke-surface"
                    strokeWidth={2}
                  />
                ),
              )}
              {last && last.y !== null && (
                <text
                  x={last.x}
                  y={y(last.y) - 9}
                  textAnchor={points.length === 1 ? 'middle' : isRtl ? 'start' : 'end'}
                  className="fill-foreground text-[0.6875rem] font-semibold"
                  style={{ direction: 'ltr' }}
                >
                  {pct(last.week.onTimeRate)}
                </text>
              )}
              {/* Bands bigger than any mark: the hit target and the keyboard stop for each week. */}
              {points.map((p) => (
                <rect
                  key={p.index}
                  x={p.x - band / 2}
                  y={0}
                  width={band}
                  height={HEIGHT}
                  fill="transparent"
                  tabIndex={0}
                  role="img"
                  aria-label={weekAria(p.week)}
                  className="cursor-default outline-none focus-visible:fill-primary/5"
                  onPointerEnter={() => setActive(p.index)}
                  onFocus={() => setActive(p.index)}
                  onBlur={() => setActive(null)}
                />
              ))}
            </svg>
          )}
          {hovered && <TrendTooltip week={hovered.week} x={hovered.x} width={width} />}
        </div>
        <div />
        <div className="relative mt-1 h-4 text-[0.6875rem] text-muted-foreground" aria-hidden>
          {labels.map((i) => {
            const p = points[i]
            if (!p) return null
            return (
              <span key={i} className="tabular absolute top-0 -translate-x-1/2 whitespace-nowrap" style={{ left: p.x }}>
                {weekLabel(p.week.weekStart, lang)}
              </span>
            )
          })}
        </div>
      </div>
      <p className="mt-2 flex items-center gap-2 text-[0.6875rem] text-muted-foreground">
        <span className="inline-block h-px w-4 bg-tone-attention" aria-hidden />
        {t('punct.threshold', { value: pct(THRESHOLD) })}
      </p>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer select-none text-xs text-primary hover:underline">{t('punct.asTable')}</summary>
        <div className="mt-2 overflow-x-auto">
          <Table>
            <THead>
              <Tr>
                <Th>{t('punct.week')}</Th>
                <Th className="text-end">{t('punct.visits')}</Th>
                <Th className="text-end">{t('punct.onTime')}</Th>
                <Th className="text-end">{t('punct.late')}</Th>
                <Th className="text-end">{t('punct.rate')}</Th>
              </Tr>
            </THead>
            <TBody>
              {weeks.map((w) => (
                <Tr key={w.weekStart}>
                  <Td className="tabular">{weekLabel(w.weekStart, lang)}</Td>
                  <Td className="tabular text-end">{formatNumber(w.visits, lang)}</Td>
                  <Td className="tabular text-end">{formatNumber(w.onTime, lang)}</Td>
                  <Td className="tabular text-end">{formatNumber(w.late, lang)}</Td>
                  <Td className="tabular text-end font-medium">{pct(w.onTimeRate)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      </details>
    </div>
  )

  function weekAria(w: PunctualityWeek): string {
    return w.visits === 0
      ? t('punct.tipNone', { week: weekLabel(w.weekStart, lang) })
      : t('punct.tipAria', { week: weekLabel(w.weekStart, lang), rate: pct(w.onTimeRate), onTime: w.onTime, visits: w.visits, late: w.late })
  }
}

function TrendTooltip({ week, x, width }: { week: PunctualityWeek; x: number; width: number }) {
  const { t } = useTranslation('tracking')
  const { lang } = useLang()
  // Keep the box inside the plot: anchor it to the nearer edge near the ends.
  const anchor = x < 90 ? 'start' : x > width - 90 ? 'end' : 'middle'
  return (
    <div
      className={cn(
        'pointer-events-none absolute top-0 z-10 min-w-[9rem] rounded-md border bg-surface px-2.5 py-1.5 text-xs shadow-lg',
        anchor === 'middle' && '-translate-x-1/2',
        anchor === 'end' && '-translate-x-full',
      )}
      style={{ left: anchor === 'start' ? Math.max(0, x - 8) : anchor === 'end' ? Math.min(width, x + 8) : x }}
    >
      <div className="text-muted-foreground">{t('punct.weekOf', { week: weekLabel(week.weekStart, lang) })}</div>
      {week.visits === 0 ? (
        <div className="mt-0.5">{t('punct.noVisitsWeek')}</div>
      ) : (
        <>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="inline-block h-0.5 w-3 rounded bg-primary" aria-hidden />
            <span className="text-sm font-semibold">{formatPercent(week.onTimeRate, lang, 0)}</span>
            <span className="text-muted-foreground">{t('punct.onTimeShort')}</span>
          </div>
          <div className="tabular text-muted-foreground">
            {t('punct.tipCounts', { onTime: formatNumber(week.onTime, lang), visits: formatNumber(week.visits, lang), late: formatNumber(week.late, lang) })}
          </div>
        </>
      )}
    </div>
  )
}
