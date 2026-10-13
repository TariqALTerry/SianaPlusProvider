import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, BadgeCheck, Briefcase, Check, CheckCircle2, Clock, Info, Lock, Send, XCircle } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { toApiError } from '@/api/http'
import { qk } from '@/api/keys'
import type { ProviderOrganizationResponse } from '@/api/types'
import { ConfirmDialog } from '@/components/ActionDialog'
import { DateTime } from '@/components/Format'
import { EnumText, StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { canChangeBusinessModel, useProvider } from '@/app/provider'
import { organizationTabHref } from '@/features/organization/logic'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { cn } from '@/lib/utils'
import { onboardingApi } from './api'
import { isHighlighted, missingStepsFrom, ONBOARDING_STEPS, stepProgress, type StepKey } from './steps'
import './i18n'

/**
 * Onboarding (§8.1): the five-step checklist with a progress ring and "إرسال للمراجعة".
 * Rendered at `/` before approval (HomeRoute) and at `/onboarding`.
 * - Draft: checklist + submit (owner).
 * - Rejected: review notes + checklist + resubmit (owner).
 * - Submitted / UnderReview: waiting state, checklist read-only.
 * - Approved / Trial: a short "approved" state, checklist read-only.
 */
export function OnboardingPage() {
  const { t } = useTranslation('onboarding')
  const { org, isOwner } = useProvider()
  const queryClient = useQueryClient()
  const listRef = useRef<HTMLOListElement>(null)

  const [missing, setMissing] = useState<Set<StepKey>>(() => new Set())
  const [incompleteMessage, setIncompleteMessage] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState(false)

  const status = org.verificationStatus
  const canSubmitNow = status === 'Draft' || status === 'Rejected'
  const inReview = status === 'Submitted' || status === 'UnderReview'
  const approved = status === 'Approved' || status === 'Trial'
  const progress = stepProgress(org.steps)
  const remaining = progress.total - progress.done

  const submit = useAction<void, ProviderOrganizationResponse>({
    mutationFn: onboardingApi.submit,
    invalidate: [qk.organization],
    success: t('submit.success'),
    onSuccess: () => {
      setConfirmOpen(false)
      setMissing(new Set())
      setIncompleteMessage(null)
      setJustSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
  })

  const runSubmit = (fromDialog: boolean) =>
    submit.mutate(undefined, {
      onError: (error) => {
        const e = toApiError(error)
        if (e.errorCode === 'ProviderSubmissionIncomplete') {
          setConfirmOpen(false)
          setMissing(missingStepsFrom(e.details))
          setIncompleteMessage(e.message)
          void queryClient.invalidateQueries({ queryKey: qk.organization })
          requestAnimationFrame(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
        } else if (e.errorCode === 'InvalidProviderStatusTransition') {
          // The status moved under us (submitted elsewhere, reviewed): show the current one.
          setConfirmOpen(false)
          toast.error(e.message)
          void queryClient.invalidateQueries({ queryKey: qk.organization })
        } else if (!fromDialog) {
          toast.error(e.message)
        }
      },
    })

  // An incomplete checklist goes straight to the server so its `missingSteps` drive the
  // highlight; a complete one asks for confirmation first.
  const onSubmitClick = () => {
    if (org.steps.canSubmit) {
      submit.reset()
      setConfirmOpen(true)
    } else runSubmit(false)
  }

  const highlightedCount = ONBOARDING_STEPS.filter((s) => isHighlighted(s.key, missing, org.steps)).length

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Hero
        org={org}
        progress={progress}
        mode={approved ? 'approved' : inReview ? (justSubmitted ? 'submitted' : 'review') : status === 'Rejected' ? 'rejected' : 'draft'}
        action={
          canSubmitNow ? (
            isOwner ? (
              <div className="space-y-2">
                <Button
                  size="lg"
                  onClick={onSubmitClick}
                  loading={submit.isPending && !confirmOpen}
                  className="w-full bg-brand-yellow font-semibold text-brand-deep shadow-sm hover:bg-brand-yellow/90 sm:w-auto"
                >
                  <Send /> {status === 'Rejected' ? t('submit.resubmit') : t('submit.button')}
                </Button>
                <p className="text-xs text-white/80">{remaining > 0 ? t('submit.notReady', { count: remaining }) : t('submit.ready')}</p>
              </div>
            ) : (
              <p className="flex max-w-sm items-start gap-2 rounded-md bg-white/10 px-3 py-2 text-sm text-white/90">
                <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
                {t('submit.ownerOnly')}
              </p>
            )
          ) : approved ? (
            <Button asChild size="lg" className="bg-brand-yellow font-semibold text-brand-deep hover:bg-brand-yellow/90">
              <Link to="/">{t('hero.goHome')}</Link>
            </Button>
          ) : null
        }
      />

      {incompleteMessage && highlightedCount > 0 && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive-soft px-4 py-3 text-sm text-destructive">
          <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">{incompleteMessage}</p>
            <p className="text-xs">{t('submit.incomplete')}</p>
          </div>
        </div>
      )}

      <section aria-labelledby="onboarding-checklist" className="space-y-3">
        <h2 id="onboarding-checklist" className="text-base font-semibold">
          {t('checklist')}
        </h2>
        <ol ref={listRef} className="grid scroll-mt-20 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {ONBOARDING_STEPS.map((step, i) => (
            <li key={step.key}>
              <StepCard
                n={i + 1}
                stepKey={step.key}
                href={organizationTabHref(step.tab)}
                done={org.steps[step.key]}
                highlighted={isHighlighted(step.key, missing, org.steps)}
                editable={canSubmitNow}
              />
            </li>
          ))}
          <li>
            <BusinessModelCard org={org} editable={isOwner && canChangeBusinessModel(status)} />
          </li>
        </ol>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('submit.title')}
        description={t('submit.text')}
        target={org.displayName}
        confirmLabel={
          <>
            <Send /> {t('submit.confirm')}
          </>
        }
        submitting={submit.isPending}
        error={submit.error}
        onSubmit={() => runSubmit(true)}
      />
    </div>
  )
}

