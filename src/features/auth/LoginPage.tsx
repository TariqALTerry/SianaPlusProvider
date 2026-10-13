import { ArrowLeft, ArrowRight, Building2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation } from 'react-router'
import { sessionEndReasonFor, toApiError } from '@/api/http'
import type { OtpRequestResponse } from '@/api/types'
import { OtpInput } from '@/components/OtpInput'
import { PhoneField } from '@/components/PhoneField'
import { InlineError } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/label'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { formatSaudiMobile, isSaudiMobile, toSaudiE164 } from '@/lib/phone'
import { authApi } from './api'
import { AuthLayout } from './AuthLayout'
import { ContactSupport } from './ContactSupport'
import { acceptSession, useAuthStore, type LogoutNotice } from './authStore'
import { SignInNotice } from './SignInNotice'
import { useCountdown } from './useCountdown'

/** The last code request per phone, so going back and forth keeps the resend countdown (§5.1). */
const lastRequest = new Map<string, OtpRequestResponse>()

/**
 * Sign-in for existing accounts (§5.1): phone → code. Only owners and supervisors get in; a
 * technician is signed out again and pointed to the technician app.
 */
export function LoginPage() {
  const { t } = useTranslation()
  const { isRtl } = useLang()
  const location = useLocation()
  const status = useAuthStore((s) => s.status)
  const storeNotice = useAuthStore((s) => s.notice)
  const clearNotice = useAuthStore((s) => s.clearNotice)

  const [digits, setDigits] = useState(() => (location.state as { phone?: string } | null)?.phone ?? '')
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [otp, setOtp] = useState<OtpRequestResponse | null>(null)
  const [code, setCode] = useState('')
  // An account/tenant 403 at verify time: shown like a sign-out notice.
  const [verifyNotice, setVerifyNotice] = useState<LogoutNotice>(null)

  const phone = toSaudiE164(digits)
  const phoneValid = isSaudiMobile(digits)

  const request = useAction({
    mutationFn: (p: string) => authApi.requestOtp(p),
    onSuccess: (res, p) => {
      lastRequest.set(p, res)
      setOtp(res)
      setCode('')
    },
  })

  const verify = useAction({
    mutationFn: (c: string) => authApi.verifyOtp(phone, c),
    onSuccess: async (auth) => {
      const refused = await acceptSession(auth)
      if (refused) {
        // The store now carries the notice; start over at the phone step.
        setOtp(null)
        setCode('')
      }
    },
  })

  const resendIn = useCountdown(otp?.resendAvailableAt)

  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from && from !== '/login' ? from : '/'} replace />
  }

  const requestError = request.error ? toApiError(request.error) : null
  const verifyError = verify.error ? toApiError(verify.error) : null
  const notRegistered = requestError?.errorCode === 'PhoneNotRegistered'
  // Either step can say the phone belongs to several accounts: sign-in can't continue (§5.1).
  const multipleAccounts = requestError?.errorCode === 'PhoneLinkedToMultipleAccounts' || verifyError?.errorCode === 'PhoneLinkedToMultipleAccounts'

  const useAnotherNumber = () => {
    setOtp(null)
    setCode('')
    setDigits('')
    setPhoneTouched(false)
    request.reset()
    verify.reset()
  }

  const sendCode = (e?: FormEvent) => {
    e?.preventDefault()
    setPhoneTouched(true)
    if (!phoneValid) return
    clearNotice()
    setVerifyNotice(null)
    verify.reset()
    request.mutate(phone, {
      onError: (err) => {
        // A code was sent moments ago: go on to the code step with the countdown we know.
        if (toApiError(err).errorCode === 'OtpResendTooSoon' && !otp) {
          const known = lastRequest.get(phone)
          setOtp(known ?? { phoneNumber: phone, codeLength: 4, expiresAt: '', resendAvailableAt: '' })
        }
      },
    })
  }

  const submitCode = (value: string) => {
    if (verify.isPending || value.length !== (otp?.codeLength ?? 4)) return
    request.reset()
    verify.mutate(value, {
      onError: (err) => {
        const e = toApiError(err)
        const reason = sessionEndReasonFor(e.errorCode)
        if (reason) {
          setVerifyNotice(reason)
          setOtp(null)
          verify.reset()
        } else if (e.errorCode === 'OtpInvalid') {
          setCode('')
        } else if (e.errorCode === 'OtpExpired' || e.errorCode === 'OtpAttemptsExceeded') {
          // Allow an immediate resend.
          setOtp((o) => (o ? { ...o, resendAvailableAt: '' } : o))
          setCode('')
        }
      },
    })
  }

  const notice = verifyNotice ?? storeNotice
  const Back = isRtl ? ArrowRight : ArrowLeft

  return (
    <AuthLayout heroTitle={t('auth.heroTitle')} heroBody={t('auth.heroBody')}>
      <div className="space-y-5 rounded-2xl border bg-surface p-6 shadow-sm sm:p-8">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{t('auth.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('auth.subtitle')}</p>
        </div>

        {notice && <SignInNotice notice={notice} />}

        {multipleAccounts ? (
          <ContactSupport onUseAnotherNumber={useAnotherNumber} />
        ) : !otp ? (
          <form onSubmit={sendCode} className="space-y-4" noValidate>
            <Field
              label={t('auth.phone')}
              htmlFor="phone"
              hint={t('auth.phoneHint')}
              error={phoneTouched && !phoneValid ? t('validation.phone') : undefined}
            >
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

            {notRegistered ? (
              <div role="alert" className="space-y-2 rounded-lg border border-tone-info/30 bg-tone-info-soft px-3 py-2.5 text-sm text-tone-info">
                <p className="font-medium">{t('auth.phoneNotRegistered')}</p>
                <Link to="/join" state={{ phone: digits }} className="inline-flex items-center gap-1.5 font-semibold underline">
                  <Building2 className="size-4" /> {t('auth.registerNow')}
                </Link>
              </div>
            ) : (
              <InlineError error={request.error} />
            )}

            <Button type="submit" size="lg" className="w-full" loading={request.isPending}>
              {t('auth.sendCode')}
            </Button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitCode(code)
            }}
            className="space-y-4"
            noValidate
          >
            <p className="text-sm">
              {t('auth.codeSentTo')}{' '}
              <bdi className="font-latin font-semibold tabular" dir="ltr">
                {formatSaudiMobile(phone)}
              </bdi>
            </p>

            <OtpInput
              length={otp.codeLength || 4}
              value={code}
              onChange={(c) => {
                setCode(c)
                if (verify.error) verify.reset()
              }}
              onComplete={submitCode}
              invalid={verifyError?.errorCode === 'OtpInvalid'}
              disabled={verify.isPending}
              autoFocus
              label={t('auth.code')}
            />

            <InlineError error={verify.error ?? (request.error && requestError?.errorCode !== 'PhoneNotRegistered' ? request.error : null)} />

            <Button type="submit" size="lg" className="w-full" loading={verify.isPending} disabled={code.length !== (otp.codeLength || 4)}>
              {verify.isPending ? t('auth.verifying') : t('auth.verify')}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setOtp(null)
                  setCode('')
                  verify.reset()
                  request.reset()
                }}
              >
                <Back className="size-4" /> {t('auth.changePhone')}
              </button>
              {resendIn > 0 ? (
                <span className="text-muted-foreground tabular">{t('auth.resendIn', { seconds: resendIn })}</span>
              ) : (
                <button type="button" className="font-medium text-primary hover:underline disabled:opacity-50" disabled={request.isPending} onClick={() => sendCode()}>
                  {t('auth.resend')}
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        {t('auth.noAccount')}{' '}
        <Link to="/join" state={{ phone: digits }} className="font-semibold text-primary hover:underline">
          {t('auth.join')}
        </Link>
      </p>
    </AuthLayout>
  )
}
