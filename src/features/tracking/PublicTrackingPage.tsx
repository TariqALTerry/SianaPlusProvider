import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, FileText, Languages, LinkIcon, PackageCheck, RefreshCw, ShieldCheck, Timer } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { fileUrl } from '@/api/files'
import { toApiError } from '@/api/http'
import type { CustomerApprovalDecision, PublicTrackingResponse } from '@/api/types'
import { DateTime, Money } from '@/components/Format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useLang } from '@/hooks/useLang'
import { applyDocumentLanguage, i18next, type Language } from '@/i18n'
import { cn } from '@/lib/utils'
import { trackingApi, trackingKeys } from './api'
import { BranchCard, OpeningHours } from './components/BranchCard'
import { QuotationCard } from './components/QuotationCard'
import { StageBar } from './components/StageBar'
import { isReadyStage, isTokenShaped, pageFailure } from './logic'
import './i18n'

type Notice = 'approved' | 'rejected' | 'changed' | null

/**
 * `/t/{token}` (PROVIDER-BRANCHES-PROVIDER-PLATFORM-PROMPT phase 4 §6): the customer's page for a counter device, opened
 * from WhatsApp. Public: no session, no shell, nothing kept in localStorage. Arabic first; the language button switches
 * this visit only (it never writes the saved language). It does not refresh itself: a "تحديث" button, and a read again
 * when the tab comes back.
 */
export function PublicTrackingPage() {
  const { token } = useParams()
  const valid = isTokenShaped(token)
  const queryClient = useQueryClient()
  const [lang, setLang] = useState<Language>('ar')
  const [notice, setNotice] = useState<Notice>(null)

  // Not `changeLanguage` from '@/i18n': that one saves the choice, and this page keeps nothing.
  useEffect(() => {
    void i18next.changeLanguage(lang)
    applyDocumentLanguage(lang)
  }, [lang])

  const { t } = useTranslation('publicTracking')
  const query = useQuery({
    queryKey: trackingKeys.page(token ?? ''),
    queryFn: ({ signal }) => trackingApi.get(token!, signal),
    enabled: valid,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    document.title = query.data ? `${query.data.shopName} · ${query.data.intakeNumber}` : t('title')
  }, [query.data, t])

  const onDecided = (page: PublicTrackingResponse, decision: CustomerApprovalDecision) => {
    queryClient.setQueryData(trackingKeys.page(token!), page)
    setNotice(decision === 'Approved' ? 'approved' : 'rejected')
  }
  const onStale = () => {
    setNotice('changed')
    void query.refetch()
  }

  const header = (
    <div className="flex items-center justify-end gap-2">
      {query.data && (
        <Button variant="ghost" size="sm" onClick={() => void query.refetch()} loading={query.isFetching} aria-label={t('refresh')}>
          {!query.isFetching && <RefreshCw />} {t('refresh')}
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} lang={lang === 'ar' ? 'en' : 'ar'}>
        <Languages /> {t('language')}
      </Button>
    </div>
  )

  let body: ReactNode
  if (!valid) body = <Failure text={t('notFound')} />
  else if (query.isPending) body = <PageSkeleton />
  else if (query.isError) {
    const kind = pageFailure(toApiError(query.error))
    body =
      kind === 'notFound' ? (
        <Failure text={t('notFound')} />
      ) : (
        <Failure text={kind === 'rateLimited' ? t('rateLimited') : t('loadFailed')} action={<Button onClick={() => void query.refetch()}>{t('retry')}</Button>} />
      )
  } else body = <TrackingBody data={query.data} token={token!} notice={notice} onDecided={onDecided} onStale={onStale} />

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-lg space-y-4 px-4 pb-10 pt-3">
        {header}
        {body}
      </main>
    </div>
  )
}

