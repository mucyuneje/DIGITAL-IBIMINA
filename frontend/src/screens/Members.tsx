'use client'

import { useMemo, useState } from 'react'
import { Link } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { currentLanguage } from '@/i18n'
import { formatAmount } from '@shared/money'
import { isOfficer, rwandanNationalNumber } from '@shared/schema'
import { MemberAvatar } from '@/components/member-avatar'
import { PhoneNumber } from '@/components/phone-field'
import { PageHeading, type PageIcon } from '@/components/page-heading'
import { CheckIcon, ClockIcon, CloseIcon, CopyIcon, SearchIcon, UsersIcon } from '@/components/icons'
import { paymentStatus, rotationState, totalContributed } from '@/lib/cycle'

type Filter = 'all' | 'paid' | 'partial' | 'unpaid'

const STATUS_TONE: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  unpaid: 'bg-rose-100 text-rose-700',
}

const FILTER_ICON: Record<Filter, PageIcon> = {
  all: UsersIcon,
  paid: CheckIcon,
  partial: ClockIcon,
  unpaid: CloseIcon,
}

export function Members() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { group, members, auditLogs, loading } = useData()
  const toast = useToast()
  const language = currentLanguage()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')

  const rotation = useMemo(() => {
    if (!group) return null
    return rotationState(group, members)
  }, [group, members])

  const roundByMember = useMemo(() => {
    const map = new Map<string, number>()
    if (!rotation) return map
    for (const entry of rotation.pending) {
      map.set(entry.member.id, entry.round)
    }
    for (const member of rotation.paidThisLap) {
      map.set(member.id, -1)
    }
    return map
  }, [rotation])

  const enriched = useMemo(() => {
    if (!group) return []
    return members.map((m) => {
      const status = paymentStatus(m, group, auditLogs)
      const totalSaved = totalContributed(m.id, auditLogs)
      const round = roundByMember.get(m.id) ?? m.rotationPosition
      return { member: m, status, totalSaved, round }
    })
  }, [members, group, auditLogs, roundByMember])

  const counts = useMemo(() => {
    const base: Record<Filter, number> = {
      all: enriched.length,
      paid: 0,
      partial: 0,
      unpaid: 0,
    }
    for (const e of enriched) {
      if (e.status === 'paid') base.paid += 1
      else if (e.status === 'partial') base.partial += 1
      else if (e.status === 'unpaid') base.unpaid += 1
    }
    return base
  }, [enriched])

  const filterOptions: { value: Filter; label: string }[] = [
    { value: 'all', label: t('members.all') },
    { value: 'paid', label: t('status.paid') },
    { value: 'partial', label: t('status.partial') },
    { value: 'unpaid', label: t('status.notPaid') },
  ]

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const phoneDigits = rwandanNationalNumber(search)
    return enriched.filter((e) => {
      if (filter !== 'all' && e.status !== filter) return false
      if (!needle) return true
      const m = e.member
      return (
        m.name.toLowerCase().includes(needle) ||
        (phoneDigits.length > 0 &&
          rwandanNationalNumber(m.phone).includes(phoneDigits)) ||
        String(e.round).includes(needle)
      )
    })
  }, [enriched, filter, search])

  const hasQuery = filter !== 'all' || search.trim().length > 0
  const clearFilters = () => {
    setFilter('all')
    setSearch('')
  }

  const copyInvite = async () => {
    const code = group?.inviteCode ?? ''
    try {
      await navigator.clipboard.writeText(code)
    } catch (err) {
      void err
    }
    toast.success(t('members.inviteCopied'))
  }

  return (
    <div className="space-y-5">
      <PageHeading
        icon={UsersIcon}
        title={t('members.title')}
        description={t('members.subtitle', {
          count: members.length,
          group: group?.name ?? '',
        })}
      />

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ToggleGroup
            value={[filter]}
            onValueChange={(next) => {
              const selected = next[0] as Filter | undefined
              if (selected) setFilter(selected)
            }}
            className="flex w-full flex-wrap gap-1 sm:w-auto sm:flex-nowrap"
            aria-label={t('common.filter')}
          >
            {filterOptions.map((option) => {
              const FilterIcon = FILTER_ICON[option.value]
              return (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  className="min-h-9 basis-[calc(50%-0.25rem)] justify-center rounded-chip border border-line bg-card px-3 py-1.5 text-[13px] font-700 text-ink aria-pressed:border-green aria-pressed:bg-green aria-pressed:text-white sm:basis-auto"
                >
                  <FilterIcon className="size-3.5" aria-hidden="true" />
                  {option.label}
                  <span className="ml-1 text-[11px] font-700 opacity-60">{counts[option.value]}</span>
                </ToggleGroupItem>
              )
            })}
          </ToggleGroup>
          <div className="sm:w-[260px]">
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <SearchIcon className="size-4 text-muted" aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('members.search')}
                aria-label={t('members.search')}
                type="search"
                enterKeyHint="search"
              />
              {search ? (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label={t('common.clear')}
                    className="size-6 min-h-0 rounded-full text-muted hover:text-ink"
                    onClick={() => setSearch('')}
                  >
                    <CloseIcon className="size-3.5" aria-hidden="true" />
                  </InputGroupButton>
                </InputGroupAddon>
              ) : null}
            </InputGroup>
          </div>
        </div>
      </Card>

      {loading.members && members.length === 0 ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-16 rounded-card" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle>{t(hasQuery ? 'members.noResults' : 'members.emptyTitle')}</EmptyTitle>
            <EmptyDescription>
              {t(hasQuery ? 'members.noResultsHint' : 'members.emptyBody')}
            </EmptyDescription>
          </EmptyHeader>
          {hasQuery ? (
            <Button variant="outline" onClick={clearFilters}>
              <CloseIcon className="size-[18px]" aria-hidden="true" />
              {t('members.clearFilters')}
            </Button>
          ) : (
            <Button
              className="bg-gold text-ink hover:bg-gold-deep hover:text-white"
              onClick={() => void copyInvite()}
            >
              <CopyIcon className="size-[18px]" aria-hidden="true" />
              {t('members.emptyAction')}
            </Button>
          )}
        </Empty>
      ) : (
        <div className="flex flex-col divide-y divide-line rounded-card border border-line bg-card">
          {filtered.map((e) => {
            const m = e.member
            const roleTone = isOfficer(m.role) ? 'gold' : 'neutral'
            const isYou = session?.memberId === m.id
            const canSeeFullPhone = isYou || (session ? isOfficer(session.role) : false)
            return (
              <Link
                key={m.id}
                to={`/members/${m.id}`}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-ink/[0.03] sm:gap-4 sm:p-4"
              >
                <MemberAvatar name={m.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[15px] font-800" title={m.name}>
                      {m.name}
                      {isYou ? (
                        <span className="hidden text-muted sm:inline"> {t('members.you')}</span>
                      ) : null}
                    </p>
                    <Badge className={roleTone === 'gold' ? 'bg-gold-soft text-pending' : 'bg-ink/[0.06] text-muted'}>
                      {t(`roles.${m.role}`)}
                    </Badge>
                    <Badge className={STATUS_TONE[e.status]}>
                      {e.status === 'paid'
                        ? t('status.paid')
                        : e.status === 'partial'
                        ? t('status.partial')
                        : t('status.notPaid')}
                    </Badge>
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[12px] font-500 text-muted">
                    <PhoneNumber phone={m.phone} masked={!canSeeFullPhone} withFlag />
                    {isYou ? (
                      <span className="sm:hidden">
                        {' · '}
                        {t('members.you')}
                      </span>
                    ) : null}
                    <span className="sm:hidden">
                      {' · '}
                      {t('rotation.round', { round: e.round > 0 ? e.round : '-' })}
                    </span>
                  </p>
                </div>
                <div className="hidden text-center sm:block">
                  <p className="text-[12px] font-700 text-muted">{t('members.positionHint')}</p>
                  <p className="text-[14px] font-800 text-ink">{e.round > 0 ? e.round : '-'}</p>
                </div>
                <div className="min-w-[64px] text-right">
                  <p className="text-[12px] font-700 text-muted">{t('members.totalSaved')}</p>
                  <p className="amount text-[14px] text-success">
                    {formatAmount(e.totalSaved, language)}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
