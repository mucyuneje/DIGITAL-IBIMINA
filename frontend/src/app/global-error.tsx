'use client'

import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  retry,
}: {
  error: unknown
  retry: () => void
}) {
  const { t } = useTranslation()
  console.error(error)

  return (
    <html lang='rw'>
      <body className='grid min-h-dvh place-items-center bg-bg p-6'>
        <div className='flex flex-col items-center gap-4'>
          <h1 className='text-xl font-800 text-ink'>{t('states.errorTitle')}</h1>
          <p className='text-sm text-muted'>{t('errors.generic')}</p>
          <Button onClick={() => retry()}>{t('common.retry')}</Button>
        </div>
      </body>
    </html>
  )
}
