import { AlertOctagon, Clock, FlaskConical, Hourglass, PencilLine } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { useLang } from '@/hooks/useLang'
import { cn } from '@/lib/utils'
import { useProvider } from './provider'

/**
 * The verification banner under the top bar (§6): Draft → complete and submit; Submitted /
 * UnderReview → waiting (yellow); Rejected → red with the review notes; Trial → until when, or
 * that it has ended. Approved shows nothing.
 */
export function StatusBanner() {
  const { t } = useTranslation()
  const { lang } = useLang()
  const { pathname } = useLocation()
  const { org, trialEnded } = useProvider()
  const status = org.verificationStatus
  const onOnboarding = pathname === '/onboarding' || pathname === '/'

  let tone: 'info' | 'waiting' | 'danger' | 'active'
  let Icon = Clock
  let text: string
  let action: { to: string; label: string } | null = null

  switch (status) {
    case 'Draft':
      tone = 'info'
      Icon = PencilLine
      text = t('shell.banner.draft')
      action = onOnboarding ? null : { to: '/onboarding', label: t('shell.banner.openOnboarding') }
      break
    case 'Submitted':
    case 'UnderReview':
      tone = 'waiting'
      Icon = Hourglass
      text = t('shell.banner.review')
      break
    case 'Rejected':
      tone = 'danger'
      Icon = AlertOctagon
      text = org.reviewNotes ? t('shell.banner.rejected', { notes: org.reviewNotes }) : t('shell.banner.rejectedNoNotes')
      action = onOnboarding ? null : { to: '/onboarding', label: t('shell.banner.openProfile') }
      break
    case 'Trial':
      tone = trialEnded ? 'danger' : 'active'
      Icon = FlaskConical
      text = trialEnded
        ? t('shell.banner.trialEnded')
        : org.trialEndsAt
          ? t('shell.banner.trial', { date: formatDate(org.trialEndsAt, lang) })
          : t('shell.banner.trialOpen')
      break
    default:
      return null
  }

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-4 py-2 text-sm md:px-6',
        tone === 'info' && 'border-tone-info/20 bg-tone-info-soft text-tone-info',
        tone === 'waiting' && 'border-brand-yellow/50 bg-brand-yellow/25 text-tone-waiting',
        tone === 'danger' && 'border-tone-danger/20 bg-tone-danger-soft text-tone-danger',
        tone === 'active' && 'border-tone-active/20 bg-tone-active-soft text-tone-active',
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 font-medium">{text}</p>
      {action && (
        <Button asChild size="xs" variant="outline" className="border-current bg-transparent text-current hover:bg-white/40">
          <Link to={action.to}>{action.label}</Link>
        </Button>
      )}
    </div>
  )
}
