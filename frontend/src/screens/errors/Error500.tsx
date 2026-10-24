'use client'

import { useNavigate } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { RotateCwIcon } from 'lucide-react'
import { HomeIcon } from '@/components/icons'

export function Error500() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="grid min-h-dvh place-items-center bg-bg p-6">
      <div className="surface max-w-md p-8 text-center">
        <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-danger-bg text-danger">
          <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
            <path
              d="M12 8v5m0 3.5h.01M10.3 3.9L2.6 17.4A2 2 0 004.3 20.5h15.4a2 2 0 001.7-3.1L13.7 3.9a2 2 0 00-3.4 0z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <p className="text-[13px] font-800 uppercase tracking-wide text-muted">500</p>
        <h1 className="mt-2 text-[19px] font-800 text-ink">{t('error500.title')}</h1>
        <p className="mt-2 text-[14px] font-500 leading-relaxed text-muted">{t('error500.body')}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => window.location.reload()}>
            <RotateCwIcon className="size-4" aria-hidden="true" />
            {t('common.retry')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/')}>
            <HomeIcon className="size-[18px]" />
            {t('notFound.home')}
          </Button>
        </div>
      </div>
    </div>
  )
}
