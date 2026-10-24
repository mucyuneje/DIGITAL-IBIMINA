'use client'

import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheckIcon } from 'lucide-react'
import { Link, Navigate, useLocation } from '@/lib/router'
import { useAuth } from '@/state/AuthContext'
import { PageHeading } from '@/components/page-heading'
import { DeskIcon } from '@/components/icons'
import { DESK_TOOLS } from './desk-tools'

/**
 * The desk shell (R32): on PC the tool master list sits on the left and the
 * active tool on the right. The list is `lg` only, so the phone keeps the
 * card grid in DeskHub as its entry point and the tool routes stay exactly
 * as they were.
 *
 * The header line ("Officers only · PIN required") belongs to the shell, so
 * it is visible on every desk screen — but on the phone it only shows on the
 * hub, where the tool pages keep their own back button and title.
 */
export function DeskFrame({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const location = useLocation()

  if (session && session.role === 'member') return <Navigate to="/403" replace />

  const active = DESK_TOOLS.find((tool) => location.pathname.startsWith(tool.to))

  return (
    <div className="flex flex-col gap-6">
      <div className={active ? 'hidden lg:block' : undefined}>
        <PageHeading
          icon={DeskIcon}
          title={t('desk.title')}
          description={t('desk.sub')}
          meta={
            <p className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-[12px] font-700 text-pending">
              <ShieldCheckIcon className="size-3.5" aria-hidden="true" />
              {t('desk.officersOnly')}
            </p>
          }
        />
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(220px,264px)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <nav className="hidden lg:flex lg:flex-col lg:gap-1.5" aria-label={t('desk.tools')}>
          {DESK_TOOLS.map((tool) => {
            const isActive = active?.to === tool.to
            return (
              <Link
                key={tool.to}
                to={tool.to}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex items-start gap-3 rounded-2xl border px-3 py-3 transition-colors duration-150',
                  isActive
                    ? 'border-gold bg-gold-soft'
                    : 'border-line bg-card hover:bg-ink/[0.03]',
                ].join(' ')}
              >
                <span
                  className={[
                    'grid size-9 shrink-0 place-items-center rounded-xl',
                    isActive ? 'bg-gold/25 text-pending' : 'bg-green/[0.07] text-green',
                  ].join(' ')}
                >
                  {tool.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-800 text-ink">
                    {t(tool.labelKey)}
                  </span>
                  <span className="mt-0.5 block text-[12px] font-500 leading-snug text-muted">
                    {t(tool.subKey)}
                  </span>
                </span>
                {isActive ? (
                  <span className="shrink-0 rounded-full bg-gold px-2 py-0.5 text-[10px] font-800 uppercase tracking-wide text-ink">
                    {t('desk.selected')}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
