'use client'

import { useCallback, useState } from 'react'
import { useNavigate } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { WelcomeLayout } from './WelcomeLayout'
import { Button } from '@/components/ui/button'
import { CheckIcon, CopyIcon } from '@/components/icons'
import { HomeIcon, LogInIcon, Share2Icon, TicketIcon, UserPlusIcon } from 'lucide-react'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'

export function Invite() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const { session } = useAuth()
  const { group } = useData()
  const [copied, setCopied] = useState(false)

  const code = session && group ? group.inviteCode : ''

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast.success(t('entry.invite.copied'), code)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      toast.error(t('states.errorTitle'))
    }
  }, [code, t, toast])

  const shareCode = useCallback(async () => {
    const text = `${t('entry.invite.title')}: ${code}\n${t('entry.invite.joinHint')}`
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: t('common.appName'), text })
        return
      } catch {
        /* dismissed or unsupported — fall through to copy */
      }
    }
    await copyCode()
  }, [code, copyCode, t])

  return (
    <WelcomeLayout title={t('entry.invite.title')} subtitle={t('entry.invite.subtitle')}>
      {session ? (
        group ? (
          <div className="animate-rise flex flex-col gap-4">
            <div className="rounded-card border border-green/20 bg-green/[0.05] px-5 py-7 text-center">
              <p className="flex items-center justify-center gap-1.5 text-[12px] font-700 uppercase tracking-wide text-green">
                <TicketIcon className="size-3.5" aria-hidden="true" />
                {t('auth.inviteCode')}
              </p>
              <p
                className="mt-2 break-all text-[34px] leading-none font-800 tracking-[0.14em] text-ink"
                data-testid="invite-code"
              >
                {group.inviteCode}
              </p>
            </div>

            <div className="flex gap-3">
              <Button size="lg" className="w-full" onClick={() => void copyCode()}>
                {copied ? (
                  <CheckIcon className="size-4" aria-hidden="true" />
                ) : (
                  <CopyIcon className="size-4" aria-hidden="true" />
                )}
                {copied ? t('common.copied') : t('common.copy')}
              </Button>
              <Button variant="outline" size="lg" className="w-full" onClick={() => void shareCode()}>
                <Share2Icon className="size-4" aria-hidden="true" />
                {t('common.share')}
              </Button>
            </div>

            <p className="text-[13px] font-500 leading-relaxed text-muted">
              {t('entry.invite.joinHint')}
            </p>
            <p className="text-[12px] font-500 leading-relaxed text-muted/80">
              {t('entry.invite.privacyNote')}
            </p>

            <Button variant="link" onClick={() => navigate('/')}>
              <HomeIcon className="size-4" aria-hidden="true" />
              {t('nav.home')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-[14px] font-500 leading-relaxed text-muted">{t('states.noGroup')}</p>
            <Button variant="outline" onClick={() => navigate('/')}>
              <HomeIcon className="size-4" aria-hidden="true" />
              {t('nav.home')}
            </Button>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-[14px] font-500 leading-relaxed text-muted">
            {t('entry.invite.needSession')}
          </p>
          <Button size="lg" className="w-full" onClick={() => navigate('/welcome/login')}>
            <LogInIcon className="size-4" aria-hidden="true" />
            {t('welcome.login')}
          </Button>
          <div className="flex justify-center">
            <Button variant="link" onClick={() => navigate('/welcome/join')}>
              <UserPlusIcon className="size-4" aria-hidden="true" />
              {t('entry.invite.joinAction')}
            </Button>
          </div>
        </div>
      )}
    </WelcomeLayout>
  )
}
