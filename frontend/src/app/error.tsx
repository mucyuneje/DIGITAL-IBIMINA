'use client'

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { TriangleAlertIcon } from 'lucide-react'

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown
  retry: () => void
}) {
  const { t } = useTranslation()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className='grid min-h-dvh place-items-center bg-bg p-6'>
      <div className='flex w-full max-w-md flex-col items-center gap-4'>
        <Alert variant='destructive' className='w-full'>
          <TriangleAlertIcon />
          <AlertTitle>{t('states.errorTitle')}</AlertTitle>
          <AlertDescription>{t('errors.generic')}</AlertDescription>
        </Alert>
        <Button onClick={() => retry()}>{t('common.retry')}</Button>
      </div>
    </div>
  )
}
