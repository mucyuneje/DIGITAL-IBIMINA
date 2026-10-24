'use client'

import { useTranslation } from 'react-i18next'
import { Link, Navigate } from '@/lib/router'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { Card } from '@/components/ui/card'
import { currentLanguage } from '@/i18n'
import { formatCurrency } from '@shared/money'
import { DeskIcon } from '@/components/icons'
import { DESK_TOOLS } from './desk-tools'
import { QuickLoanPreview } from './QuickLoanPreview'

/**
 * The desk hub (R30/R31): the quick loan preview plus the five tools.
 *
 * The card grid is the phone entry point; on PC the master list in DeskFrame
 * takes its place, so the grid is `lg:hidden` and the roomy right pane shows
 * the preview next to the group overview instead.
 */
export function DeskHub() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { group, members, loans } = useData()
  const language = currentLanguage()

  if (session && session.role === 'member') return <Navigate to="/403" replace />

  const activeLoans = loans.filter((loan) => loan.status === 'active').length
  const recipient = members.find((member) => member.id === group?.currentRecipientId)

  return (
    <div className="flex flex-col gap-6">
      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <QuickLoanPreview />

        <Card className="hidden lg:flex lg:flex-col lg:gap-3">
          <h2 className="flex items-center gap-2 text-[17px] font-800 text-ink">
            <DeskIcon className="size-[18px] text-green" aria-hidden="true" />
            {t('deskExtra.overview')}
          </h2>
          <dl className="divide-y divide-line">
            <Row
              label={t('home.groupVault')}
              value={formatCurrency(group?.vaultBalance ?? 0, language)}
            />
            <Row label={t('home.nextPayout')} value={recipient?.name ?? '—'} />
            <Row label={t('common.members')} value={String(members.length)} />
            <Row label={t('desk.loansActive')} value={String(activeLoans)} />
          </dl>
        </Card>
      </div>

      {/* Phone entry point — the PC master list replaces it (R32). */}
      <div>
        <p className="mb-3 text-[13px] font-500 text-muted">{t('deskExtra.hub')}</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:hidden">
          {DESK_TOOLS.map((tool) => (
            <Link key={tool.to} to={tool.to} className="block h-full">
              <Card className="h-full min-w-0 gap-3 transition-colors hover:bg-ink/[0.03]">
                <span className="grid size-11 place-items-center rounded-2xl bg-green/[0.07] text-green">
                  {tool.icon}
                </span>
                <div>
                  <p className="text-[16px] font-800 text-ink">{t(tool.labelKey)}</p>
                  <p className="mt-1 text-[13px] font-500 leading-relaxed text-muted">
                    {t(tool.subKey)}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-[13px] font-500 text-muted">{label}</dt>
      <dd className="truncate text-[14px] font-800 text-ink">{value}</dd>
    </div>
  )
}
