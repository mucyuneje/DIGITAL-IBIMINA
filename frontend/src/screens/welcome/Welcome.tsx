'use client'

import { useNavigate } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { WelcomeLayout } from './WelcomeLayout'
import { Button } from '@/components/ui/button'
import { PlusIcon, RwandaFlag, UsersIcon } from '@/components/icons'
import { dataMode } from '@/services'
import { formatRwandanPhone } from '@shared/schema'
import { InfoIcon, LogInIcon } from 'lucide-react'

const DEMO_PHONE_LIST: { phone: string; roleKey: string }[] = [
  { phone: '+250788123456', roleKey: 'roles.president' },
  { phone: '+250788654321', roleKey: 'roles.treasurer' },
  { phone: '+250733112233', roleKey: 'roles.member' },
]

export function Welcome() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <WelcomeLayout title={t('welcome.tagline')} subtitle={t('welcome.subline')}>
      <div className="flex flex-col gap-3">
        <div className="animate-rise">
          <Button
            size="lg"
            className="w-full"
            onClick={() => navigate('/welcome/create')}
          >
            <PlusIcon className="size-[18px]" />
            {t('welcome.create')}
          </Button>
        </div>
        <div className="animate-rise">
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => navigate('/welcome/join')}
          >
            <UsersIcon className="size-[18px]" />
            {t('welcome.join')}
          </Button>
        </div>
      </div>

      <div className="mt-5 flex justify-center">
        <Button variant="link" onClick={() => navigate('/welcome/login')}>
          <LogInIcon className="size-4" aria-hidden="true" />
          {t('welcome.login')}
        </Button>
      </div>

      {dataMode === 'demo' ? (
        <div className="mt-6 flex flex-col gap-3">
          <div className="rounded-card border border-green/15 bg-green/[0.04] p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-700 uppercase tracking-wide text-green">
              <InfoIcon className="size-3.5" aria-hidden="true" />
              {t('welcome.demoHintTitle')}
            </p>
            <p className="mt-1.5 text-[13px] font-500 leading-relaxed text-ink/80">
              {t('welcome.demoHint')}
            </p>
            <ul className="mt-3 space-y-1.5 text-[12px] font-700 text-muted">
              {DEMO_PHONE_LIST.map((row) => (
                <li key={row.phone} className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-chip bg-green/[0.08] px-1.5 py-0.5">
                    <RwandaFlag className="h-3 w-[18px] rounded-[2px] ring-1 ring-ink/10" />
                    {formatRwandanPhone(row.phone)}
                  </span>
                  {t(row.roleKey)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </WelcomeLayout>
  )
}