// ── Hero ────────────────────────────────────────────────────────────────────

type HeroMode = 'draft' | 'rejected' | 'review' | 'submitted' | 'approved'

function Hero({
  org,
  progress,
  mode,
  action,
}: {
  org: ProviderOrganizationResponse
  progress: { done: number; total: number }
  mode: HeroMode
  action: ReactNode
}) {
  const { t } = useTranslation('onboarding')

  const icon =
    mode === 'approved' ? (
      <BadgeCheck className="size-5" />
    ) : mode === 'submitted' ? (
      <CheckCircle2 className="size-5" />
    ) : mode === 'review' ? (
      <Clock className="size-5" />
    ) : mode === 'rejected' ? (
      <XCircle className="size-5" />
    ) : null

  const title = {
    draft: t('hero.draftTitle', { name: org.displayName }),
    rejected: t('hero.rejectedTitle'),
    review: t('hero.reviewTitle'),
    submitted: t('hero.submittedTitle'),
    approved: t('hero.approvedTitle'),
  }[mode]

  const body = {
    draft: t('hero.draftBody'),
    rejected: t('hero.rejectedBody'),
    review: t('hero.reviewBody'),
    submitted: t('hero.submittedBody'),
    approved: t('hero.approvedBody'),
  }[mode]

  return (
    <section className="hero-gradient relative overflow-hidden rounded-2xl p-5 text-white shadow-sm sm:p-7">
      <div className="brand-pattern absolute inset-0 opacity-90" aria-hidden />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge enum="ProviderVerificationStatus" value={org.verificationStatus} />
          </div>
          <h1 className="flex items-start gap-2 text-xl font-semibold leading-snug sm:text-2xl">
            {icon && <span className="mt-1 shrink-0 text-brand-yellow">{icon}</span>}
            <span>{title}</span>
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-white/85">{body}</p>

          {mode === 'rejected' && org.reviewNotes && (
            <div className="max-w-2xl rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm">
              <p className="text-xs font-medium text-brand-yellow">{t('hero.reviewNotes')}</p>
              <p className="mt-0.5 whitespace-pre-line">{org.reviewNotes}</p>
            </div>
          )}

          {(mode === 'review' || mode === 'submitted') && org.submittedAt && (
            <p className="text-xs text-white/75">
              {t('hero.submittedAt')}: <DateTime value={org.submittedAt} mode="absolute" className="text-white" />
            </p>
          )}

          {action && <div className="pt-1">{action}</div>}
        </div>
        <ProgressRing done={progress.done} total={progress.total} />
      </div>
    </section>
  )
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const { t } = useTranslation('onboarding')
  const size = 112
  const stroke = 10
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const ratio = total ? done / total : 0
  return (
    <div className="relative shrink-0 self-center" role="img" aria-label={t('progressLabel', { done, total })}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-white/20" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          className={cn('transition-[stroke-dashoffset] duration-500', ratio === 1 ? 'stroke-brand-mint' : 'stroke-brand-yellow')}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
        <span className="font-latin text-2xl font-semibold tabular" dir="ltr">
          {t('progress', { done, total })}
        </span>
      </span>
    </div>
  )
}

