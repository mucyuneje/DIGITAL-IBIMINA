'use client'

import { useState } from 'react'
import { Link, useNavigate } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  BellIcon,
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  FingerprintIcon,
  LanguagesIcon,
  LifeBuoyIcon,
  LogOutIcon,
  PencilIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UserRoundIcon,
  UsersRoundIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react'
import { SettingsIcon, UsersIcon } from '@/components/icons'
import { PageHeading } from '@/components/page-heading'
import { currentLanguage } from '@/i18n'
import { formatCurrency } from '@shared/money'
import { MemberAvatar } from '@/components/member-avatar'
import { PhoneNumber } from '@/components/phone-field'
import { GroupSwitcher } from '@/components/group-switcher'

type Tone = 'green' | 'gold' | 'neutral' | 'danger'

const TONE: Record<Tone, string> = {
  green: 'bg-success-bg text-success',
  gold: 'bg-gold-soft text-pending',
  neutral: 'bg-ink/[0.055] text-ink',
  danger: 'bg-danger-bg text-danger',
}

interface SettingsRow {
  to: string
  label: string
  hint: string
  icon: LucideIcon
  tone: Tone
}

interface SettingsSectionData {
  title: string
  hint: string
  rows: SettingsRow[]
}

export function SettingsHub() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const { group, members } = useData()
  const toast = useToast()
  const [confirmOut, setConfirmOut] = useState(false)
  const [copied, setCopied] = useState(false)
  const language = currentLanguage()
  const officer = Boolean(session && session.role !== 'member')

  const sections: SettingsSectionData[] = [
    {
      title: t('settingsIndex.account'),
      hint: t('settingsIndex.accountHint'),
      rows: [
        {
          to: '/settings/profile',
          label: t('settings.profile'),
          hint: t('settingsIndex.profileHint'),
          icon: UserRoundIcon,
          tone: 'green',
        },
        {
          to: '/settings/language',
          label: t('settings.language'),
          hint: t('settingsIndex.languageHint'),
          icon: LanguagesIcon,
          tone: 'gold',
        },
        {
          to: '/settings/notifications',
          label: t('settingsIndex.notifications'),
          hint: t('settingsIndex.notificationsHint'),
          icon: BellIcon,
          tone: 'neutral',
        },
      ],
    },
    {
      title: t('settingsIndex.groupSecurity'),
      hint: t('settingsIndex.groupSecurityHint'),
      rows: [
        ...(officer
          ? [
              {
                to: '/settings/group',
                label: t('settings.group'),
                hint: t('settingsIndex.groupHint'),
                icon: UsersRoundIcon,
                tone: 'green' as Tone,
              },
            ]
          : []),
        {
          to: '/settings/security',
          label: t('settingsIndex.security'),
          hint: t('settingsIndex.securityHint'),
          icon: ShieldCheckIcon,
          tone: 'green',
        },
        {
          to: '/settings/anomaly',
          label: t('settingsIndex.anomaly'),
          hint: t('settingsIndex.anomalyHint'),
          icon: TriangleAlertIcon,
          tone: 'gold',
        },
      ],
    },
    {
      title: t('settingsIndex.dataSupport'),
      hint: t('settingsIndex.dataSupportHint'),
      rows: [
        {
          to: '/settings/export',
          label: t('settingsIndex.export'),
          hint: t('settingsIndex.exportHint'),
          icon: DownloadIcon,
          tone: 'neutral',
        },
        {
          to: '/help',
          label: t('settingsIndex.help'),
          hint: t('settingsIndex.helpHint'),
          icon: LifeBuoyIcon,
          tone: 'gold',
        },
      ],
    },
  ]

  const copyInvite = async () => {
    if (!group?.inviteCode) return
    try {
      await navigator.clipboard.writeText(group.inviteCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
      toast.success(t('group.copied'))
    } catch {
      toast.error(t('errors.generic'))
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeading
        icon={SettingsIcon}
        title={t('settings.title')}
        description={t('settingsIndex.toolHint')}
        actions={
          <Badge variant="outline" className="hidden gap-1.5 sm:inline-flex">
            <span className="size-1.5 rounded-full bg-success" />
            {t('settingsIndex.allChangesSaved')}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          {/* Profile hero — identity first, actions always reachable. */}
          <Card className="overflow-hidden p-0">
            <div className="relative overflow-hidden bg-green px-5 py-5 text-white sm:px-6">
              <span
                className="pointer-events-none absolute -right-12 -top-16 size-48 rounded-full bg-gold/15"
                aria-hidden="true"
              />
              <span
                className="pointer-events-none absolute -bottom-24 right-20 size-52 rounded-full border border-white/10"
                aria-hidden="true"
              />
              <div className="relative flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3.5">
                  <MemberAvatar
                    name={session?.name ?? ''}
                    size="lg"
                    className="ring-2 ring-white/20"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[18px] font-800 leading-tight">{session?.name}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge className="bg-gold text-ink">
                        {session ? t(`roles.${session.role}`) : ''}
                      </Badge>
                      <PhoneNumber
                        phone={session?.phone}
                        withFlag
                        className="text-[12px] font-600 text-white/65"
                        flagClassName="ring-white/25"
                      />
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  onClick={() => navigate('/settings/profile')}
                >
                  <PencilIcon />
                  {t('profile.edit')}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-line border-t border-line sm:grid-cols-3">
              <div className="min-w-0 px-4 py-3.5">
                <p className="flex items-center gap-1.5 text-[10px] font-800 uppercase tracking-[0.12em] text-muted">
                  <UsersRoundIcon className="size-3.5" />
                  {t('settingsIndex.statGroup')}
                </p>
                <p className="mt-1 truncate text-[13px] font-800 text-ink">
                  {group?.name ?? '—'}
                </p>
              </div>
              <div className="min-w-0 px-4 py-3.5">
                <p className="flex items-center gap-1.5 text-[10px] font-800 uppercase tracking-[0.12em] text-muted">
                  <WalletIcon className="size-3.5" />
                  {t('settingsIndex.statContribution')}
                </p>
                <p className="amount mt-1 truncate text-[13px] font-800 text-ink">
                  {formatCurrency(group?.contributionAmount ?? 0, language)}
                </p>
              </div>
              <div className="col-span-2 min-w-0 border-t border-line px-4 py-3.5 sm:col-span-1 sm:border-t-0">
                <p className="flex items-center gap-1.5 text-[10px] font-800 uppercase tracking-[0.12em] text-muted">
                  <UsersIcon className="size-3.5" />
                  {t('settingsIndex.statMembers')}
                </p>
                <p className="mt-1 text-[13px] font-800 text-ink">{members.length}</p>
              </div>
            </div>
          </Card>

          {sections.map((section) => (
            <Card key={section.title} className="overflow-hidden p-0">
              <div className="border-b border-line px-5 py-4">
                <h2 className="text-[15px] font-800 text-ink">{section.title}</h2>
                <p className="mt-0.5 text-[12px] font-500 text-muted">{section.hint}</p>
              </div>
              <ul className="divide-y divide-line">
                {section.rows.map((row) => (
                  <li key={row.to}>
                    <Link
                      to={row.to}
                      className="group flex min-h-[68px] items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-bg/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green/30 sm:px-5"
                    >
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-xl ${TONE[row.tone]}`}
                      >
                        <row.icon className="size-[18px]" strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-800 text-ink">{row.label}</span>
                        <span className="mt-0.5 block truncate text-[12px] font-500 text-muted">
                          {row.hint}
                        </span>
                      </span>
                      <ChevronRightIcon className="size-4 shrink-0 text-muted/60 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ))}

          <Card className="overflow-hidden border-danger/20 p-0">
            <div className="border-b border-danger/15 bg-danger-bg/40 px-5 py-4">
              <h2 className="flex items-center gap-2 text-[15px] font-800 text-danger">
                <TriangleAlertIcon className="size-4" />
                {t('settingsIndex.dangerZone')}
              </h2>
              <p className="mt-0.5 text-[12px] font-500 text-danger/75">
                {t('settingsIndex.dangerHint')}
              </p>
            </div>
            <Link
              to="/settings/delete-account"
              className="group flex min-h-[68px] items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-danger-bg/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-danger/30 sm:px-5"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-danger-bg text-danger">
                <Trash2Icon className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-800 text-ink">
                  {t('settingsIndex.delete')}
                </span>
                <span className="mt-0.5 block truncate text-[12px] font-500 text-muted">
                  {t('settingsIndex.deleteHint')}
                </span>
              </span>
              <ChevronRightIcon className="size-4 shrink-0 text-danger/50 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-danger" />
            </Link>
          </Card>
        </div>

        <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-6">
          <Card className="gap-4">
            <div className="flex items-start gap-2.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success-bg text-success">
                <UsersRoundIcon className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[15px] font-800 text-ink">
                  {t('settingsIndex.groupOverview')}
                </h2>
                <p className="mt-0.5 text-[12px] font-500 text-muted">
                  {t('settingsIndex.groupOverviewHint')}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-bg px-3 py-2.5">
              <GroupSwitcher
                className="text-ink"
                labelClassName="text-[13px] font-800 text-ink"
                fallback={
                  <p className="truncate text-[13px] font-800 text-ink">
                    {group?.name ?? t('states.noGroup')}
                  </p>
                }
              />
            </div>

            <dl className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-line px-3 py-2.5">
                <dt className="flex items-center gap-1.5 text-[10px] font-800 uppercase tracking-[0.1em] text-muted">
                  <WalletIcon className="size-3.5" />
                  {t('settingsIndex.contribution')}
                </dt>
                <dd className="amount mt-1 text-[13px] font-800 text-ink">
                  {formatCurrency(group?.contributionAmount ?? 0, language)}
                </dd>
              </div>
              <div className="rounded-xl border border-line px-3 py-2.5">
                <dt className="flex items-center gap-1.5 text-[10px] font-800 uppercase tracking-[0.1em] text-muted">
                  <UsersIcon className="size-3.5" />
                  {t('settingsIndex.statMembers')}
                </dt>
                <dd className="mt-1 text-[13px] font-800 text-ink">{members.length}</dd>
              </div>
            </dl>

            <div>
              <p className="text-[10px] font-800 uppercase tracking-[0.12em] text-muted">
                {t('settings.inviteCode')}
              </p>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-bg px-3 py-2">
                <p className="min-w-0 flex-1 truncate font-mono text-[16px] font-800 tracking-[0.2em] text-ink">
                  {group?.inviteCode ?? '—'}
                </p>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="shrink-0 bg-card"
                  aria-label={t('settingsIndex.copyInvite')}
                  onClick={() => void copyInvite()}
                >
                  {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                to="/members"
                className="flex min-h-10 items-center justify-between gap-2 rounded-xl border border-line px-3.5 text-[13px] font-700 text-ink transition-colors hover:bg-bg"
              >
                <span className="flex items-center gap-2">
                  <UsersIcon className="size-4 text-green" />
                  {t('settingsIndex.viewMembers')}
                </span>
                <ChevronRightIcon className="size-4 text-muted" />
              </Link>
              {officer ? (
                <Link
                  to="/settings/group"
                  className="flex min-h-10 items-center justify-between gap-2 rounded-xl border border-line px-3.5 text-[13px] font-700 text-ink transition-colors hover:bg-bg"
                >
                  <span className="flex items-center gap-2">
                    <SettingsIcon className="size-4 text-green" />
                    {t('settingsIndex.manageGroup')}
                  </span>
                  <ChevronRightIcon className="size-4 text-muted" />
                </Link>
              ) : null}
              <Link
                to="/welcome/join"
                className="flex min-h-10 items-center justify-between gap-2 rounded-xl px-3.5 text-[13px] font-700 text-green transition-colors hover:bg-success-bg/60"
              >
                <span className="flex items-center gap-2">
                  <UsersRoundIcon className="size-4" />
                  {t('settings.joinGroup')}
                </span>
                <ChevronRightIcon className="size-4" />
              </Link>
            </div>
          </Card>

          <Card className="gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success-bg text-success">
                  <ShieldCheckIcon className="size-[18px]" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-[15px] font-800 text-ink">
                    {t('settingsIndex.securityOverview')}
                  </h2>
                  <p className="mt-0.5 text-[12px] font-500 text-muted">
                    {t('settingsIndex.securityOverviewHint')}
                  </p>
                </div>
              </div>
              <Badge className="shrink-0 bg-success-bg text-success">
                {t('settingsIndex.protected')}
              </Badge>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-bg px-3 py-2.5">
                <span className="flex items-center gap-2 text-[12px] font-600 text-muted">
                  <FingerprintIcon className="size-4 text-green" />
                  {t('settingsIndex.pinProtected')}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[12px] font-800 text-success">
                  <span className="size-1.5 rounded-full bg-success" />
                  {t('settingsIndex.on')}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-bg px-3 py-2.5">
                <span className="flex items-center gap-2 text-[12px] font-600 text-muted">
                  <SmartphoneIcon className="size-4 text-green" />
                  {t('settingsIndex.activeSession')}
                </span>
                <span className="text-[12px] font-800 text-ink">
                  {t('settingsIndex.thisDevice')}
                </span>
              </div>
            </div>

            <Link
              to="/settings/security"
              className="flex min-h-10 items-center justify-between gap-2 rounded-xl border border-line px-3.5 text-[13px] font-700 text-ink transition-colors hover:bg-bg"
            >
              {t('settingsIndex.reviewSecurity')}
              <ChevronRightIcon className="size-4 text-muted" />
            </Link>
          </Card>

          <Card className="gap-4 border-danger/20 bg-danger-bg/35">
            <div className="flex items-start gap-2.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-danger shadow-xs">
                <LogOutIcon className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[15px] font-800 text-ink">{t('settings.signOut')}</h2>
                <p className="mt-0.5 text-[12px] font-500 text-muted">
                  {t('settings.sessionNote')}
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setConfirmOut(true)}
            >
              <LogOutIcon />
              {t('settings.signOut')}
            </Button>
          </Card>
        </aside>
      </div>

      <Dialog open={confirmOut} onOpenChange={setConfirmOut}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('auth.signOutTitle')}</DialogTitle>
            <DialogDescription>{t('auth.signOutBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOut(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmOut(false)
                void signOut()
              }}
            >
              {t('settingsIndex.signOutConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
