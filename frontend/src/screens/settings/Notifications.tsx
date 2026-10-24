'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BellIcon,
  CalendarClockIcon,
  MessageSquareIcon,
  VoteIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react'
import { useToast } from '@/state/ToastContext'
import { Card } from '@/components/ui/card'
import { SettingsPageHeader } from '@/components/settings-page-header'

const STORAGE_KEY = 'ibimina.notify'

interface NotifyFlags {
  deposits: boolean
  votes: boolean
  payouts: boolean
  chat: boolean
}

const DEFAULT_FLAGS: NotifyFlags = {
  deposits: true,
  votes: true,
  payouts: true,
  chat: false,
}

const ROW_ICONS: Record<keyof NotifyFlags, LucideIcon> = {
  deposits: WalletIcon,
  votes: VoteIcon,
  payouts: CalendarClockIcon,
  chat: MessageSquareIcon,
}

function readFlags(): NotifyFlags {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_FLAGS }
    const parsed = JSON.parse(raw) as Partial<NotifyFlags>
    return {
      deposits: typeof parsed.deposits === 'boolean' ? parsed.deposits : DEFAULT_FLAGS.deposits,
      votes: typeof parsed.votes === 'boolean' ? parsed.votes : DEFAULT_FLAGS.votes,
      payouts: typeof parsed.payouts === 'boolean' ? parsed.payouts : DEFAULT_FLAGS.payouts,
      chat: typeof parsed.chat === 'boolean' ? parsed.chat : DEFAULT_FLAGS.chat,
    }
  } catch {
    return { ...DEFAULT_FLAGS }
  }
}

export function SettingsNotifications() {
  const { t } = useTranslation()
  const toast = useToast()
  const [flags, setFlags] = useState<NotifyFlags>(readFlags)

  const toggle = (key: keyof NotifyFlags) => {
    const next: NotifyFlags = { ...flags, [key]: !flags[key] }
    setFlags(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      toast.error(t('errors.generic'))
      return
    }
    toast.success(t('notif.saved'))
  }

  const rows: { key: keyof NotifyFlags; label: string }[] = [
    { key: 'deposits', label: t('notif.deposits') },
    { key: 'votes', label: t('notif.votes') },
    { key: 'payouts', label: t('notif.payouts') },
    { key: 'chat', label: t('notif.chat') },
  ]

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <SettingsPageHeader
        icon={BellIcon}
        tone="gold"
        title={t('notif.title')}
        subtitle={t('settingsIndex.notificationsHint')}
      />

      <Card className="overflow-hidden p-0">
        <div className="flex items-start gap-2.5 border-b border-line px-5 py-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-pending">
            <BellIcon className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-800 text-ink">{t('notif.title')}</h2>
            <p className="mt-0.5 text-[12px] font-500 leading-relaxed text-muted">
              {t('notif.note')}
            </p>
          </div>
        </div>
        <ul className="divide-y divide-line">
          {rows.map((row) => {
            const Icon = ROW_ICONS[row.key]
            const enabled = flags[row.key]
            return (
              <li
                key={row.key}
                className="flex min-h-[64px] items-center gap-3 px-4 py-3 sm:px-5"
              >
                <span
                  className={[
                    'grid size-9 shrink-0 place-items-center rounded-xl transition-colors',
                    enabled ? 'bg-success-bg text-success' : 'bg-ink/[0.055] text-muted',
                  ].join(' ')}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1 text-[14px] font-700 text-ink">{row.label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={row.label}
                  onClick={() => toggle(row.key)}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-green/50 ${
                    enabled ? 'bg-green' : 'bg-ink/15'
                  }`}
                >
                  <span
                    className={`absolute top-1 size-5 rounded-full bg-white shadow transition-transform duration-150 ${
                      enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}