// ── Cards ───────────────────────────────────────────────────────────────────

function StepCard({
  n,
  stepKey,
  href,
  done,
  highlighted,
  editable,
}: {
  n: number
  stepKey: StepKey
  href: string
  done: boolean
  highlighted: boolean
  editable: boolean
}) {
  const { t } = useTranslation('onboarding')
  const { isRtl } = useLang()
  const Arrow = isRtl ? ArrowLeft : ArrowRight
  const stateLabel = highlighted ? t('missing') : done ? t('done') : t('pending')

  return (
    <Link
      to={href}
      aria-label={`${t('stepNumber', { n })}: ${t(`steps.${stepKey}.title`)} — ${stateLabel}`}
      className={cn(
        'group flex h-full flex-col gap-3 rounded-xl border bg-surface p-4 shadow-sm transition-colors hover:border-primary/50',
        done && 'border-tone-success/30',
        highlighted && 'border-destructive bg-destructive-soft/40 ring-2 ring-destructive/40',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular',
            done ? 'bg-tone-success text-white dark:text-background' : highlighted ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground',
          )}
          aria-hidden
        >
          {done ? <Check className="size-4" /> : n}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t(`steps.${stepKey}.title`)}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t(`steps.${stepKey}.rule`)}</p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 text-xs">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium',
            highlighted ? 'bg-destructive-soft text-destructive' : done ? 'bg-tone-success-soft text-tone-success' : 'bg-tone-waiting-soft text-tone-waiting',
          )}
        >
          <span className={cn('size-1.5 rounded-full', highlighted ? 'bg-destructive' : done ? 'bg-tone-success' : 'bg-tone-waiting')} aria-hidden />
          {stateLabel}
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-primary group-hover:underline">
          {done || !editable ? t('view') : t(`steps.${stepKey}.action`)}
          <Arrow className="size-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  )
}

function BusinessModelCard({ org, editable }: { org: ProviderOrganizationResponse; editable: boolean }) {
  const { t } = useTranslation('onboarding')
  const { isRtl } = useLang()
  const Arrow = isRtl ? ArrowLeft : ArrowRight
  return (
    <Link
      to={organizationTabHref('model')}
      className="group flex h-full flex-col gap-3 rounded-xl border border-dashed bg-surface p-4 transition-colors hover:border-primary/50"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary" aria-hidden>
          <Briefcase className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t('businessModel.title')}</p>
          <p className="mt-0.5 text-sm">
            <EnumText enum="ProviderBusinessModel" value={org.businessModel} />
          </p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 text-xs">
        {editable ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Info className="size-3.5" aria-hidden /> {t('businessModel.locked')}
          </span>
        ) : (
          <span />
        )}
        <span className="inline-flex items-center gap-1 font-medium text-primary group-hover:underline">
          {editable ? t('businessModel.change') : t('businessModel.view')}
          <Arrow className="size-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  )
}
