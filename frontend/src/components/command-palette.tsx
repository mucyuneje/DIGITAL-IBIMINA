'use client'

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { useData } from '@/state/DataContext'
import { useAuth } from '@/state/AuthContext'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { MemberAvatar } from '@/components/member-avatar'
import type { PageIcon } from '@/components/page-heading'
import {
  BellIcon,
  BulletinIcon,
  ChatIcon,
  DepositIcon,
  DeskIcon,
  HomeIcon,
  LedgerIcon,
  SettingsIcon,
  ShuffleIcon,
  UsersIcon,
  VaultIcon,
} from '@/components/icons'
import { MegaphoneIcon, VoteIcon } from 'lucide-react'
import { formatAmount } from '@shared/money'
import { currentLanguage } from '@/i18n'

interface PaletteEntry {
  id: string
  group: string
  label: string
  hint?: string
  to: string
  icon?: PageIcon
  avatar?: string
}

/**
 * Global command palette (Cmd/Ctrl-K).
 *
 * One search box across navigation, members, the ledger, petitions and posts —
 * everything the signed-in member can reach without knowing the route names.
 */
export function CommandPalette() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { members, petitions, announcements, auditLogs } = useData()
  const language = currentLanguage()
  const [open, setOpen] = useState(false)

  // Cmd/Ctrl-K toggles; other triggers dispatch `ibimina:palette` to open.
  useEffect(() => {
    const openPalette = () => setOpen(true)
    const onKey = (event: KeyboardEvent) => {
      if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('ibimina:palette', openPalette)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('ibimina:palette', openPalette)
    }
  }, [])

  const isOfficer = session ? session.role !== 'member' : false

  const entries = useMemo<PaletteEntry[]>(() => {
    const nav: PaletteEntry[] = [
      { id: 'nav-home', group: 'nav', label: t('nav.home'), to: '/', icon: HomeIcon },
      {
        id: 'nav-withdrawals',
        group: 'nav',
        label: t('nav.withdrawals'),
        to: '/withdrawals',
        icon: VaultIcon,
      },
      {
        id: 'nav-bulletin',
        group: 'nav',
        label: t('nav.bulletin'),
        to: '/bulletin',
        icon: BulletinIcon,
      },
      {
        id: 'nav-ledger',
        group: 'nav',
        label: t('nav.ledger'),
        to: '/ledger',
        icon: LedgerIcon,
      },
      {
        id: 'nav-members',
        group: 'nav',
        label: t('nav.members'),
        to: '/members',
        icon: UsersIcon,
      },
      {
        id: 'nav-rotation',
        group: 'nav',
        label: t('nav.rotation'),
        to: '/rotation',
        icon: ShuffleIcon,
      },
      {
        id: 'nav-notifications',
        group: 'nav',
        label: t('notifications.title'),
        to: '/notifications',
        icon: BellIcon,
      },
      {
        id: 'nav-deposit',
        group: 'nav',
        label: t('nav.deposit'),
        to: '/deposit',
        icon: DepositIcon,
      },
      {
        id: 'nav-settings',
        group: 'nav',
        label: t('nav.settings'),
        to: '/settings',
        icon: SettingsIcon,
      },
      {
        id: 'nav-help',
        group: 'nav',
        label: t('nav.help'),
        to: '/help',
        icon: ChatIcon,
      },
    ]
    if (isOfficer) {
      nav.push({
        id: 'nav-desk',
        group: 'nav',
        label: t('nav.desk'),
        to: '/desk',
        icon: DeskIcon,
      })
    }

    const memberEntries: PaletteEntry[] = members.map((member) => ({
      id: `member:${member.id}`,
      group: 'members',
      label: member.name,
      hint: t(`roles.${member.role}`),
      to: `/members/${member.id}`,
      avatar: member.name,
    }))

    const petitionEntries: PaletteEntry[] = petitions.map((petition) => ({
      id: `petition:${petition.id}`,
      group: 'petitions',
      label: petition.title,
      hint: formatAmount(petition.amount, language),
      to: `/withdrawals/${petition.id}`,
      icon: VoteIcon,
    }))

    const ledgerEntries: PaletteEntry[] = auditLogs.slice(0, 40).map((log) => ({
      id: `ledger:${log.id}`,
      group: 'ledger',
      label: `${t(`ledger.types.${log.type}`)} · ${log.initiatorName}`,
      hint: formatAmount(log.amount, language),
      to: `/ledger/${log.txnId}`,
      icon: LedgerIcon,
    }))

    const announcementEntries: PaletteEntry[] = announcements.slice(0, 30).map((row) => ({
      id: `ann:${row.id}`,
      group: 'posts',
      label: row.title,
      hint: row.authorName,
      to: '/bulletin',
      icon: MegaphoneIcon,
    }))

    return [
      ...nav,
      ...memberEntries,
      ...petitionEntries,
      ...ledgerEntries,
      ...announcementEntries,
    ]
  }, [t, isOfficer, members, petitions, auditLogs, announcements, language])

  const groupLabel: Record<string, string> = {
    nav: t('palette.nav'),
    members: t('nav.members'),
    petitions: t('palette.petitions'),
    ledger: t('nav.ledger'),
    posts: t('nav.bulletin'),
  }

  const run = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('palette.open')}
        className="flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink lg:hidden"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('palette.open')}
        className="hidden items-center gap-2 rounded-lg border border-line bg-card px-3 py-1.5 text-[12px] font-600 text-muted transition-colors hover:text-ink lg:flex"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        {t('palette.search')}
        <kbd className="ml-2 rounded border border-line bg-bg px-1.5 text-[10px] font-700">⌘K</kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t('palette.title')}
        description={t('palette.description')}
        className="max-w-lg"
      >
        <CommandInput placeholder={t('palette.placeholder')} />
        <CommandList>
          <CommandEmpty>{t('palette.empty')}</CommandEmpty>
          {Object.entries(
            entries.reduce<Record<string, PaletteEntry[]>>((acc, entry) => {
              ;(acc[entry.group] ??= []).push(entry)
              return acc
            }, {}),
          ).map(([key, rows]) => (
            <CommandGroup key={key} heading={groupLabel[key] ?? key}>
              {rows.map((row) => {
                const RowIcon = row.icon
                return (
                  <CommandItem
                    key={row.id}
                    value={`${row.label} ${row.hint ?? ''}`}
                    onSelect={() => run(row.to)}
                  >
                    {row.avatar ? (
                      <MemberAvatar
                        name={row.avatar}
                        size="sm"
                        className="size-5 shrink-0 text-[9px]"
                      />
                    ) : RowIcon ? (
                      <RowIcon className="size-4 shrink-0 opacity-70" aria-hidden="true" />
                    ) : null}
                    <span className="truncate">{row.label}</span>
                    {row.hint ? (
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground group-data-selected/command-item:text-white/80">
                        {row.hint}
                      </span>
                    ) : null}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}
