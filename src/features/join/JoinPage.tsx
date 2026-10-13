import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, Briefcase, Building2, Gavel, Layers, LogIn, Wrench } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { toApiError } from '@/api/http'
import type { OtpRequestResponse, ProviderBusinessModel, ProviderType } from '@/api/types'
import { ChoiceCards } from '@/components/ChoiceCards'
import { CityInput } from '@/components/CityInput'
import { OtpInput } from '@/components/OtpInput'
import { PhoneField } from '@/components/PhoneField'
import { InlineError } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { formatSaudiMobile, isSaudiMobile, toSaudiE164 } from '@/lib/phone'
import { cn } from '@/lib/utils'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { acceptSession, useAuthStore } from '@/features/auth/authStore'
import { SignInNotice } from '@/features/auth/SignInNotice'
import { useCountdown } from '@/features/auth/useCountdown'
import { joinApi } from './api'
import './i18n'

type Step = 1 | 2 | 3

const OTP_ERRORS = new Set(['OtpInvalid', 'OtpExpired', 'OtpAttemptsExceeded'])

const schema = z.object({
  type: z.enum(['Company', 'IndependentTechnician']),
  legalName: z.string().trim().min(1).max(200),
  displayName: z.string().trim().min(1).max(200),
  email: z.union([z.literal(''), z.string().trim().email()]),
  city: z.string().trim().min(1).max(100),
  ownerFullName: z.string().trim().min(1).max(200),
  businessModel: z.enum(['ExecutionPartner', 'MarketplacePartner', 'Both']),
})
type FormValues = z.infer<typeof schema>

