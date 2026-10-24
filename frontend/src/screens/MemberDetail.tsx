'use client'

import { useMemo, useState } from 'react'
import { useParams } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Field } from '@/components/ui/field'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { PinGateModal, type PinGateResult } from '@/components/pin-gate'
import { BackButton } from '@/components/back-button'
import { PageSkeleton } from '@/components/page-skeleton'
import { ErrorState } from '@/components/error-state'
import { MemberAvatar } from '@/components/member-avatar'
import { PhoneNumber } from '@/components/phone-field'
import { CalendarIcon, DepositIcon, ShuffleIcon, VaultIcon } from '@/components/icons'
import { UserRoundCogIcon } from 'lucide-react'
import { currentLanguage } from '@/i18n'
import { totalContributed } from '@/lib/cycle'
import { useDocumentTitle } from '@/lib/use-document-title'
import { formatAmount, formatDate } from '@shared/money'
import { isOfficer, type AuditLogDoc, type Role } from '@shared/schema'

const ROLE_OPTIONS: Role[] = ['president', 'treasurer', 'secretary', 'member']

const TONE: Record<string, string> = {
  gold: 'bg-gold-soft text-pending',
  neutral: 'bg-ink/[0.06] text-muted',
}

export function MemberDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const { members, auditLogs, call, loading, error } = useData()
  const toast = useToast()
  const language = currentLanguage()
  const [roleModal, setRoleModal] = useState(false)
  const [pendingRole, setPendingRole] = useState<Role | null>(null)

  const member = useMemo(() => members.find((m) => m.id === id) ?? null, [members, id])

  useDocumentTitle(member?.name)

  const totalSaved = useMemo(() => {
    if (!member) return 0
    return totalContributed(member.id, auditLogs)
  }, [auditLogs, member])

  const payouts = useMemo(() => {
    if (!member) return [] as AuditLogDoc[]
    const nameLower = member.name.toLowerCase()
    return auditLogs
      .filter((log) => log.type === 'payout')
      .filter((log) => {
        const detail = log.detail.toLowerCase()
        return detail.includes(nameLower)
      })
  }, [auditLogs, member])

  const contributions = useMemo(() => {
    if (!member) return [] as AuditLogDoc[]
    return auditLogs
      .filter((log) => log.type === 'deposit' && log.initiatorId === member.id)
  }, [auditLogs, member])

  const joinedDate = member ? formatDate(member.joinedAt, language) : ''

  const isSelf = session?.memberId === id
  const isPresident = session?.role === 'president'
  const canSeeFullPhone = isSelf || (session ? isOfficer(session.role) : false)

  const roleOptions: { value: Role; label: string }[] = ROLE_OPTIONS.map((r) => ({
    value: r,
    label: t(`roles.${r}`),
  }))

  const openRoleChange = () => {
    if (!member) return
    setPendingRole(member.role)
    setRoleModal(true)
  }

  const handleRoleSubmit = (pin: string): Promise<PinGateResult> => {
    if (!member || pendingRole == null || !session) {
      return Promise.resolve({ ok: false })
    }
    const newRole = pendingRole
    if (newRole === member.role) {
      setRoleModal(false)
      return Promise.resolve({ ok: true })
    }
    return (async () => {
      const res = await call('changeRole', {
        actorId: session.memberId,
        memberId: member.id,
        newRole,
        pin,
      })
      if (res.ok) {
        toast.success(t('memberDetail.roleChanged'))
        setRoleModal(false)
      } else {
        toast.error(t('errors.generic'), res.errorKey ? t(res.errorKey) : undefined)
      }
      return { ok: res.ok, errorKey: res.errorKey }
    })()
  }

  // Cold load: the roster is still empty while the listener attaches, so the
  // empty state would flash before the row arrives.
  if (!member && loading.members) {
    return <PageSkeleton rows={3} />
  }

  if (!member && error === 'members') {
    return <ErrorState onRetry={() => window.location.reload()} />
  }

  if (!member) {
    return (
      <div className="space-y-5">
        <BackButton to="/members" />
        <Card>
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t('states.emptyTitle')}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <BackButton to="/members" />

      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <MemberAvatar name={member.name} size="lg" />
          <div className="min-w-0 flex-1">
            <h1
              className="truncate text-[22px] font-800 sm:text-[26px]"
              title={member.name}
            >
              {member.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge className={TONE[isOfficer(member.role) ? 'gold' : 'neutral']}>
                {t(`roles.${member.role}`)}
              </Badge>
              <PhoneNumber
                phone={member.phone}
                masked={!canSeeFullPhone}
                withFlag
                className="text-[12px] font-600 text-muted"
              />
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-line bg-bg p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-700 text-muted">
              <ShuffleIcon className="size-3.5 text-green" aria-hidden="true" />
              {t('members.positionHint')}
            </p>
            <p className="text-[16px] font-800">{member.rotationPosition}</p>
          </div>
          <div className="rounded-2xl border border-line bg-bg p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-700 text-muted">
              <VaultIcon className="size-3.5 text-green" aria-hidden="true" />
              {t('memberDetail.totalSaved')}
            </p>
            <p className="amount text-[16px] text-success">
              {formatAmount(totalSaved, language)}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-bg p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-700 text-muted">
              <CalendarIcon className="size-3.5 text-green" aria-hidden="true" />
              {t('memberDetail.joined')}
            </p>
            <p className="text-[14px] font-700">{joinedDate}</p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-[17px] font-800">
          <VaultIcon className="size-[18px] text-green" aria-hidden="true" />
          {t('memberDetail.payouts')}
        </h2>
        {payouts.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <VaultIcon className="size-6" />
              </EmptyMedia>
              <EmptyTitle>{t('states.emptyTitle')}</EmptyTitle>
              <EmptyDescription>{t('memberDetail.payoutsNone')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {payouts.map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-[14px] font-700">{log.detail}</p>
                  <p className="text-[12px] font-500 text-muted">
                    {formatDate(log.timestamp, language)}
                  </p>
                </div>
                <span className="amount text-[14px] text-danger">
                  -{formatAmount(log.amount, language)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-[17px] font-800">
          <DepositIcon className="size-[18px] text-green" aria-hidden="true" />
          {t('memberDetail.contributions')}
        </h2>
        {contributions.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <DepositIcon className="size-6" />
              </EmptyMedia>
              <EmptyTitle>{t('states.emptyTitle')}</EmptyTitle>
              <EmptyDescription>{t('memberDetail.contributionsNone')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {contributions.map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-[14px] font-700">{log.detail}</p>
                  <p className="text-[12px] font-500 text-muted">
                    {formatDate(log.timestamp, language)}
                  </p>
                </div>
                <span className="amount text-[14px] text-success">
                  +{formatAmount(log.amount, language)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {isPresident && !isSelf ? (
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-[17px] font-800">
                <UserRoundCogIcon className="size-[18px] text-green" aria-hidden="true" />
                {t('memberDetail.changeRole')}
              </h2>
            </div>
            <Button
              variant="outline"
              onClick={openRoleChange}
              title={isSelf ? t('memberDetail.changeRoleUnable') : undefined}
            >
              <UserRoundCogIcon className="size-4" aria-hidden="true" />
              {t('memberDetail.changeRole')}
            </Button>
          </div>
        </Card>
      ) : null}

      <PinGateModal
        open={roleModal}
        onClose={() => setRoleModal(false)}
        title={t('memberDetail.changeRole')}
        note={t('memberDetail.changeRoleConfirm', {
          name: member.name,
          role: pendingRole ? t(`roles.${pendingRole}`) : '',
        })}
        submitLabel={t('common.confirm')}
        onSubmit={handleRoleSubmit}
      >
        <Field>
          <ToggleGroup
            value={pendingRole ? [pendingRole] : []}
            onValueChange={(next) => {
              const value = next[0]
              if (value) setPendingRole(value as Role)
            }}
          >
            {roleOptions.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                className="aria-pressed:bg-green aria-pressed:text-white"
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
      </PinGateModal>
    </div>
  )
}