function Failure({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="mt-16 flex flex-col items-center gap-4 rounded-2xl border bg-surface px-6 py-10 text-center shadow-sm" role="alert">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <LinkIcon className="size-5" aria-hidden />
      </span>
      <p className="text-base font-semibold">{text}</p>
      {action}
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="flex items-center gap-3">
        <Skeleton className="size-14 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  )
}

function Section({ title, icon, children, className }: { title?: ReactNode; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-2 rounded-2xl border bg-surface p-4 shadow-sm', className)}>
      {title && (
        <h2 className="flex items-center gap-2 text-base font-semibold">
          {icon}
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end">{children}</dd>
    </div>
  )
}

function TrackingBody({
  data: d,
  token,
  notice,
  onDecided,
  onStale,
}: {
  data: PublicTrackingResponse
  token: string
  notice: Notice
  onDecided: (page: PublicTrackingResponse, decision: CustomerApprovalDecision) => void
  onStale: () => void
}) {
  const { t } = useTranslation('publicTracking')
  const { pick } = useLang()
  const logo = fileUrl(d.shopLogoUrl)
  const ready = isReadyStage(d.stage)
  // The answer given from this page, once the quotation is no longer pending.
  const shownNotice: Notice =
    notice ?? (!d.pendingQuotation && d.lastDecision ? (d.lastDecision === 'Approved' ? (d.stage === 'InRepair' ? 'approved' : null) : d.stage === 'Diagnosing' ? 'rejected' : null) : null)
  const balance = d.money.balance

  return (
    <>
      <header className="flex items-center gap-3">
        {logo ? (
          <img src={logo} alt="" className="size-14 shrink-0 rounded-xl border bg-white object-contain p-1" />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground" aria-hidden>
            {d.shopName.trim().charAt(0)}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold">{d.shopName}</h1>
          <p className="text-sm text-muted-foreground">
            {t('intake')} <bdi className="ltr-nums font-mono font-semibold text-foreground">{d.intakeNumber}</bdi>
          </p>
          {d.customerFirstName && <p className="truncate text-xs text-muted-foreground">{d.customerFirstName}</p>}
        </div>
      </header>

      <Section>
        <StageBar stage={d.stage} repairOutcome={d.repairOutcome} />
        <p className="text-center text-xs text-muted-foreground">
          {t('refreshed')}: <DateTime value={d.lastUpdateAt} mode="absolute" />
        </p>
      </Section>

      {shownNotice && (
        <p
          role="status"
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium',
            shownNotice === 'approved' ? 'bg-tone-success-soft text-tone-success' : shownNotice === 'rejected' ? 'bg-tone-info-soft text-tone-info' : 'bg-tone-attention-soft text-tone-attention',
          )}
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          {shownNotice === 'approved' ? t('quote.approvedThanks') : shownNotice === 'rejected' ? t('quote.rejectedNoted') : t('quote.changed')}
        </p>
      )}

      {d.pendingQuotation && (
        <QuotationCard key={d.pendingQuotation.id} token={token} quotation={d.pendingQuotation} branchPhone={d.branch.phone} onDecided={onDecided} onStale={onStale} />
      )}

      {ready && (
        <Section title={d.stage === 'NotRepairable' ? t('ready.notRepairable') : t('ready.title')} icon={<PackageCheck className="size-5 text-tone-success" aria-hidden />} className="border-tone-success/40">
          <div
            className={cn(
              'flex items-center justify-between rounded-lg px-3 py-2',
              balance > 0 ? 'bg-tone-attention-soft text-tone-attention' : balance < 0 ? 'bg-tone-info-soft text-tone-info' : 'bg-tone-success-soft text-tone-success',
            )}
          >
            <span className="text-sm font-medium">{balance > 0 ? t('ready.balance') : balance < 0 ? t('ready.credit') : t('ready.nothingDue')}</span>
            {balance !== 0 && <Money value={Math.abs(balance)} className="text-lg font-bold" />}
          </div>
          <p className="text-xs text-muted-foreground">{t('ready.codeNote')}</p>
          {d.branch.closedToday && <Badge tone="danger">{t('branch.closedToday')}</Badge>}
          <OpeningHours branch={d.branch} />
        </Section>
      )}

      {d.stage === 'Delivered' && (
        <Section title={t('delivered.title')} icon={<CheckCircle2 className="size-5 text-tone-success" aria-hidden />}>
          <dl className="space-y-1">
            <Row label={t('delivered.at')}>
              <DateTime value={d.handedOverAt} mode="absolute" />
            </Row>
          </dl>
        </Section>
      )}

      <Section title={t('device.title')}>
        <p className="font-medium">{pick(d.serviceNameAr, d.serviceNameEn)}</p>
        <dl className="space-y-1">
          <Row label={t('device.title')}>{[d.device.name, d.device.brand, d.device.model].filter(Boolean).join(' · ')}</Row>
          {d.device.imeiMasked && (
            <Row label={t('device.imei')}>
              <bdi className="ltr-nums font-mono text-xs">{d.device.imeiMasked}</bdi>
            </Row>
          )}
          {!d.device.imeiMasked && d.device.serialNumberMasked && (
            <Row label={t('device.serial')}>
              <bdi className="ltr-nums font-mono text-xs">{d.device.serialNumberMasked}</bdi>
            </Row>
          )}
          <Row label={t('device.received')}>
            <DateTime value={d.receivedAt} mode="absolute" />
          </Row>
          {d.promisedReadyAt && (
            <Row label={t('device.promised')}>
              <DateTime value={d.promisedReadyAt} mode="absolute" className={cn(d.isLate && 'text-tone-danger')} />
            </Row>
          )}
        </dl>
        {d.device.issue && (
          <div className="text-sm">
            <p className="text-muted-foreground">{t('device.issue')}</p>
            <p className="whitespace-pre-wrap">{d.device.issue}</p>
          </div>
        )}
        {d.isLate && (
          <p className="flex items-center gap-2 rounded-lg bg-tone-attention-soft px-3 py-2 text-sm text-tone-attention">
            <Timer className="size-4 shrink-0" aria-hidden /> {t('device.late')}
          </p>
        )}
      </Section>

      {d.warranty && (
        <Section title={t('warranty.title')} icon={<ShieldCheck className="size-5 text-primary" aria-hidden />}>
          <dl className="space-y-1">
            <Row label={t('warranty.number')}>
              <bdi className="ltr-nums font-mono">{d.warranty.warrantyNumber}</bdi>
            </Row>
            <Row label={t('warranty.endsAt')}>
              <DateTime value={d.warranty.endsAt} mode="date" />{' '}
              <Badge tone={d.warranty.isActive ? 'success' : 'muted'}>{d.warranty.isActive ? t('warranty.active') : t('warranty.ended')}</Badge>
            </Row>
          </dl>
        </Section>
      )}

      <BranchCard branch={d.branch} />

      <Section title={t('documents.title')} icon={<FileText className="size-5 text-muted-foreground" aria-hidden />}>
        <div className="grid gap-2">
          <DocLink href={d.documents.receiptUrl} label={t('documents.receipt')} />
          {d.documents.invoiceUrl && <DocLink href={d.documents.invoiceUrl} label={t('documents.invoice')} />}
          {d.documents.warrantyUrl && <DocLink href={d.documents.warrantyUrl} label={t('documents.warranty')} />}
        </div>
      </Section>
    </>
  )
}

function DocLink({ href, label }: { href: string; label: string }) {
  const url = fileUrl(href)
  if (!url) return null
  return (
    <Button asChild variant="outline" className="h-11 justify-start">
      <a href={url} target="_blank" rel="noopener noreferrer">
        <FileText /> {label}
      </a>
    </Button>
  )
}
