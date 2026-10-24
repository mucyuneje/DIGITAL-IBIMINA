'use client'

import { useTranslation } from 'react-i18next'
import { cn } from 'cn'
import { Spinner } from '@/components/ui/spinner'

/**
 * One branded loading treatment for the whole app.
 *
 * `Spinner` is the source of truth for the animation; this wrapper adds the
 * Ibimina frame (soft card, gold glow, quiet label) so route fallbacks, the
 * session gate and the hydration gate all feel like the same product.
 */
export function LoadingScreen({
  className,
  label,
}: {
  className?: string
  label?: string
}) {
  const { t } = useTranslation()

  return (
    <div
      className={cn('grid w-full place-items-center px-4 py-16', className)}
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative grid size-16 place-items-center rounded-2xl border border-line bg-card shadow-soft">
          <span
            className="absolute inset-2 animate-pulse rounded-xl bg-gold/10"
            aria-hidden="true"
          />
          <Spinner className="relative size-7 text-green" />
        </div>
        <p
          className="text-[11px] font-800 uppercase tracking-[0.18em] text-muted"
          suppressHydrationWarning
        >
          {label ?? t('common.loading')}
        </p>
      </div>
    </div>
  )
}
