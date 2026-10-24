'use client'

import { useMemo } from 'react'
import { Link, useNavigate } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { MemberAvatar } from '@/components/member-avatar'
import { LivePill } from '@/components/live-pill'
import { PageHeading } from '@/components/page-heading'
import {
  CalendarIcon,
  ClockIcon,
  DepositIcon,
  HomeIcon,
  LedgerIcon,
  UsersIcon,
  VaultIcon,
} from '@/components/icons'
import { TriangleAlertIcon, TrendingUpIcon, WalletIcon } from 'lucide-react'
import { contributedThisCycle, cycleProgress, cycleStartAt, nextPayoutDate, paymentStatus, type PaymentStatus } from '@/lib/cycle'
import { useCurrentRecipient, useNow, useUpcomingRounds } from '@/lib/hooks'
import { currentLanguage } from '@/i18n'
import { formatAmount, formatCurrency, formatDate } from '@shared/money'
import { isGovernanceEntry } from '@shared/ledger'
import type { AuditEntryType } from '@shared/schema'

const LEDGER_TONE: Record<AuditEntryType, string> = {
  deposit: 'bg-success-bg text-success',
  payout: 'bg-gold-soft text-pending',
  loan_issue: 'bg-pending-bg text-pending',
  loan_repay: 'bg-success-bg text-success',
  penalty: 'bg-danger-bg text-danger',
  cash_entry: 'bg-ink/[0.06] text-muted',
  role_change: 'bg-ink/[0.06] text-muted',
  group_rule_change: 'bg-ink/[0.06] text-muted',
}

const STATUS_TONE: Record<PaymentStatus, string> = {
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  partial: 'border-amber-200 bg-amber-50 text-amber-800',
  unpaid: 'border-rose-200 bg-rose-50 text-rose-800',
}

const STATUS_LABEL: Record<PaymentStatus, string> = {
  paid: 'status.paid',
  partial: 'status.partial',
  unpaid: 'status.notPaid',
}

const DAY_MS = 24 * 60 * 60 * 1000
const KIGALI_OFFSET_MS = 2 * 60 * 60 * 1000

