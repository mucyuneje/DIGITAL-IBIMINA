'use client'

import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { WelcomeLayout } from './WelcomeLayout'
import { Button } from '@/components/ui/button'
import { ClockIcon, HomeIcon, LockIcon, ShieldIcon } from '@/components/icons'
import { LifeBuoyIcon, LogInIcon } from 'lucide-react'
import { useAuth } from '@/state/AuthContext'
import { useNow } from '@/lib/hooks'

/** Reads the unlock deadline handed over by the caller: ?until=<epoch ms> or ?minutes=<n>. */
function useUnlockDeadline(now: number): number | null {
  const [params] = useSearchParams()
  return useMemo(() => {
    const until = Number(params.get('until'))
    if (Number.isFinite(until) && until > 0) return until
    const minutes = Number(params.get('minutes'))
    if (Number.isFinite(minutes) && minutes > 0) return now + minutes * 60_000
    return null
  }, [params, now])
}

/** Seconds remaining, driven by the clock store — no timers in effects. */
function useRemaining(deadline: number | null, now: number): number {
  return deadline ? Math.max(0, deadline - now) : 0
}

export function Locked() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { session } = useAuth()
  const now = useNow(1_000)
  const deadline = useUnlockDeadline(now)
  const remaining = useRemaining(deadline, now)
  const locked = remaining > 0

  useEffect(() => {
    document.title = `${t('entry.locked.title')} · ${t('common.appName')}`
    return () => {
      document.title = t('common.appName')
    }
  }, [t])

  const totalSeconds = Math.ceil(remaining / 1000)
  const minutesLeft = Math.floor(totalSeconds / 60)
  const secondsLeft = totalSeconds % 60
  const timeLabel = [
    minutesLeft > 0 ? t('entry.locked.minutes', { count: minutesLeft }) : '',
    secondsLeft > 0 || minutesLeft === 0 ? t('entry.locked.seconds', { count: secondsLeft }) : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <WelcomeLayout title={t('entry.locked.title')} subtitle={t('entry.locked.subtitle')}>
      <div className="animate-rise flex flex-col gap-4">
        <div
          className="rounded-card border border-green/20 bg-green/[0.05] px-5 py-7 text-center"
          aria-live="polite"
        >
          {locked ? (
            <>
              <p className="flex items-center justify-center gap-1.5 text-[12px] font-700 uppercase tracking-wide text-green">
                <LockIcon className="size-3.5" aria-hidden="true" />
                {t('entry.locked.unlockTitle')}
              </p>
              <p
                className="mt-2 text-[38px] leading-none font-800 tabular-nums text-ink"
                data-testid="lock-countdown"
              >
                {timeLabel}
              </p>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 text-[17px] font-800 text-green">
              <ClockIcon className="size-5" />
              {t('entry.locked.expired')}
            </div>
          )}
        </div>

        <div className="flex items-start gap-2.5 rounded-card border border-line bg-card px-4 py-3.5">
          <ShieldIcon className="mt-0.5 size-4 shrink-0 text-green" />
          <p className="text-[13px] font-500 leading-relaxed text-muted">
            {t('entry.locked.noBypassNote')}
          </p>
        </div>

        <Button
          size="lg"
          className="w-full"
          onClick={() => navigate(session ? '/' : '/welcome/login')}
        >
          {session ? (
            <HomeIcon className="size-[18px]" aria-hidden="true" />
          ) : (
            <LogInIcon className="size-[18px]" aria-hidden="true" />
          )}
          {session ? t('nav.home') : t('entry.locked.backToSignIn')}
        </Button>

        <div className="flex justify-center">
          <Button variant="link" onClick={() => navigate('/help')}>
            <LifeBuoyIcon className="size-4" aria-hidden="true" />
            {t('entry.locked.helpLink')}
          </Button>
        </div>
      </div>
    </WelcomeLayout>
  )
}
