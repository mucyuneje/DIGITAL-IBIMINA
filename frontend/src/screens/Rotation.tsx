'use client'

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { PinGateModal } from '@/components/pin-gate'
import { MemberAvatar } from '@/components/member-avatar'
import { PageHeading } from '@/components/page-heading'
import { CalendarIcon, CheckIcon, ShuffleIcon, VaultIcon } from '@/components/icons'
import { cycleStartAt, nextPayoutDate, rotationState } from '@/lib/cycle'
import { isOfficer } from '@shared/schema'
import { formatAmount, formatDate } from '@shared/money'
import { currentLanguage } from '@/i18n'

export function Rotation() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { group, members, auditLogs, call, loading } = useData()
  const toast = useToast()
  const language = currentLanguage()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)

  const rotation = useMemo(
    () => (group ? rotationState(group, members) : null),
    [group, members],
  )
  const pending = rotation?.pending ?? []
  const paidThisLap = rotation?.paidThisLap ?? []
  const recipient = rotation?.currentRecipient ?? null
  const recipientRound = pending[0]?.round ?? group?.currentCycle ?? 1

  const collected = group?.vaultBalance ?? 0
  const target = members.length * (group?.contributionAmount ?? 0)
  const payoutDate = group ? nextPayoutDate(cycleStartAt(group, auditLogs)) : null

  const canRun = isOfficer(session?.role ?? 'member')

  const handleConfirm = () => {
    setConfirmOpen(false)
    setPinOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        icon={ShuffleIcon}
        title={t('rotation.title')}
        description={t('rotation.subtitle')}
      />

      <Card>
        <h2 className="flex items-center gap-2 text-[17px] font-800">
          <CalendarIcon className="size-[18px] text-green" aria-hidden="true" />
          {t('rotation.next')}
        </h2>
        <div className="mt-3 flex items-center gap-3">
          {recipient ? (
            <MemberAvatar name={recipient.name} className="ring-2 ring-gold" />
          ) : (
            <MemberAvatar name="—" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-800">
              {recipient
                ? recipient.id === session?.memberId
                  ? t('rotation.you')
                  : recipient.name
                : '—'}
            </p>
            <p className="text-[12px] font-500 text-muted">
              {t('rotation.round', { round: recipientRound })}
            </p>
            {payoutDate ? (
              <p className="mt-0.5 text-[12px] font-500 text-muted">
                {t('rotation.payoutDate', { date: formatDate(payoutDate, language) })}
              </p>
            ) : null}
          </div>
          <Badge className="hidden shrink-0 bg-gold-soft text-pending sm:inline-flex">
            {t('rotation.next')} · {t('rotation.round', { round: recipientRound })}
          </Badge>
        </div>
      </Card>

      <Card>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[13px] font-700 text-ink">
            <VaultIcon className="size-4 text-green" aria-hidden="true" />
            {t('rotation.progress', {
              collected: formatAmount(collected, language),
              target: formatAmount(target, language),
            })}
          </span>
          <span className="text-[12px] font-700 text-muted">{t('rotation.target')}</span>
        </div>
        <Progress value={target <= 0 ? 0 : Math.min(100, Math.round((collected / target) * 100))} />
      </Card>

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-[17px] font-800">
              <ShuffleIcon className="size-[18px] text-green" aria-hidden="true" />
              {t('rotation.order')}
            </h2>
            <p className="mt-0.5 text-[12px] font-500 text-muted">{t('members.positionHint')}</p>
          </div>
          {canRun ? (
            <Button
              className="w-full bg-gold text-ink hover:bg-gold-deep hover:text-white sm:w-auto"
              onClick={() => setConfirmOpen(true)}
            >
              <ShuffleIcon className="size-[18px]" aria-hidden="true" />
              {t('rotation.lotteryRun')}
            </Button>
          ) : null}
        </div>

        {loading.members && members.length === 0 ? (
          <div className="flex flex-col gap-1" aria-busy="true">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShuffleIcon className="size-6" />
              </EmptyMedia>
              <EmptyTitle>{t('rotation.empty')}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <ol className="flex flex-col gap-1">
            {pending.map((entry) => {
              const isYou = entry.member.id === session?.memberId
              const isCurrent = entry.member.id === recipient?.id
              return (
                <li
                  key={entry.member.id}
                  className={`flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-ink/[0.03] ${
                    isCurrent ? 'bg-gold-soft/40' : ''
                  }`}
                >
                  <MemberAvatar
                    name={entry.member.name}
                    size="sm"
                    className={isCurrent ? 'ring-2 ring-gold' : ''}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-700">
                      {isYou ? t('rotation.you') : entry.member.name}
                    </p>
                    <p className="text-[12px] font-500 text-muted">
                      {t(`roles.${entry.member.role}`)}
                    </p>
                  </div>
                  {isCurrent ? (
                    <Badge className="bg-gold-soft text-pending">
                      {t('rotation.round', { round: entry.round })}
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      {t('rotation.round', { round: entry.round })}
                    </Badge>
                  )}
                </li>
              )
            })}
          </ol>
        )}

        {paidThisLap.length > 0 ? (
          <div className="mt-5 border-t border-line pt-4">
            <p className="flex items-center gap-1.5 text-[12px] font-700 uppercase tracking-wide text-muted">
              <CheckIcon className="size-3.5 text-success" aria-hidden="true" />
              {t('rotation.paidThisLap')}
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {paidThisLap.map((member, index) => {
                const round =
                  (group?.currentCycle ?? 1) - (rotation?.recipientIndex ?? 0) + index
                return (
                  <li
                    key={member.id}
                    className="flex items-center gap-3 rounded-2xl px-2 py-1.5 opacity-70"
                  >
                    <MemberAvatar name={member.name} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-500 text-muted">
                      {member.id === session?.memberId ? t('rotation.you') : member.name}
                    </span>
                    <span className="text-[12px] font-500 text-muted">
                      {t('rotation.round', { round })}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('rotation.lotteryConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('rotation.lotteryConfirmBody', { count: members.length })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              className="bg-gold text-ink hover:bg-gold-deep hover:text-white"
              onClick={handleConfirm}
            >
              <CheckIcon className="size-[18px]" aria-hidden="true" />
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PinGateModal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        title={t('rotation.lotteryConfirmTitle')}
        note={t('rotation.lotteryConfirmBody', { count: members.length })}
        submitLabel={t('rotation.lotteryRun')}
        onSubmit={async (pin) => {
          if (!session) return { ok: false, errorKey: 'errors.generic' }
          const r = await call('runRotationLottery', {
            groupId: session.groupId,
            memberId: session.memberId,
            pin,
          })
          if (r.ok) {
            toast.success(t('rotation.lotteryDone'))
            setPinOpen(false)
          } else {
            toast.error(t('errors.generic'), r.errorKey ? t(r.errorKey) : undefined)
          }
          return { ok: r.ok, errorKey: r.errorKey }
        }}
      />
    </div>
  )
}