export function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { group, members, auditLogs, petitions, loading, ready } = useData()
  const recipient = useCurrentRecipient()
  const rounds = useUpcomingRounds(5)
  const now = useNow()
  const language = currentLanguage()

  const openPetitions = useMemo(
    () => petitions.filter((p) => p.status === 'open').length,
    [petitions],
  )

  const rotationPosition = useMemo(() => {
    if (!group || !session) return null
    const index = group.rotationOrder.indexOf(session.memberId)
    if (index < 0) return null
    return { position: index + 1, total: group.rotationOrder.length }
  }, [group, session])

  const unvotedPetition = useMemo(
    () =>
      session
        ? petitions.find(
            (petition) =>
              petition.status === 'open' &&
              !petition.votes.some((vote) => vote.memberId === session.memberId),
          )
        : undefined,
    [petitions, session],
  )

  const pendingVotes = useMemo(
    () =>
      session
        ? petitions.filter(
            (petition) =>
              petition.status === 'open' &&
              !petition.votes.some((vote) => vote.memberId === session.memberId),
          ).length
        : 0,
    [petitions, session],
  )

  const payoutDate = useMemo(
    () => (group ? nextPayoutDate(cycleStartAt(group, auditLogs)) : null),
    [group, auditLogs],
  )

  const cycle = useMemo(
    () => (group ? cycleProgress(group, members, auditLogs) : null),
    [group, members, auditLogs],
  )

  const growthSeries = useMemo(() => {
    const since = now - 30 * DAY_MS
    const byDay = new Map<number, number>()
    for (const entry of auditLogs) {
      if (entry.type !== 'deposit' || entry.timestamp < since) continue
      const day = Math.floor((entry.timestamp + KIGALI_OFFSET_MS) / DAY_MS) * DAY_MS - KIGALI_OFFSET_MS
      byDay.set(day, (byDay.get(day) ?? 0) + entry.amount)
    }
    return [...byDay.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([day, total]) => ({ day, label: formatDate(day, language), total }))
  }, [auditLogs, language, now])

  const growthTotal = useMemo(
    () => growthSeries.reduce((sum, day) => sum + day.total, 0),
    [growthSeries],
  )

  const growthConfig = {
    deposits: {
      label: t('ledgerTabs.deposits'),
      color: 'var(--color-success)',
    },
  } satisfies ChartConfig

  const me = useMemo(
    () => members.find((member) => member.id === session?.memberId),
    [members, session],
  )
  const myStatus = group && me ? paymentStatus(me, group, auditLogs) : null
  const myContributed = session ? contributedThisCycle(session.memberId, auditLogs) : 0
  const contributionAmount = group?.contributionAmount ?? 0

  // The dashboard stays scannable: the ledger link carries the full history.
  const recent = auditLogs.slice(0, 3)

  if (!ready && loading.group) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------------------------ standard page header */}
      <PageHeading
        icon={HomeIcon}
        title={t('home.greeting', { name: session?.name ?? '' })}
        description={`${group?.name ?? ''} · ${t('home.membersCount', { count: members.length })}`}
        actions={
          <>
            <LivePill labelKey="home.live" />
            {openPetitions > 0 ? (
              <Link
                to="/withdrawals"
                className="inline-flex min-h-11 items-center sm:min-h-0"
              >
                <Badge className="bg-pending-bg text-pending">
                  <TriangleAlertIcon className="size-3" aria-hidden="true" />
                  {t('home.openPetitions', { count: openPetitions })}
                </Badge>
              </Link>
            ) : null}
          </>
        }
      />

      {pendingVotes > 0 && unvotedPetition ? (
        <Alert className="border-danger bg-danger-bg text-danger [&>svg]:text-danger">
          <Link to="/withdrawals" className="flex items-center gap-3">
            <TriangleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
            <AlertTitle className="text-[14px] font-800">
              {t('homeExtra.urgentOpen', {
                title: unvotedPetition.title,
                amount: formatAmount(unvotedPetition.amount, language),
              })}
            </AlertTitle>
          </Link>
        </Alert>
      ) : null}

      {/* ------------------------------------------- vault + quick actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="h-full min-w-0 bg-green text-white ring-white/10 lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-[13px] font-700 uppercase tracking-wider text-white/60">
                <VaultIcon className="size-4 text-gold" aria-hidden="true" />
                {t('home.groupVault')}
              </CardTitle>
              {group ? (
                <Badge className="bg-white/10 text-white">
                  {t('home.cycle', { cycle: group.currentCycle })}
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="amount text-[34px] leading-none sm:text-[44px]">
                {formatAmount(group?.vaultBalance ?? 0, language)}
              </span>
              <span className="text-[15px] font-700 text-white/60">{t('common.rwsign')}</span>
            </div>
            <p className="text-[12px] font-500 text-white/55">{t('home.countUpNote')}</p>

            {cycle ? (
              <div className="mt-4">
                <p className="text-[12px] font-500 text-white/55">
                  {t('rotation.progress', {
                    collected: formatAmount(cycle.collected, language),
                    target: formatAmount(cycle.target, language),
                  })}
                </p>
                <Progress
                  value={cycle.target > 0 ? (cycle.collected / cycle.target) * 100 : 0}
                  className="mt-2 [&_[data-slot=progress-track]]:bg-white/20 [&_[data-slot=progress-indicator]]:bg-gold"
                />
              </div>
            ) : null}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-white/[0.08] p-4">
                <p className="text-[12px] font-700 uppercase tracking-wide text-white/55">
                  {t('home.nextPayout')}
                </p>
                <div className="mt-2.5 flex items-center gap-3">
                  <MemberAvatar name={recipient?.name ?? '—'} />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-800">
                      {recipient
                        ? recipient.id === session?.memberId
                          ? t('home.yourTurn')
                          : recipient.name
                        : '—'}
                    </p>
                    <p className="text-[12px] font-500 text-white/55">
                      {t('home.round', { round: group?.currentCycle ?? 1 })}
                    </p>
                    {payoutDate ? (
                      <p className="mt-0.5 text-[12px] font-500 text-white/55">
                        {t('home.payoutDate', { date: formatDate(payoutDate, language) })}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white/[0.08] p-4">
                <p className="text-[12px] font-700 uppercase tracking-wide text-white/55">
                  {t('home.rotationPosition')}
                </p>
                <p className="mt-2 text-[15px] font-800">
                  {rotationPosition
                    ? t('home.position', {
                        position: rotationPosition.position,
                        total: rotationPosition.total,
                      })
                    : '—'}
                </p>
                <p className="mt-1 text-[12px] font-500 text-white/55">
                  {t('home.monthlyContribution')}:{' '}
                  {formatAmount(group?.contributionAmount ?? 0, language)}{' '}
                  {t('common.rwsign')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[17px] font-800">
              <WalletIcon className="size-[18px] text-green" aria-hidden="true" />
              {t('home.quickActions')}
            </CardTitle>
            <CardDescription>{t('home.quickActionsHint')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            {myStatus ? (
              <div className="rounded-xl border border-line bg-bg/60 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-700 uppercase tracking-wide text-muted">
                    {t('home.yourContribution')}
                  </p>
                  <Badge variant="outline" className={STATUS_TONE[myStatus]}>
                    {t(STATUS_LABEL[myStatus])}
                  </Badge>
                </div>
                <p className="amount mt-2 text-[22px] font-800 leading-none text-ink">
                  {formatCurrency(myContributed, language)}
                </p>
                <p className="mt-1.5 text-[12px] font-500 text-muted">
                  {t('home.contributionTarget', {
                    target: formatCurrency(contributionAmount, language),
                  })}
                </p>
                <Progress
                  value={
                    contributionAmount > 0
                      ? Math.min(100, (myContributed / contributionAmount) * 100)
                      : 0
                  }
                  aria-label={t('home.yourContribution')}
                  className="mt-2.5 h-1.5"
                />
              </div>
            ) : null}
            <div className="mt-auto flex flex-col gap-3">
              <Button
                size="lg"
                className="w-full bg-gold text-ink hover:bg-gold-deep hover:text-white"
                onClick={() => navigate('/deposit')}
              >
                <DepositIcon className="size-[18px]" />
                {t('home.depositMoney')}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => navigate('/withdrawals')}
              >
                <VaultIcon className="size-[18px]" />
                {t('home.proposeWithdrawal')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------- rounds + recent activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="h-full min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[17px] font-800">
              <CalendarIcon className="size-[18px] text-green" aria-hidden="true" />
              {t('home.upcomingRounds')}
            </CardTitle>
            <CardDescription className="text-[12px]">
              {t('homeExtra.nextPayoutNote')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-1">
              {rounds.map(({ member, cycle: round }, index) => (
                <li
                  key={member.id}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/50"
                >
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-800 ${
                      index === 0 ? 'bg-gold text-ink' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {round}
                  </span>
                  <MemberAvatar name={member.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-700">
                      {member.id === session?.memberId ? t('common.you') : member.name}
                    </p>
                    <p className="text-[12px] font-500 text-muted">{t(`roles.${member.role}`)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="h-full min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[17px] font-800">
              <ClockIcon className="size-[18px] text-green" aria-hidden="true" />
              {t('home.recentActivity')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading.auditLogs && recent.length === 0 ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="h-11 w-full" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ClockIcon className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle className="text-[15px]">{t('home.noActivity')}</EmptyTitle>
                  <EmptyDescription className="text-[12px]">
                    {t('homeExtra.subtitle')}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="divide-y divide-line">
                {recent.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3 py-3">
                    <Badge className={LEDGER_TONE[entry.type]}>
                      {t(`ledger.types.${entry.type}`)}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-700 text-ink">{entry.detail}</p>
                      <p className="mt-0.5 text-[12px] font-500 text-muted">
                        {entry.initiatorName} · {formatDate(entry.timestamp, language)}
                      </p>
                    </div>
                    {isGovernanceEntry(entry.type) ? null : (
                      <span
                        className={`amount shrink-0 text-[14px] ${
                          entry.type === 'payout' || entry.type === 'loan_issue'
                            ? 'text-destructive'
                            : 'text-success'
                        }`}
                      >
                        {entry.type === 'payout' || entry.type === 'loan_issue' ? '−' : '+'}
                        {formatAmount(entry.amount, language)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {recent.length > 0 ? (
              <Link
                to="/ledger"
                className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-bg/60 px-4 text-[13px] font-700 text-primary transition-colors hover:bg-muted/60"
              >
                <LedgerIcon className="size-4" aria-hidden="true" />
                {t('home.viewLedger')}
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* ---------------------------------------------------- monthly summary */}
      {members.length > 0 ? (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-[17px] font-800">
              <TrendingUpIcon className="size-[18px] text-green" aria-hidden="true" />
              {t('homeExtra.title')}
            </h2>
            <p className="mt-1 text-[13px] font-500 text-muted">{t('homeExtra.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="h-full min-w-0 lg:col-span-2">
              <CardHeader>
                <div className="flex w-full flex-wrap items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-[17px] font-800">
                    <UsersIcon className="size-[18px] text-green" aria-hidden="true" />
                    {t('homeExtra.whoPaid')}
                  </CardTitle>
                  {group ? (
                    <Badge variant="outline">
                      {t('homeExtra.cycle')} {group.currentCycle}
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-1">
                  {members.map((member) => {
                    const status: PaymentStatus = group
                      ? paymentStatus(member, group, auditLogs)
                      : 'unpaid'
                    const contributed = contributedThisCycle(member.id, auditLogs)
                    const isSelf = member.id === session?.memberId
                    return (
                      <li
                        key={member.id}
                        className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/50"
                      >
                        <MemberAvatar name={member.name} size="sm" />
                        <p className="min-w-0 flex-1 truncate text-[14px] font-700">
                          {member.name}
                          {isSelf ? (
                            <span className="ml-1.5 text-[12px] font-500 text-muted">
                              {t('members.you')}
                            </span>
                          ) : null}
                        </p>
                        <span className="amount shrink-0 text-[13px] text-muted">
                          {formatCurrency(contributed, language)}
                        </span>
                        <Badge variant="outline" className={STATUS_TONE[status]}>
                          {t(STATUS_LABEL[status])}
                        </Badge>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>

            <Card className="h-full min-w-0">
              <CardHeader>
                <div className="flex w-full items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-[17px] font-800">
                    <TrendingUpIcon className="size-[18px] text-green" aria-hidden="true" />
                    {t('homeExtra.growth')}
                  </CardTitle>
                  <span className="amount shrink-0 whitespace-nowrap text-[18px] text-success">
                    +{formatCurrency(growthTotal, language)}
                  </span>
                </div>
                <CardDescription className="text-[12px]">
                  {t('homeExtra.growthRange')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {growthSeries.length === 0 ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <TrendingUpIcon className="size-6" />
                      </EmptyMedia>
                      <EmptyTitle className="text-[15px]">{t('homeExtra.noDeposits')}</EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <ChartContainer
                    config={growthConfig}
                    role="img"
                    aria-label={t('homeExtra.growthChartLabel')}
                    className="aspect-auto h-48 w-full min-w-0"
                  >
                    <AreaChart
                      data={growthSeries}
                      margin={{ top: 4, left: 0, right: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="fillDeposits" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="var(--color-deposits)"
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--color-deposits)"
                            stopOpacity={0.05}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-line)" />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={32}
                      />
                      <YAxis hide />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            indicator="dot"
                            formatter={(value) => formatCurrency(Number(value), language)}
                          />
                        }
                      />
                      <Area
                        dataKey="total"
                        type="monotone"
                        fill="url(#fillDeposits)"
                        stroke="var(--color-deposits)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}
