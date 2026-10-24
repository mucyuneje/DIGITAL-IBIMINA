'use client'

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { WelcomeLayout } from './WelcomeLayout'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PhoneNumberField } from '@/components/phone-field'
import { useAuth } from '@/state/AuthContext'
import { ArrowLeftIcon, RotateCwIcon, SendIcon, ShieldCheckIcon } from 'lucide-react'
import { waitForSession } from '@/lib/session'
import { translateError } from '@/lib/errors'
import { formatRwandanPhone, isValidRwandanPhone, normalizePhone } from '@shared/schema'
import { DEMO_OTP, dataMode } from '@/config'

type Step = 'phone' | 'otp'

export function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { requestOtp, confirmOtp, busy } = useAuth()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(0)
  const timer = useRef<number | null>(null)

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current)
  }, [])

  const startCountdown = () => {
    setSeconds(60)
    if (timer.current) window.clearInterval(timer.current)
    timer.current = window.setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          if (timer.current) window.clearInterval(timer.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const sendCode = async () => {
    setError(null)
    if (!isValidRwandanPhone(phone)) {
      setError(t('auth.phoneInvalid'))
      return
    }
    try {
      await requestOtp(normalizePhone(phone))
      setStep('otp')
      startCountdown()
    } catch (cause) {
      setError(translateError(t, cause))
    }
  }

  const verify = async () => {
    setError(null)
    try {
      await confirmOtp(code.trim())
      const outcome = await waitForSession()
      navigate(outcome === 'member' ? '/' : '/welcome/join', { replace: true })
    } catch (cause) {
      setError(translateError(t, cause))
    }
  }

  return (
    <WelcomeLayout
      title={step === 'phone' ? t('auth.welcomeBack') : t('auth.otpTitle')}
      subtitle={
        step === 'phone'
          ? t('auth.phoneHint')
          : t('auth.otpSentTo', { phone: formatRwandanPhone(phone) })
      }
    >
      {step === 'phone' ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void sendCode()
          }}
        >
          <Field id="login-phone" className="gap-1.5">
            <FieldLabel className="text-[13px] font-700">{t('auth.phone')}</FieldLabel>
            <PhoneNumberField
              value={phone}
              onValueChange={setPhone}
              invalid={Boolean(error)}
              autoFocus
              aria-label={t('auth.phone')}
              aria-describedby={error ? 'login-phone-error' : 'login-phone-hint'}
            />
            {error ? (
              <FieldError id="login-phone-error">{error}</FieldError>
            ) : (
              <FieldDescription id="login-phone-hint" className="text-[12px]">
                {t('auth.phoneHint')}
              </FieldDescription>
            )}
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? (
              <span className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
            ) : (
              <SendIcon className="size-[18px]" aria-hidden="true" />
            )}
            {busy ? t('auth.sending') : t('auth.sendCode')}
          </Button>
        </form>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void verify()
          }}
        >
          <Field id="login-otp" className="gap-1.5">
            <FieldLabel className="text-[13px] font-700">{t('auth.otp')}</FieldLabel>
            <Input
              id="login-otp"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? 'login-otp-error' : undefined}
              className="tracking-[0.4em]"
            />
            <FieldError id="login-otp-error">{error}</FieldError>
          </Field>
          {dataMode === 'demo' ? (
            <p className="-mt-1 text-[12px] font-700 text-pending">
              {t('auth.demoCode', { code: DEMO_OTP })}
            </p>
          ) : null}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? (
              <span className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
            ) : (
              <ShieldCheckIcon className="size-[18px]" aria-hidden="true" />
            )}
            {t('auth.verify')}
          </Button>
          <div className="flex items-center justify-between text-[13px] font-700">
            <button
              type="button"
              className="inline-flex min-h-9 items-center gap-1.5 text-muted hover:text-ink"
              onClick={() => {
                setStep('phone')
                setCode('')
                setError(null)
              }}
            >
              <ArrowLeftIcon className="size-4" aria-hidden="true" />
              {t('common.back')}
            </button>
            <button
              type="button"
              disabled={seconds > 0}
              className="inline-flex min-h-9 items-center gap-1.5 text-green disabled:text-muted/60"
              onClick={() => void sendCode()}
            >
              <RotateCwIcon className="size-4" aria-hidden="true" />
              {seconds > 0 ? t('auth.resendIn', { seconds }) : t('auth.resend')}
            </button>
          </div>
        </form>
      )}

      <p className="mt-6 text-[13px] font-500 text-muted">
        {t('auth.noAccount')}{' '}
        <Link to="/welcome/create" className="font-700 text-green underline underline-offset-4">
          {t('welcome.create')}
        </Link>
        {' · '}
        <Link to="/welcome/join" className="font-700 text-green underline underline-offset-4">
          {t('welcome.join')}
        </Link>
      </p>
    </WelcomeLayout>
  )
}
