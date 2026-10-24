'use client'

import { useState } from 'react'
import { Link, useNavigate } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { BellIcon } from '@/components/icons'
import { useNotifications } from '@/lib/hooks'
import { markAllSeen, type NotificationKind } from '@/lib/notifications'
import { formatRelative } from '@shared/money'
import { currentLanguage } from '@/i18n'

const KIND_KEY: Record<NotificationKind, string> = {
  voteNeeded: 'notifications.voteNeeded',
  petitionDecided: 'notifications.petitionDecided',
  announcement: 'notifications.announcement',
  payoutDue: 'notifications.payoutDue',
  activity: 'notifications.activity',
}

/** Header bell: unread badge plus a short recent list; "See all" opens the page. */
export function NotificationBell({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const language = currentLanguage()
  const { items, unread } = useNotifications()
  // Local mirror so the badge clears immediately when the popover opens.
  const [seenAt, setSeenAt] = useState<number | null>(null)
  const badge = seenAt ? 0 : unread

  const recent = items.slice(0, 6)
  const dark = tone === 'dark'

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) {
          const at = Date.now()
          markAllSeen(at)
          setSeenAt(at)
        }
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={
              badge > 0
                ? t('notifications.openWithCount', { count: badge })
                : t('notifications.open')
            }
            className={`relative grid size-9 place-items-center rounded-full transition-colors ${
              dark
                ? 'text-white/70 hover:bg-white/10 hover:text-white'
                : 'text-muted hover:bg-ink/[0.06] hover:text-ink'
            }`}
          />
        }
      >
        <BellIcon className="size-5" />
        {badge > 0 ? (
          <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-800 leading-4 text-white">
            {badge > 9 ? '9+' : badge}
          </span>
        ) : null}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 gap-0 p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="text-[14px] font-800 text-ink">{t('notifications.title')}</span>
        </div>

        {recent.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] font-500 text-muted">
            {t('notifications.empty')}
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {recent.map((item) => (
              <li key={item.id}>
                <Link
                  to={item.to}
                  className="flex flex-col gap-0.5 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <span className="text-[13px] font-700 text-ink">
                    {t(KIND_KEY[item.kind], { actor: item.actor ?? '' })}
                  </span>
                  <span className="text-[11px] font-500 text-muted">
                    {formatRelative(item.at, language)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-line p-2">
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className="w-full rounded-lg px-3 py-2 text-center text-[13px] font-700 text-green transition-colors hover:bg-green/[0.06]"
          >
            {t('notifications.seeAll')}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
