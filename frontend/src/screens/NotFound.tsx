'use client'

import { useNavigate } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { HomeIcon } from '@/components/icons'
import { useDocumentTitle } from '@/lib/use-document-title'

export function NotFound() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  useDocumentTitle(t('notFound.title'))

  return (
    <div className="grid min-h-dvh place-items-center bg-bg p-6">
      <div className="surface max-w-md p-8 text-center">
        <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-green/[0.08] text-green">
          <HomeIcon className="size-6" />
        </span>
        <p className="text-[13px] font-800 uppercase tracking-wide text-muted">404</p>
        <h1 className="mt-2 text-[19px] font-800 text-ink">{t('notFound.title')}</h1>
        <p className="mt-2 text-[14px] font-500 leading-relaxed text-muted">{t('notFound.body')}</p>
        <div className="mt-6 flex justify-center">
          <Button onClick={() => navigate('/')}>
            <HomeIcon className="size-[18px]" />
            {t('notFound.home')}
          </Button>
        </div>
      </div>
    </div>
  )
}
