'use client'

/**
 * Green-dot "Live" pill (pitch book, R12).
 *
 * The dot pulses so it reads as "this updates by itself" — the demo note
 * next to it explains that the sync is local to this browser.
 */
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'

export function LivePill({ labelKey }: { labelKey: string }) {
  const { t } = useTranslation()

  return (
    <Badge variant="outline" className="gap-1.5">
      <span className="size-1.5 animate-pulse rounded-full bg-success" />
      {t(labelKey)}
    </Badge>
  )
}
