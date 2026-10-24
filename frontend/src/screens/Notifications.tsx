'use client'

import { useEffect, useMemo, useState } from 'react'
import { Link } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { BellIcon, ChatIcon, DepositIcon } from '@/components/icons'
import { PageHeading, type PageIcon } from '@/components/page-heading'
import {
  ActivityIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  MegaphoneIcon,
  VoteIcon,
  WalletIcon,
} from 'lucide-react'
import { useNotifications } from '@/lib/hooks'
import { markAllSeen, type AppNotification, type NotificationKind } from '@/lib/notifications'
import { formatRelative } from '@shared/money'
import { currentLanguage } from '@/i18n'

const KIND_KEY: Record<NotificationKind, string> = {
  voteNeeded: 'notifications.voteNeeded',
  petitionDecided: 'notifications.petitionDecided',
  announcement: 'notifications.announcement',
  payoutDue: 'notifications.payoutDue',
  activity: 'notifications.activity',
}

const KIND_ICON: Record<NotificationKind, PageIcon> = {
  voteNeeded: VoteIcon,
  petitionDecided: CircleCheckIcon,
  announcement: MegaphoneIcon,
  payoutDue: WalletIcon,
  activity: ActivityIcon,
}

const BADGE_KEY: Record<NotificationKind, string> = {
  voteNeeded: 'notifications.badge.voteNeeded',
  petitionDecided: 'notifications.badge.petitionDecided',
  announcement: 'notifications.badge.announcement',
  payoutDue: 'notifications.badge.payoutDue',
  activity: 'notifications.badge.activity',
}

const TONE: Record<NotificationKind, string> = {
  voteNeeded: 'bg-danger-bg text-danger',
  petitionDecided: 'bg-success-bg text-success',
  announcement: 'bg-ink/[0.06] text-muted',
  payoutDue: 'bg-pending-bg text-pending',
  activity: 'bg-ink/[0.06] text-muted',
}

type Filter = 'all' | 'votes' | 'payouts' | 'deposits' | 'chat'

const FILTER_ICON: Record<Filter, PageIcon> = {
  all: BellIcon,
  votes: VoteIcon,
  payouts: WalletIcon,
  deposits: DepositIcon,
  chat: ChatIcon,
}

function categoryOf(item: AppNotification): Filter {
  return item.category
}

export function Notifications() {
  const { t } = useTranslation()
  const language = currentLanguage()
  const { items } = useNotifications()
  const [filter, setFilter] = useState<Filter>('all')

  // Opening the page clears the badge (same cursor the bell writes).
  useEffect(() => {
    markAllSeen()
  }, [])

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((item) => categoryOf(item) === filter)),
    [items, filter],
  )

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: t('notifications.filterAll') },
    { value: 'votes', label: t('notif.votes') },
    { value: 'payouts', label: t('notif.payouts') },
    { value: 'deposits', label: t('notif.deposits') },
    { value: 'chat', label: t('notif.chat') },
  ]

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <PageHeading
        icon={BellIcon}
        title={t('notifications.title')}
        description={t('notifications.subtitle')}
      />

      <ToggleGroup
        value={[filter]}
        onValueChange={(next) => {
          const value = next[0] as Filter | undefined
          if (value) setFilter(value)
        }}
        className="flex-wrap"
      >
        {filters.map((row) => {
          const FilterIcon = FILTER_ICON[row.value]
          return (
            <ToggleGroupItem
              key={row.value}
              value={row.value}
              className={[
                'h-9 min-w-0 rounded-chip px-3.5 text-[13px] font-700 transition-colors',
                filter === row.value
                  ? 'bg-green text-white'
                  : 'border border-line bg-bg text-muted hover:text-ink',
              ].join(' ')}
            >
              <FilterIcon className="size-3.5" aria-hidden="true" />
              {row.label}
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>

      {filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BellIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle>{t('notifications.empty')}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="py-0">
          <ul className="divide-y divide-line">
            {filtered.map((item) => {
              const KindIcon = KIND_ICON[item.kind]
              return (
                <li key={item.id}>
                  <Link
                    to={item.to}
                    className="flex items-start gap-3 px-4 py-4 transition-colors hover:bg-muted/50 sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={TONE[item.kind]}>
                          <KindIcon className="size-3" aria-hidden="true" />
                          {t(BADGE_KEY[item.kind])}
                        </Badge>
                        <span className="text-[12px] font-500 text-muted">
                          {formatRelative(item.at, language)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[14px] font-700 leading-snug text-ink">
                        {t(KIND_KEY[item.kind], { actor: item.actor ?? '' })}
                      </p>
                    </div>
                    <ChevronRightIcon
                      className="mt-2 size-4 shrink-0 text-muted"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
