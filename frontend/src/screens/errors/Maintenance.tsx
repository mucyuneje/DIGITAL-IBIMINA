'use client'

import { useNavigate } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ArrowLeftIcon } from 'lucide-react'
import { ClockIcon } from '@/components/icons'

export function Maintenance() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="grid min-h-dvh place-items-center bg-bg p-6">
      <div className="surface max-w-md p-8 text-center">
        <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-pending-bg text-pending">
          <ClockIcon className="size-6" />
        </span>
        <h1 className="text-[19px] font-800 text-ink">{t('maintenance.title')}</h1>
        <p className="mt-2 text-[14px] font-500 leading-relaxed text-muted">{t('maintenance.body')}</p>
        <p
          role="note"
          className="mt-4 rounded-2xl border border-pending/30 bg-pending-bg px-4 py-3 text-[13px] font-700 text-pending"
        >
          {t('maintenance.status')}
        </p>
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
            {t('common.back')}
          </Button>
        </div>
      </div>
    </div>
  )
}
