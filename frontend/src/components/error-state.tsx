'use client'

import { useTranslation } from 'react-i18next'
import { RefreshCwIcon, TriangleAlertIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

/**
 * Consistent in-screen failure surface: an explanation plus a retry action.
 *
 * Used by `AsyncBoundary` and by screens that read a single async source, so
 * a network failure never leaves the user staring at a blank page.
 */
export function ErrorState({
  title,
  body,
  onRetry,
}: {
  title?: string
  body?: string
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  return (
    <Empty className="border border-line">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlertIcon className="size-6 text-danger" />
        </EmptyMedia>
        <EmptyTitle>{title ?? t('states.errorTitle')}</EmptyTitle>
        <EmptyDescription>{body ?? t('states.errorBody')}</EmptyDescription>
      </EmptyHeader>
      {onRetry ? (
        <EmptyContent>
          <Button variant="outline" onClick={onRetry}>
            <RefreshCwIcon className="size-4" aria-hidden="true" />
            {t('action.retry')}
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  )
}
