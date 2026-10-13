import { Check, EyeOff, FileText, Navigation, Phone, PlayCircle, Circle, Sparkles } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { DateTime, Money } from '@/components/Format'
import { DynamicFieldsView } from '@/components/JsonView'
import { KeyValue } from '@/components/KeyValue'
import { PhoneText } from '@/components/PhoneText'
import { EmptyState } from '@/components/States'
import { EnumText, StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { fileUrl, isPdf, isVideo } from '@/api/files'
import type {
  AssignmentResponse,
  EvidenceResponse,
  EvidenceStage,
  ExecutionStepResponse,
  QuotationResponse,
  ScheduleResponse,
  ServiceItemProviderView,
} from '@/api/types'
import { useLang } from '@/hooks/useLang'
import { enumLabel, EvidenceStage as EvidenceStageMap } from '@/i18n/enums'
import { formatDateTime, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { isContactHidden } from '../logic'
import { Avatar } from './widgets'
import '../i18n'

function SectionEmpty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

/** Customer and address, with the privacy rule (§8.4) spelled out while details are withheld. */
export function CustomerCard({ item }: { item: ServiceItemProviderView }) {
  const { t } = useTranslation('work')
  const hidden = isContactHidden(item.status)
  const { address } = item
  const hasCoords = address.latitude !== null && address.longitude !== null
  const directions = hasCoords ? `https://www.google.com/maps/dir/?api=1&destination=${address.latitude},${address.longitude}` : null
  const area = [address.district, address.city].filter(Boolean).join('، ')
  return (
    <Card>
      <CardHeader
        title={t('detail.customer')}
        actions={
          <>
            {item.customer.phoneNumber && (
              <Button asChild size="xs">
                <a href={`tel:${item.customer.phoneNumber}`}>
                  <Phone /> {t('detail.call')}
                </a>
              </Button>
            )}
            {directions && (
              <Button asChild size="xs" variant="outline">
                <a href={directions} target="_blank" rel="noreferrer">
                  <Navigation /> {t('detail.directions')}
                </a>
              </Button>
            )}
          </>
        }
      />
      <CardBody className="space-y-3">
        {hidden && (
          <p className="flex items-center gap-2 rounded-md bg-tone-info-soft px-3 py-2 text-xs text-tone-info" role="note">
            <EyeOff className="size-3.5 shrink-0" aria-hidden /> {t('detail.privacy')}
          </p>
        )}
        <KeyValue
          items={[
            { label: t('common:common.name'), value: item.customer.fullName || null },
            { label: t('common:common.phone'), value: item.customer.phoneNumber ? <PhoneText phone={item.customer.phoneNumber} /> : null, hidden: hidden && !item.customer.phoneNumber },
            { label: t('common:common.district'), value: area || null },
            { label: t('detail.addressLabel'), value: [address.label, address.addressLine].filter(Boolean).join(' — ') || null, hidden: hidden && !address.addressLine },
            { label: t('detail.customerDescription'), value: item.customerDescription ? <span className="whitespace-pre-wrap">{item.customerDescription}</span> : null, wide: true, hidden: !item.customerDescription },
          ]}
        />
        {item.dynamicFieldsJson && (
          <div>
            <p className="mb-1 text-xs text-muted-foreground">{t('detail.dynamicFields')}</p>
            <DynamicFieldsView json={item.dynamicFieldsJson} />
          </div>
        )}
      </CardBody>
    </Card>
  )
}

/** The technician holding the item, and where their assignment stands. */
export function TechnicianCard({ item }: { item: ServiceItemProviderView }) {
  const { t } = useTranslation('work')
  const assignment = item.currentAssignment?.type === 'ExecutorAssignment' ? item.currentAssignment : null
  return (
    <Card>
      <CardHeader
        title={t('detail.technician')}
        actions={
          item.executorAssignmentDelegated ? (
            <Badge tone="active">
              <Sparkles className="size-3" /> {t('icons.delegated')}
            </Badge>
          ) : undefined
        }
      />
      <CardBody>
        {item.executor ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar name={item.executor.fullName} />
              <div className="min-w-0">
                <p className="truncate font-medium">{item.executor.fullName}</p>
                <PhoneText phone={item.executor.phoneNumber} className="text-xs" />
              </div>
            </div>
            {assignment && (
              <KeyValue
                columns={1}
                items={[
                  {
                    label: t('detail.assignment'),
                    value: (
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <StatusBadge enum="AssignmentStatus" value={assignment.status} />
                        <DateTime value={assignment.respondedAt ?? assignment.createdAt} className="text-xs text-muted-foreground" />
                      </span>
                    ),
                  },
                  { label: t('detail.responseNote'), value: assignment.responseNote, hidden: !assignment.responseNote },
                ]}
              />
            )}
          </div>
        ) : (
          <SectionEmpty>{t('noTechnician')}</SectionEmpty>
        )}
      </CardBody>
    </Card>
  )
}

export function ScheduleCard({ item, schedules }: { item: ServiceItemProviderView; schedules: ScheduleResponse[] }) {
  const { t } = useTranslation('work')
  const { lang } = useLang()
  const current = schedules.find((s) => s.isCurrent)
  return (
    <Card>
      <CardHeader title={t('detail.schedule')} />
      <CardBody>
        {item.scheduledStart ? (
          <div className="space-y-1">
            <p className="tabular ltr-nums text-base font-semibold">
              {formatDateTime(item.scheduledStart, lang)}
              {item.scheduledEnd && <span className="text-muted-foreground"> – {formatTime(item.scheduledEnd)}</span>}
            </p>
            {current?.note && <p className="text-xs text-muted-foreground">{current.note}</p>}
          </div>
        ) : (
          <SectionEmpty>{t('detail.noSchedule')}</SectionEmpty>
        )}
      </CardBody>
    </Card>
  )
}

export function DevicesCard({ item }: { item: ServiceItemProviderView }) {
  const { t } = useTranslation('work')
  const devices = [...item.devices].sort((a, b) => a.sequence - b.sequence)
  return (
    <Card>
      <CardHeader title={`${t('detail.devices')}${devices.length ? ` (${devices.length})` : ''}`} />
      <CardBody>
        {devices.length === 0 ? (
          <SectionEmpty>{t('detail.noDevices')}</SectionEmpty>
        ) : (
          <ul className="divide-y">
            {devices.map((d) => (
              <li key={d.id} className="py-2.5 first:pt-0 last:pb-0">
                <p className="font-medium">
                  <span className="text-xs text-muted-foreground">{t('detail.device', { n: d.sequence })} · </span>
                  {d.name}
                  {(d.brand || d.model) && <span className="text-sm font-normal text-muted-foreground"> — {[d.brand, d.model].filter(Boolean).join(' ')}</span>}
                </p>
                <dl className="mt-1 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                  {d.issueDescription && (
                    <>
                      <dt className="text-xs text-muted-foreground">{t('detail.issue')}</dt>
                      <dd>{d.issueDescription}</dd>
                    </>
                  )}
                  {d.diagnosisNotes && (
                    <>
                      <dt className="text-xs text-muted-foreground">{t('detail.diagnosis')}</dt>
                      <dd className="rounded-md bg-tone-active-soft px-2 py-1">{d.diagnosisNotes}</dd>
                    </>
                  )}
                  {d.serialNumber && (
                    <>
                      <dt className="text-xs text-muted-foreground">{t('detail.serial')}</dt>
                      <dd className="ltr-nums font-mono text-xs">{d.serialNumber}</dd>
                    </>
                  )}
                </dl>
              </li>
            ))}
          </ul>
        )}
        {item.completionNotes && (
          <div className="mt-3 border-t pt-3">
            <p className="text-xs text-muted-foreground">{t('detail.completionNotes')}</p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm">{item.completionNotes}</p>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

/** `workflow[]` as a stepper: Done / Current / Pending (§8.4). */
export function WorkflowCard({ steps, item }: { steps: ExecutionStepResponse[]; item: ServiceItemProviderView }) {
  const { t } = useTranslation('work')
  const { lang } = useLang()
  return (
    <Card>
      <CardHeader title={t('detail.workflow')} description={<EnumText enum="ExecutionMode" value={item.executionMode} />} />
      <CardBody>
        {steps.length === 0 ? (
          <SectionEmpty>{t('common:common.noData')}</SectionEmpty>
        ) : (
          <ol className="relative space-y-3 ps-8">
            <span className="absolute inset-y-2 start-3 w-px bg-border" aria-hidden />
            {steps.map((s, i) => {
              const Icon = s.state === 'Done' ? Check : s.state === 'Current' ? PlayCircle : Circle
              return (
                <li key={`${s.step}-${i}`} className="relative" aria-current={s.state === 'Current' ? 'step' : undefined}>
                  <span
                    className={cn(
                      'absolute -start-8 flex size-6 items-center justify-center rounded-full ring-4 ring-surface',
                      s.state === 'Done' ? 'bg-tone-success text-surface' : s.state === 'Current' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('text-sm', s.state === 'Current' ? 'font-semibold' : s.state === 'Pending' ? 'text-muted-foreground' : 'font-medium')}>
                      {enumLabel('ExecutionStep', s.step, lang)}
                    </span>
                    {s.state === 'Current' && <Badge tone="active">{t('detail.workflowState.Current')}</Badge>}
                    {s.optional && <span className="text-xs text-muted-foreground">({t('detail.optionalStep')})</span>}
                    <span className="sr-only">{t(`detail.workflowState.${s.state}`, { defaultValue: s.state })}</span>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardBody>
    </Card>
  )
}

export function MilestonesCard({ item }: { item: ServiceItemProviderView }) {
  const { t } = useTranslation('work')
  const { lang } = useLang()
  const rows: Array<[string, string | null]> = [
    ['created', item.createdAt],
    ['accepted', item.acceptedAt],
    ['enRoute', item.enRouteAt],
    ['arrived', item.arrivedAt],
    ['started', item.startedAt],
    ['executorCompleted', item.executorCompletedAt],
    ['customerConfirmed', item.customerConfirmedAt],
    ['completed', item.completedAt],
    ['cancelled', item.cancelledAt],
  ]
  const shown = rows.filter(([, v]) => v)
  return (
    <Card>
      <CardHeader title={t('detail.milestones')} />
      <CardBody>
        <dl className="space-y-1.5 text-sm">
          {shown.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{t(`detail.milestone.${key}`)}</dt>
              <dd>
                <DateTime value={value} mode="absolute" className="text-xs" />
              </dd>
            </div>
          ))}
        </dl>
        {item.cancelledAt && (
          <p className="mt-2 text-xs text-muted-foreground">
            {item.cancelledBy && t('detail.cancelledBy', { by: enumLabel('CancellationInitiator', item.cancelledBy, lang) })}
            {item.cancellationReason && <span className="block">{item.cancellationReason}</span>}
          </p>
        )}
      </CardBody>
    </Card>
  )
}

const STAGE_ORDER = Object.keys(EvidenceStageMap) as EvidenceStage[]

/** Photos grouped by stage: صور العميل · قبل · أثناء · بعد · الاستلام · التسليم. */
export function PhotosSection({ evidence }: { evidence: EvidenceResponse[] }) {
  const { t } = useTranslation('work')
  const { lang } = useLang()
  const [lightbox, setLightbox] = useState<EvidenceResponse | null>(null)
  if (!evidence.length) return <EmptyState title={t('detail.photos.empty')} />

  const groups = STAGE_ORDER.map((stage) => ({ stage, items: evidence.filter((e) => e.stage === stage) })).filter((g) => g.items.length)
  const unknown = evidence.filter((e) => !STAGE_ORDER.includes(e.stage))
  if (unknown.length) groups.push({ stage: unknown[0]!.stage, items: unknown })

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section key={g.stage}>
          <h3 className="mb-2 text-sm font-semibold">
            {enumLabel('EvidenceStage', g.stage, lang)} <span className="tabular text-muted-foreground">({g.items.length})</span>
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {g.items.map((e) => {
              const url = fileUrl(e.url) ?? ''
              const video = e.type === 'Video' || isVideo(url)
              const doc = e.type === 'Document' || isPdf(url)
              return (
                <figure key={e.id} className="overflow-hidden rounded-md border bg-muted/40">
                  {doc ? (
                    <a href={url} target="_blank" rel="noreferrer" className="flex aspect-[4/3] flex-col items-center justify-center gap-1 text-xs text-primary hover:underline">
                      <FileText className="size-8" aria-hidden />
                      {t('detail.photos.openFile')}
                    </a>
                  ) : video ? (
                    <video src={url} controls preload="metadata" className="aspect-[4/3] w-full bg-black object-contain" />
                  ) : (
                    <button type="button" onClick={() => setLightbox(e)} className="block aspect-[4/3] w-full">
                      <img src={url} alt={e.caption ?? enumLabel('EvidenceStage', e.stage, lang)} loading="lazy" className="size-full object-cover" />
                    </button>
                  )}
                  <figcaption className="space-y-0.5 p-2 text-xs">
                    {e.caption && <p className="line-clamp-2">{e.caption}</p>}
                    <p className="text-muted-foreground">
                      <EnumText enum="ActorType" value={e.uploadedByType} /> · <DateTime value={e.createdAt} />
                    </p>
                  </figcaption>
                </figure>
              )
            })}
          </div>
        </section>
      ))}
      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent size="2xl" className="bg-black p-2" aria-describedby={undefined}>
          <DialogTitle className="sr-only">{lightbox?.caption ?? enumLabel('EvidenceStage', lightbox?.stage, lang)}</DialogTitle>
          {lightbox && <img src={fileUrl(lightbox.url)} alt={lightbox.caption ?? ''} className="max-h-[80vh] w-full object-contain" />}
          {lightbox?.caption && <p className="p-2 text-center text-sm text-white">{lightbox.caption}</p>}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function QuotationsSection({ quotations }: { quotations: QuotationResponse[] }) {
  const { t } = useTranslation('work')
  if (!quotations.length) return <EmptyState title={t('common:common.noData')} />
  const rows = [...quotations].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  return (
    <div className="space-y-4">
      {rows.map((q) => (
        <Card key={q.id}>
          <CardHeader
            title={
              <span className="flex flex-wrap items-center gap-2">
                <span className="ltr-nums font-mono">{q.quotationNumber}</span>
                <StatusBadge enum="QuotationStatus" value={q.status} />
              </span>
            }
            actions={<Money value={q.total} className="text-base font-semibold" />}
          />
          <CardBody className="space-y-4">
            <KeyValue
              columns={3}
              items={[
                { label: t('detail.quotation.sentAt'), value: q.sentAt ? <DateTime value={q.sentAt} mode="absolute" /> : null },
                { label: t('detail.quotation.expiresAt'), value: q.expiresAt ? <DateTime value={q.expiresAt} mode="absolute" /> : null },
                { label: t('detail.quotation.respondedAt'), value: q.respondedAt ? <DateTime value={q.respondedAt} mode="absolute" /> : null },
                { label: t('detail.quotation.notes'), value: q.notes, wide: true, hidden: !q.notes },
                { label: t('detail.quotation.customerNote'), value: q.customerResponseNote, wide: true, hidden: !q.customerResponseNote },
              ]}
            />
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <THead>
                  <Tr>
                    <Th>{t('detail.quotation.itemType')}</Th>
                    <Th>{t('detail.quotation.description')}</Th>
                    <Th className="text-end">{t('detail.quotation.quantity')}</Th>
                    <Th className="text-end">{t('detail.quotation.unitPrice')}</Th>
                    <Th className="text-end">{t('detail.quotation.lineTotal')}</Th>
                  </Tr>
                </THead>
                <TBody>
                  {q.items.map((line) => (
                    <Tr key={line.id}>
                      <Td>
                        <StatusBadge enum="PriceItemType" value={line.itemType} dot={false} />
                      </Td>
                      <Td>{line.description}</Td>
                      <Td className="tabular text-end">{line.quantity}</Td>
                      <Td className="text-end">
                        <Money value={line.unitPrice} />
                      </Td>
                      <Td className="text-end">
                        <Money value={line.total} />
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
            <dl className="ms-auto max-w-xs space-y-1 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t('detail.quotation.subtotal')}</dt>
                <dd>
                  <Money value={q.subtotal} />
                </dd>
              </div>
              {q.discountAmount > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t('detail.quotation.discount')}</dt>
                  <dd>
                    <Money value={-q.discountAmount} signed />
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-3 font-semibold">
                <dt>{t('detail.quotation.total')}</dt>
                <dd>
                  <Money value={q.total} />
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>
      ))}
    </div>
  )
}

export function AssignmentsSection({ assignments }: { assignments: AssignmentResponse[] }) {
  const { t } = useTranslation('work')
  if (!assignments.length) return <EmptyState title={t('common:common.noData')} />
  const rows = [...assignments].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  return (
    <Card className="overflow-x-auto">
      <Table>
        <THead>
          <Tr>
            <Th>{t('detail.assignmentCols.createdAt')}</Th>
            <Th>{t('detail.assignmentCols.type')}</Th>
            <Th>{t('detail.assignmentCols.status')}</Th>
            <Th>{t('detail.assignmentCols.executor')}</Th>
            <Th>{t('detail.assignmentCols.by')}</Th>
            <Th>{t('detail.assignmentCols.reason')}</Th>
            <Th>{t('detail.assignmentCols.response')}</Th>
          </Tr>
        </THead>
        <TBody>
          {rows.map((a) => (
            <Tr key={a.id}>
              <Td>
                <DateTime value={a.createdAt} mode="absolute" className="text-xs" />
              </Td>
              <Td>
                <StatusBadge enum="AssignmentType" value={a.type} dot={false} />
              </Td>
              <Td>
                <StatusBadge enum="AssignmentStatus" value={a.status} />
              </Td>
              <Td className="text-xs">{a.executorName ?? '—'}</Td>
              <Td className="text-xs">
                <EnumText enum="ActorType" value={a.assignedByType} />
              </Td>
              <Td className="max-w-[12rem] text-xs">{a.reason ?? '—'}</Td>
              <Td className="max-w-[14rem] text-xs">
                {a.responseNote ?? '—'}
                {a.respondedAt && (
                  <div className="text-muted-foreground">
                    <DateTime value={a.respondedAt} />
                  </div>
                )}
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </Card>
  )
}

export function SchedulesSection({ schedules }: { schedules: ScheduleResponse[] }) {
  const { t } = useTranslation('work')
  const { lang } = useLang()
  if (!schedules.length) return <EmptyState title={t('common:common.noData')} />
  const rows = [...schedules].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  return (
    <Card className="overflow-x-auto">
      <Table>
        <THead>
          <Tr>
            <Th>{t('detail.scheduleCols.window')}</Th>
            <Th>{t('detail.scheduleCols.by')}</Th>
            <Th>{t('detail.scheduleCols.note')}</Th>
            <Th>{t('detail.scheduleCols.createdAt')}</Th>
          </Tr>
        </THead>
        <TBody>
          {rows.map((s) => (
            <Tr key={s.id} className={cn(s.isCurrent && 'bg-primary-soft')}>
              <Td className="tabular ltr-nums whitespace-nowrap text-sm">
                {formatDateTime(s.scheduledStart, lang)} – {formatTime(s.scheduledEnd)}
                {s.isCurrent && (
                  <Badge tone="active" className="ms-2">
                    {t('schedule.current')}
                  </Badge>
                )}
              </Td>
              <Td className="text-xs">
                <EnumText enum="ActorType" value={s.scheduledByType} />
              </Td>
              <Td className="max-w-[16rem] text-xs">{s.note ?? '—'}</Td>
              <Td>
                <DateTime value={s.createdAt} className="text-xs text-muted-foreground" />
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </Card>
  )
}