function Stepper({ step }: { step: Step }) {
  const { t } = useTranslation('join')
  const labels = [t('steps.phone'), t('steps.code'), t('steps.organization')]
  return (
    <ol className="flex items-center gap-2" aria-label={t('stepOf', { step })}>
      {labels.map((label, i) => {
        const n = (i + 1) as Step
        const done = n < step
        const current = n === step
        return (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={current ? 'step' : undefined}>
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular',
                done ? 'bg-primary text-primary-foreground' : current ? 'bg-brand-teal text-white' : 'bg-muted text-muted-foreground',
              )}
            >
              {n}
            </span>
            <span className={cn('hidden truncate text-xs sm:inline', current ? 'font-medium' : 'text-muted-foreground')}>{label}</span>
            {i < labels.length - 1 && <span className={cn('h-px flex-1', done ? 'bg-primary' : 'bg-border')} aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Self-registration (§5.2): phone → code → organization. The code is only kept in memory and
 * verified together with the registration; the response signs the owner in → onboarding.
 */
export function JoinPage() {
  const { t } = useTranslation('join')
  const { t: tc } = useTranslation()
  const { isRtl } = useLang()
  const location = useLocation()
  const status = useAuthStore((s) => s.status)
  const notice = useAuthStore((s) => s.notice)

  const [step, setStep] = useState<Step>(1)
  const [digits, setDigits] = useState(() => (location.state as { phone?: string } | null)?.phone ?? '')
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [otp, setOtp] = useState<OtpRequestResponse | null>(null)
  const [code, setCode] = useState('')
  // Set just before the session is stored, so the redirect below goes to onboarding (§5.2).
  const [registered, setRegistered] = useState(false)

  const phone = toSaudiE164(digits)
  const phoneValid = isSaudiMobile(digits)
  const codeLength = otp?.codeLength || 4
  const resendIn = useCountdown(otp?.resendAvailableAt)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: undefined, legalName: '', displayName: '', email: '', city: 'الرياض', ownerFullName: '', businessModel: 'ExecutionPartner' },
  })

  const request = useAction({
    mutationFn: (p: string) => joinApi.requestOtp(p),
    onSuccess: (res) => {
      setOtp(res)
      setCode('')
      setStep(2)
    },
  })

  const register = useAction({
    mutationFn: (v: FormValues) =>
      joinApi.register({
        type: v.type as ProviderType,
        legalName: v.legalName.trim(),
        displayName: v.displayName.trim(),
        phone,
        email: v.email.trim() || null,
        city: v.city.trim(),
        ownerFullName: v.ownerFullName.trim(),
        otpCode: code,
        businessModel: v.businessModel as ProviderBusinessModel,
      }),
    onSuccess: async (res) => {
      setRegistered(true)
      const refused = await acceptSession(res.session)
      if (refused) setRegistered(false)
      else toast.success(t('welcome'))
    },
  })

  // Just registered → onboarding. Already signed in (e.g. a bookmarked /join) → home.
  if (status === 'authenticated') return <Navigate to={registered ? '/onboarding' : '/'} replace />

  const requestError = request.error ? toApiError(request.error) : null
  const registerError = register.error ? toApiError(register.error) : null
  const alreadyRegistered = requestError?.errorCode === 'PhoneAlreadyRegistered' || registerError?.errorCode === 'PhoneAlreadyRegistered'

  const sendCode = (e?: FormEvent) => {
    e?.preventDefault()
    setPhoneTouched(true)
    if (!phoneValid) return
    register.reset()
    request.mutate(phone, {
      onError: (err) => {
        // A code went out moments ago: carry on to the code step.
        if (toApiError(err).errorCode === 'OtpResendTooSoon' && step === 1) {
          setOtp({ phoneNumber: phone, codeLength: 4, expiresAt: '', resendAvailableAt: '' })
          setStep(2)
        }
      },
    })
  }

  const submit = form.handleSubmit((v) =>
    register.mutate(v, {
      onError: (err) => {
        const e = toApiError(err)
        // The code is checked here, not in step 2: send the user back to re-enter it.
        if (e.errorCode && OTP_ERRORS.has(e.errorCode)) {
          setCode('')
          if (e.errorCode !== 'OtpInvalid') setOtp((o) => (o ? { ...o, resendAvailableAt: '' } : o))
          setStep(2)
        }
      },
    }),
  )

  const Back = isRtl ? ArrowRight : ArrowLeft
  const errors = form.formState.errors
  const req = tc('validation.required')

  return (
    <AuthLayout heroTitle={t('heroTitle')} heroBody={t('heroBody')}>
      <div className="space-y-5 rounded-2xl border bg-surface p-6 shadow-sm sm:p-8">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Stepper step={step} />
        {notice && <SignInNotice notice={notice} />}

        {alreadyRegistered && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-tone-info/30 bg-tone-info-soft px-3 py-2.5 text-sm text-tone-info">
            <span className="font-medium">{t('phoneAlreadyRegistered')}</span>
            <Link to="/login" state={{ phone: digits }} className="inline-flex items-center gap-1.5 font-semibold underline">
              <LogIn className="size-4" /> {t('goToLogin')}
            </Link>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={sendCode} className="space-y-4" noValidate>
            <Field label={tc('auth.phone')} htmlFor="phone" hint={tc('auth.phoneHint')} error={phoneTouched && !phoneValid ? tc('validation.phone') : undefined}>
              <PhoneField
                id="phone"
                autoFocus
                value={digits}
                onChange={(d) => {
                  setDigits(d)
                  request.reset()
                }}
                aria-invalid={phoneTouched && !phoneValid}
              />
            </Field>
            {!alreadyRegistered && <InlineError error={request.error} />}
            <Button type="submit" size="lg" className="w-full" loading={request.isPending}>
              {tc('auth.sendCode')}
            </Button>
          </form>
        )}

        {step === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (code.length === codeLength) {
                register.reset()
                setStep(3)
              }
            }}
            className="space-y-4"
            noValidate
          >
            <p className="text-sm">
              {registerError && OTP_ERRORS.has(registerError.errorCode ?? '') ? t('codeAgain') : tc('auth.codeSentTo')}{' '}
              <bdi className="font-latin font-semibold tabular" dir="ltr">
                {formatSaudiMobile(phone)}
              </bdi>
            </p>
            <OtpInput
              length={codeLength}
              value={code}
              onChange={setCode}
              onComplete={() => {
                register.reset()
                setStep(3)
              }}
              invalid={registerError?.errorCode === 'OtpInvalid'}
              autoFocus
              label={tc('auth.code')}
            />
            <InlineError error={registerError && OTP_ERRORS.has(registerError.errorCode ?? '') ? register.error : request.error} />
            <Button type="submit" size="lg" className="w-full" disabled={code.length !== codeLength}>
              {t('continue')}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground" onClick={() => setStep(1)}>
                <Back className="size-4" /> {tc('auth.changePhone')}
              </button>
              {resendIn > 0 ? (
                <span className="text-muted-foreground tabular">{tc('auth.resendIn', { seconds: resendIn })}</span>
              ) : (
                <button type="button" className="font-medium text-primary hover:underline disabled:opacity-50" disabled={request.isPending} onClick={() => sendCode()}>
                  {tc('auth.resend')}
                </button>
              )}
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label={t('type')} required error={errors.type ? req : undefined}>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <ChoiceCards
                    label={t('type')}
                    value={field.value}
                    onChange={field.onChange}
                    invalid={!!errors.type}
                    choices={[
                      { value: 'Company', title: t('typeCompany'), hint: t('typeCompanyHint'), icon: Building2 },
                      { value: 'IndependentTechnician', title: t('typeIndependent'), hint: t('typeIndependentHint'), icon: Wrench },
                    ]}
                  />
                )}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('legalName')} htmlFor="legalName" required hint={t('legalNameHint')} error={errors.legalName ? req : undefined}>
                <Input id="legalName" maxLength={200} {...form.register('legalName')} aria-invalid={!!errors.legalName} />
              </Field>
              <Field label={t('displayName')} htmlFor="displayName" required error={errors.displayName ? req : undefined}>
                <Input id="displayName" maxLength={200} {...form.register('displayName')} aria-invalid={!!errors.displayName} />
              </Field>
              <Field label={t('ownerFullName')} htmlFor="ownerFullName" required error={errors.ownerFullName ? req : undefined}>
                <Input id="ownerFullName" maxLength={200} autoComplete="name" {...form.register('ownerFullName')} aria-invalid={!!errors.ownerFullName} />
              </Field>
              <Field label={t('city')} htmlFor="city" required error={errors.city ? req : undefined}>
                <CityInput id="city" {...form.register('city')} aria-invalid={!!errors.city} />
              </Field>
              <Field label={t('email')} htmlFor="email" optional error={errors.email ? tc('validation.email') : undefined} className="sm:col-span-2">
                <Input id="email" type="email" dir="ltr" autoComplete="email" {...form.register('email')} aria-invalid={!!errors.email} />
              </Field>
            </div>

            <Field label={t('businessModel')} required>
              <Controller
                control={form.control}
                name="businessModel"
                render={({ field }) => (
                  <ChoiceCards
                    label={t('businessModel')}
                    value={field.value}
                    onChange={field.onChange}
                    columns={3}
                    choices={[
                      { value: 'ExecutionPartner', title: t('modelExecution'), hint: t('modelExecutionHint'), icon: Briefcase },
                      { value: 'MarketplacePartner', title: t('modelMarketplace'), hint: t('modelMarketplaceHint'), icon: Gavel },
                      { value: 'Both', title: t('modelBoth'), hint: t('modelBothHint'), icon: Layers },
                    ]}
                  />
                )}
              />
            </Field>

            {!alreadyRegistered && !(registerError && OTP_ERRORS.has(registerError.errorCode ?? '')) && <InlineError error={register.error} />}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>
                <Back /> {tc('actions.back')}
              </Button>
              <Button type="submit" size="lg" loading={register.isPending}>
                {t('submit')}
              </Button>
            </div>
          </form>
        )}
      </div>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        {tc('auth.haveAccount')}{' '}
        <Link to="/login" state={{ phone: digits }} className="font-semibold text-primary hover:underline">
          {tc('auth.signIn')}
        </Link>
      </p>
    </AuthLayout>
  )
}
