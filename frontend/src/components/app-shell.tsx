'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { Link, useLocation, useNavigate } from '@/lib/router'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InviteCodeChip } from '@/components/invite-code-chip'
import { LanguageSwitch } from '@/components/language-switch'
import { GroupSwitcher } from '@/components/group-switcher'
import { NotificationBell } from '@/components/notification-bell'
import { CommandPalette } from '@/components/command-palette'
import { FloatingChat } from '@/components/floating-chat'
import {
  BulletinIcon,
  ChatIcon,
  CloseIcon,
  DeskIcon,
  DepositIcon,
  HomeIcon,
  LedgerIcon,
  LogoutIcon,
  MoreIcon,
  SettingsIcon,
  ShuffleIcon,
  UsersIcon,
  VaultIcon,
} from '@/components/icons'
import { TriangleAlertIcon, WifiOffIcon } from 'lucide-react'

interface NavItem {
  to: string
  label: string
  icon: (props: { className?: string }) => ReactNode
  end?: boolean
}

function initialsOf(name: string | undefined): string {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function isActivePath(pathname: string, to: string, end?: boolean): boolean {
  if (end || to === '/') return pathname === to
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { session, signOut } = useAuth()
  const { group } = useData()
  const location = useLocation()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)

  const isOfficer = session ? session.role !== 'member' : false
  const roleLabel = session ? t(`roles.${session.role}`) : ''

  /**
   * Full desktop menu, pitch order: Home, Withdrawals, Bulletin, Audit ledger,
   * Executive Desk (officers only), divider, Members, Rotation, Help.
   * It fits a 1080p viewport without scrolling, so it is a plain flex-1 area.
   */
  const sidebarNav: NavItem[] = [
    { to: '/', label: t('nav.home'), icon: () => <HomeIcon className="size-[19px]" />, end: true },
    {
      to: '/withdrawals',
      label: t('nav.withdrawals'),
      icon: () => <VaultIcon className="size-[19px]" />,
    },
    {
      to: '/bulletin',
      label: t('nav.bulletin'),
      icon: () => <BulletinIcon className="size-[19px]" />,
    },
    {
      to: '/ledger',
      label: t('nav.ledger'),
      icon: () => <LedgerIcon className="size-[19px]" />,
    },
    ...(isOfficer
      ? [
          {
            to: '/desk',
            label: t('nav.desk'),
            icon: () => <DeskIcon className="size-[19px]" />,
          },
        ]
      : []),
  ]

  const sidebarMore: NavItem[] = [
    {
      to: '/members',
      label: t('nav.members'),
      icon: () => <UsersIcon className="size-[19px]" />,
    },
    {
      to: '/rotation',
      label: t('nav.rotation'),
      icon: () => <ShuffleIcon className="size-[19px]" />,
    },
    {
      to: '/help',
      label: t('nav.help'),
      icon: () => <ChatIcon className="size-[19px]" />,
    },
  ]

  /**
   * Four destinations plus a More sheet. Members cannot open the Executive
   * Desk, so the third slot is their Bulletin; officers reach Bulletin from
   * More. This removes the old duplicate Bulletin tab and keeps the bar at
   * five equal targets on a narrow phone.
   */
  const mobileNav: NavItem[] = [
    { to: '/', label: t('nav.home'), icon: () => <HomeIcon className="size-[19px]" />, end: true },
    {
      to: '/withdrawals',
      label: t('nav.withdrawals'),
      icon: () => <VaultIcon className="size-[19px]" />,
    },
    isOfficer
      ? { to: '/desk', label: t('nav.deskShort'), icon: () => <DeskIcon className="size-[19px]" /> }
      : {
          to: '/bulletin',
          label: t('nav.bulletin'),
          icon: () => <BulletinIcon className="size-[19px]" />,
        },
    { to: '/ledger', label: t('nav.audit'), icon: () => <LedgerIcon className="size-[19px]" /> },
  ]

  const moreNav: NavItem[] = [
    ...(isOfficer
      ? [
          {
            to: '/bulletin',
            label: t('nav.bulletin'),
            icon: () => <BulletinIcon className="size-[19px]" />,
          },
        ]
      : []),
    {
      to: '/members',
      label: t('nav.members'),
      icon: () => <UsersIcon className="size-[19px]" />,
    },
    {
      to: '/rotation',
      label: t('nav.rotation'),
      icon: () => <ShuffleIcon className="size-[19px]" />,
    },
    {
      to: '/help',
      label: t('nav.help'),
      icon: () => <ChatIcon className="size-[19px]" />,
    },
    {
      to: '/settings',
      label: t('nav.settings'),
      icon: () => <SettingsIcon className="size-[19px]" />,
    },
  ]

  const moreActive = moreNav.some((item) =>
    isActivePath(location.pathname, item.to, item.end),
  )

  return (
    <div className="min-h-dvh bg-bg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-green focus:px-4 focus:py-2.5 focus:text-[13px] focus:font-700 focus:text-white"
      >
        {t('common.skipToContent')}
      </a>
      <VoiceChips />

      {/* --------------------------------------------------- desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-green text-white lg:flex">
        {/* Top: logo, group name, deposit */}
        <div className="flex items-center gap-3 px-4 pb-2 pt-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold text-ink">
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
              <path
                d="M6 16.5c0-3 2.7-4.5 6-4.5s6 1.5 6 4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-800 leading-none">{t('common.appName')}</p>
            <GroupSwitcher
              tone="dark"
              className="-ml-2 mt-0.5 text-white/60"
              labelClassName="text-[11px] font-500 text-white/60"
              fallback={
                <p className="mt-1 truncate text-[11px] font-500 text-white/60">
                  {group?.name ?? t('states.noGroup')}
                </p>
              }
            />
          </div>
        </div>

        <div className="px-3 pb-2">
          <Button
            size="sm"
            className="w-full bg-gold text-ink hover:bg-gold-deep hover:text-white"
            onClick={() => navigate('/deposit')}
          >
            <DepositIcon className="size-[16px]" />
            {t('nav.deposit')}
          </Button>
        </div>

        {/* Middle: nav owns leftover height. Fits without scrolling at 1080p;
            the ScrollArea only shows a thin bar on very short screens. */}
        <ScrollArea className="min-h-0 flex-1">
          <nav aria-label={t('nav.primary')} className="flex flex-col gap-0.5 px-2 pb-1">
            {sidebarNav.map((item) => (
              <SidebarLink key={item.to} item={item} pathname={location.pathname} />
            ))}
            <div className="mx-2 my-1.5 border-t border-white/10" />
            {sidebarMore.map((item) => (
              <SidebarLink key={item.to} item={item} pathname={location.pathname} />
            ))}
          </nav>
        </ScrollArea>

        {/* Bottom: user card, settings + sign out, invite/language, note */}
        <div className="border-t border-white/10 px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <Avatar size="sm">
              <AvatarFallback className="bg-white/15 text-[11px] font-bold text-white">
                {initialsOf(session?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-700 leading-tight">{session?.name}</p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-white/55">
                {roleLabel}
              </p>
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Link
              to="/settings"
              className={`flex min-h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[12px] font-700 transition-colors ${
                isActivePath(location.pathname, '/settings')
                  ? 'bg-white/15 text-white'
                  : 'text-white/65 hover:bg-white/10 hover:text-white'
              }`}
            >
              <SettingsIcon className="size-[14px]" />
              {t('nav.settings')}
            </Link>
            <NotificationBell tone="dark" />
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex min-h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[12px] font-700 text-white/65 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogoutIcon className="size-[14px]" />
              {t('nav.signOut')}
            </button>
          </div>

          {/* Tiny invite + language row (R14, R15) */}
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <InviteCodeChip tone="dark" size="tiny" />
            <LanguageSwitch tone="dark" size="tiny" />
          </div>
        </div>
      </aside>

      {/* ---------------------------------------------------- mobile top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-lg lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 pt-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-green text-gold">
              <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                <path
                  d="M6 16.5c0-3 2.7-4.5 6-4.5s6 1.5 6 4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </span>
            <div className="min-w-0">
              <GroupSwitcher
                tone="light"
                className="-ml-2"
                labelClassName="text-[15px] font-800 leading-none"
                fallback={
                  <p className="truncate text-[15px] font-800 leading-none">
                    {group?.name ?? t('common.appName')}
                  </p>
                }
              />
              <p className="mt-1 text-[11px] font-500 text-muted">
                {group ? t('home.cycle', { cycle: group.currentCycle }) : t('common.appName')}
              </p>
            </div>
          </div>

          {/* Settings lives behind the avatar (R14). */}
          <div className="flex shrink-0 items-center gap-1">
            <CommandPalette />
            <NotificationBell />
            <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label={t('nav.menu')}
                  className="grid shrink-0 place-items-center rounded-full"
                />
              }
            >
              <Avatar size="sm">
                <AvatarFallback className="bg-green/10 text-green">
                  {initialsOf(session?.name)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{session?.name}</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate('/settings/profile')}>
                <UsersIcon className="size-4" />
                {t('nav.profile')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <SettingsIcon className="size-4" />
                {t('nav.settings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => void signOut()}>
                <LogoutIcon className="size-4" />
                {t('nav.signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>

        {/* Invite code + RW·EN·FR switcher (R14, R15) */}
        <div className="flex items-center justify-between gap-3 px-4 pb-2.5 pt-2.5">
          <InviteCodeChip />
          <LanguageSwitch />
        </div>
      </header>

      {/* --------------------------------------------------------------- main */}
      <div className="lg:pl-64">
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl px-4 pb-36 pt-6 outline-none sm:px-6 lg:pb-16 lg:pt-8"
        >
          {children}
        </main>
      </div>

      {/* -------------------------------------------------- mobile bottom nav */}
      <nav
        aria-label={t('nav.primary')}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur-lg lg:hidden"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
          {mobileNav.map((item, index) => {
            const active = isActivePath(location.pathname, item.to, item.end)
            return (
              <Link
                key={`${item.to}-${index}`}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2.5 text-[11px] font-700 transition-colors',
                  active ? 'text-green' : 'text-muted',
                ].join(' ')}
              >
                <span className="grid size-6 place-items-center">{item.icon({})}</span>
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            )
          })}
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen(true)}
            className={[
              'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2.5 text-[11px] font-700 transition-colors',
              moreActive ? 'text-green' : 'text-muted',
            ].join(' ')}
          >
            <span className="grid size-6 place-items-center">
              <MoreIcon className="size-[19px]" />
            </span>
            <span className="max-w-full truncate">{t('nav.more')}</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-[24px] border-line bg-card pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
        >
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
          <SheetClose
            aria-label={t('common.close')}
            onClick={() => setMoreOpen(false)}
            className="absolute right-3 top-3 grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-ink/[0.05] hover:text-ink"
          >
            <CloseIcon className="size-[18px]" />
          </SheetClose>
          <SheetHeader className="px-5 pb-0 pr-14 pt-1.5">
            <SheetTitle className="text-[17px] font-800 text-ink">{t('nav.more')}</SheetTitle>
            <SheetDescription className="text-[12px] font-500 text-muted">
              {t('nav.moreHint')}
            </SheetDescription>
          </SheetHeader>
          <nav aria-label={t('nav.more')} className="grid grid-cols-2 gap-2 px-4 pb-2">
            {moreNav.map((item, index) => {
              const active = isActivePath(location.pathname, item.to, item.end)
              const wideLast = index === moreNav.length - 1 && moreNav.length % 2 === 1
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'flex min-h-[68px] items-center gap-3 rounded-xl border p-3 transition-colors',
                    wideLast ? 'col-span-2' : '',
                    active
                      ? 'border-green/20 bg-green/[0.06] text-green'
                      : 'border-line bg-bg/50 text-ink hover:bg-bg',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'grid size-9 shrink-0 place-items-center rounded-lg',
                      active ? 'bg-green text-gold' : 'bg-ink/[0.055] text-ink',
                    ].join(' ')}
                  >
                    {item.icon({})}
                  </span>
                  <span className="min-w-0 truncate text-[13px] font-700">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Deposit shortcut. Kept clear of the tab bar and hidden on the
          deposit screen itself, where it would cover the primary action. */}
      {location.pathname !== '/deposit' ? (
        <Link
          to="/deposit"
          aria-label={t('nav.deposit')}
          className="fixed bottom-[calc(68px+env(safe-area-inset-bottom))] right-4 z-30 grid size-14 place-items-center rounded-full bg-gold text-ink shadow-lift lg:hidden"
        >
          <DepositIcon className="size-6" />
        </Link>
      ) : null}

      {/* Desktop chat launcher. The Bulletin page already shows the chat
          side-by-side, so there is no second launcher there. */}
      {location.pathname !== '/bulletin' ? <FloatingChat /> : null}
    </div>
  )
}

function VoiceChips() {
  const { offline, error, dismissError } = useData()
  const { t } = useTranslation()

  if (error) {
    return (
      <button
        type="button"
        onClick={dismissError}
        className="fixed bottom-36 left-1/2 z-40 inline-flex -translate-x-1/2 animate-rise items-center gap-1.5 rounded-chip bg-danger-bg px-4 py-2 text-[13px] font-700 text-danger shadow-soft lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0"
      >
        <TriangleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
        {t('states.errorTitle')} · {error}
      </button>
    )
  }

  if (offline) {
    return (
      <div className="fixed bottom-36 left-1/2 z-40 -translate-x-1/2 animate-rise lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0">
        <Badge className="bg-pending-bg text-pending">
          <WifiOffIcon className="size-3.5" aria-hidden="true" />
          {t('states.offlineTitle')}
        </Badge>
      </div>
    )
  }

  return null
}

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon
  const active = isActivePath(pathname, item.to, item.end)
  const ref = useRef<HTMLAnchorElement | null>(null)
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' })
  }, [active])
  return (
    <Link
      ref={ref}
      to={item.to}
      aria-current={active ? 'page' : undefined}
      className={[
        'flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-[13px] font-700 transition-colors duration-150',
        active
          ? 'bg-white/[0.12] text-white'
          : 'text-white/60 hover:bg-white/[0.07] hover:text-white',
      ].join(' ')}
    >
      <span className="grid size-[18px] shrink-0 place-items-center">{Icon({})}</span>
      {item.label}
    </Link>
  )
}
