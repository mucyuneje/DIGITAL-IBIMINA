'use client'

import { useEffect } from 'react'
import { useNavigate } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { WelcomeLayout } from './WelcomeLayout'
import { Button } from '@/components/ui/button'
import { LogInIcon } from 'lucide-react'
import { setExitReason } from '@/lib/exitReason'

export function SessionExpired() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  useEffect(() => {
    document.title = `${t('entry.sessionExpired.title')} · ${t('common.appName')}`
    return () => {
      setExitReason(null)
      document.title = t('common.appName')
    }
  }, [t])

  return (
    <WelcomeLayout
      title={t('entry.sessionExpired.title')}
      subtitle={t('entry.sessionExpired.subtitle')}
    >
      <div className="animate-rise flex flex-col gap-5">
        <Button
          size="lg"
          className="w-full"
          onClick={() => navigate('/welcome/login')}
          autoFocus
        >
          <LogInIcon className="size-[18px]" aria-hidden="true" />
          {t('entry.sessionExpired.signInAgain')}
        </Button>

        <div className="rounded-card border border-line bg-card px-4 py-4">
          <p className="text-[13px] font-800 text-ink">{t('entry.sessionExpired.whyTitle')}</p>
          <p className="mt-1.5 text-[13px] font-500 leading-relaxed text-muted">
            {t('entry.sessionExpired.whyBody')}
          </p>
        </div>
      </div>
    </WelcomeLayout>
  )
}
