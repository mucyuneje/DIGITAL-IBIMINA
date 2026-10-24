'use client'

import { useState, type ReactNode } from 'react'
import { useParams } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { BackButton } from '@/components/back-button'
import { PinGateModal, type PinGateResult } from '@/components/pin-gate'
import { PageSkeleton } from '@/components/page-skeleton'
import { ErrorState } from '@/components/error-state'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckIcon, ClockIcon, CloseIcon, UsersIcon, VaultIcon } from '@/components/icons'
import { PhoneNumber } from '@/components/phone-field'
import { PageHeading } from '@/components/page-heading'
import { useQuorumState } from '@/lib/hooks'
import { currentLanguage } from '@/i18n'
import { formatCurrency, formatDateTime, formatRelative } from '@shared/money'
import { normalizePhone, type PetitionDoc, type PetitionStatus, type VoteEntry } from '@shared/schema'

const TONE: Record<string, string> = {
  success: 'bg-success-bg text-success',
  pending: 'bg-pending-bg text-pending',
  danger: 'bg-danger-bg text-danger',
  neutral: 'bg-ink/[0.06] text-muted',
}

const PETITION_TONE: Record<PetitionStatus, string> = {
  open: 'bg-pending-bg text-pending',
  approved: 'bg-success-bg text-success',
  rejected: 'bg-danger-bg text-danger',
  expired: 'bg-ink/[0.06] text-muted',
  paid: 'bg-success-bg text-success',
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

function QuorumProgress({
  value,
  max,
  approved,
  label,
  sublabel,
}: {
  value: number
  max: number
  approved: boolean
  label?: string
  sublabel?: string
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  return (
    <div>
      {label || sublabel ? (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          {label ? <span className="text-[13px] font-700 text-ink">{label}</span> : null}
          {sublabel ? (
            <span className="text-[12px] font-700 text-muted">{sublabel}</span>
          ) : null}
        </div>
      ) : null}
      <Progress
        value={pct}
        className={
          approved
            ? '[&_[data-slot=progress-indicator]]:bg-success'
            : '[&_[data-slot=progress-indicator]]:bg-green'
        }
      />
    </div>
  )
}

export function WithdrawalDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const { petitions, loading, error } = useData()

  const petition = petitions.find((row) => row.id === id)

  // Cold load: the list is still empty while the listener attaches, so the
  // "not found" branch would flash before the data arrives.
  if (!petition && loading.petitions) {
    return <PageSkeleton rows={3} />
  }

  if (!petition && error === 'petitions') {
    return <ErrorState onRetry={() => window.location.reload()} />
  }

  if (!petition) {
    return (
      <div className="flex flex-col gap-6">
        <BackButton to="/withdrawals" className="-ml-2 self-start" />
        <Card>
          <p className="text-[15px] font-700 text-ink">{t('petition.notFound')}</p>
        </Card>
      </div>
    )
  }

  return <PetitionView petition={petition} />
}

function PetitionView({ petition }: { petition: PetitionDoc }) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { members, call } = useData()
  const toast = useToast()
  const language = currentLanguage()
  const quorum = useQuorumState(petition, members.length)

  const [pending, setPending] = useState<VoteEntry['choice'] | null>(null)

  const open = petition.status === 'open'
  const myVote = session
    ? petition.votes.find((vote) => vote.memberId === session.memberId)
    : undefined
  const canVote = open && session != null && !myVote
  const canSeeRecipientPhone =
    session != null &&
    (session.role !== 'member' ||
      normalizePhone(session.phone) === normalizePhone(petition.recipientPhone ?? ''))

  const runVote = async (pin: string): Promise<PinGateResult> => {
    if (!session || !pending) return { ok: false }
    const result = await call('castVote', {
      groupId: session.groupId,
      memberId: session.memberId,
      petitionId: petition.id,
      choice: pending,
      pin,
    })
    if (result.ok) {
      toast.success(pending === 'yes' ? t('petitions.voteYes') : t('petitions.voteNo'))
    } else {
      toast.error(t('errors.generic'), result.errorKey ? t(result.errorKey) : undefined)
    }
    return { ok: result.ok, errorKey: result.errorKey }
  }

  return (
    <div className="flex flex-col gap-6">
      <BackButton to="/withdrawals" className="-ml-2 self-start" />
      <PageHeading
        icon={VaultIcon}
        title={t('petition.detailTitle')}
        description={t('petition.requestedBy', { name: petition.createdByName })}
        actions={
          <p className="amount text-[24px] leading-none font-800 text-gold-deep">
            {formatCurrency(petition.amount, language)}
          </p>
        }
      />

      {/* PC: the petition on the left, the voter table on the right (R29). */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="flex flex-col gap-6">
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={PETITION_TONE[petition.status]}>
                {t(`petitions.status.${petition.status}`)}
              </Badge>
              <span className="text-[12px] font-500 text-muted">
                {t('petitions.initiatedBy', { name: petition.createdByName })}
              </span>
            </div>

            <h2 className="mt-3 text-[17px] font-800 text-ink">{petition.title}</h2>

            {petition.recipientName || petition.recipientPhone || petition.detail ? (
              <dl className="mt-3 divide-y divide-line">
                {petition.recipientName || petition.recipientPhone ? (
                  <DetailRow
                    label={t('petition.recipient')}
                    value={
                      <span className="inline-flex flex-col items-end gap-0.5">
                        {petition.recipientName ? (
                          <span className="font-700">{petition.recipientName}</span>
                        ) : null}
                        {petition.recipientPhone ? (
                          <PhoneNumber
                            phone={petition.recipientPhone}
                            masked={!canSeeRecipientPhone}
                            withFlag
                            className="font-500 text-muted"
                          />
                        ) : null}
                      </span>
                    }
                  />
                ) : null}
                {petition.detail ? (
                  <DetailRow label={t('petition.reason')} value={petition.detail} />
                ) : null}
              </dl>
            ) : null}

            <div className="mt-5">
              <QuorumProgress
                value={quorum.approvals}
                max={quorum.required}
                approved={quorum.approved}
                label={t('petition.progress', {
                  approvals: quorum.approvals,
                  required: quorum.required,
                })}
                sublabel={t('petitions.quorumNote', {
                  required: quorum.required,
                  total: quorum.totalMembers,
                })}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{t('petition.ruleQuorum')}</Badge>
              {quorum.needsMemberApproval ? (
                <Badge
                  className={
                    quorum.memberApprovalSatisfied ? TONE.success : TONE.pending
                  }
                >
                  {t('petition.ruleMember')}
                </Badge>
              ) : null}
            </div>

            {quorum.needsMemberApproval ? (
              <div
                className={[
                  'mt-3 flex items-center gap-2 rounded-chip px-3 py-2 text-[12px] font-700',
                  quorum.memberApprovalSatisfied
                    ? 'bg-success-bg text-success'
                    : 'bg-pending-bg text-pending',
                ].join(' ')}
              >
                <UsersIcon className="size-3.5" />
                {quorum.memberApprovalSatisfied
                  ? t('petitions.memberRuleMet')
                  : t('petitions.memberRuleNeeded')}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[12px] font-500 text-muted">
              <ClockIcon className="size-3.5" />
              {open
                ? t('petitions.expires', { when: formatRelative(petition.expiresAt, language) })
                : petition.txnId
                  ? t('petitions.txn', { txn: petition.txnId })
                  : t(`petitions.status.${petition.status}`)}
            </div>
          </Card>

          {myVote ? (
            <Card className={myVote.choice === 'yes' ? 'bg-success-bg' : 'bg-danger-bg'}>
              <p className="flex items-center gap-2 text-[14px] font-800">
                {myVote.choice === 'yes' ? (
                  <CheckIcon className="size-4 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <CloseIcon className="size-4 shrink-0 text-danger" aria-hidden="true" />
                )}
                {t('petition.youVoted', {
                  choice: myVote.choice === 'yes' ? t('petitions.voteYes') : t('petitions.voteNo'),
                  date: formatDateTime(myVote.at, language),
                })}
              </p>
            </Card>
          ) : null}

          {petition.status === 'approved' ? (
            <Card className="bg-success-bg">
              <p className="flex items-start gap-2 text-[14px] font-700 leading-relaxed">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                {t('petition.outcomeApproved')}
              </p>
            </Card>
          ) : petition.status === 'rejected' ? (
            <Card className="bg-danger-bg">
              <p className="flex items-start gap-2 text-[14px] font-700 leading-relaxed">
                <CloseIcon className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
                {t('petition.outcomeRejected')}
              </p>
            </Card>
          ) : null}

          {canVote ? (
            <div className="flex gap-3">
              <Button className="w-full" onClick={() => setPending('yes')}>
                <CheckIcon className="size-4" />
                {t('petition.approve')}
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setPending('no')}
              >
                <CloseIcon className="size-4" />
                {t('petition.reject')}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="flex items-center gap-2 text-[17px] font-800 text-ink">
              <UsersIcon className="size-[18px] text-green" aria-hidden="true" />
              {t('petition.voters')}
            </h2>

            {/* Phone: stacked member rows. */}
            <ul className="mt-2 divide-y divide-line lg:hidden">
              {members.map((member) => {
                const vote = petition.votes.find((row) => row.memberId === member.id)
                return (
                  <li key={member.id} className="flex items-center gap-3 py-2.5">
                    <Avatar size="default">
                      <AvatarFallback>{initialsOf(member.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-700 text-ink">
                        {member.id === session?.memberId ? t('common.you') : member.name}
                      </p>
                      <p className="text-[12px] font-500 text-muted">{t(`roles.${member.role}`)}</p>
                    </div>
                    {vote ? (
                      <Badge className={vote.choice === 'yes' ? TONE.success : TONE.danger}>
                        {vote.choice === 'yes' ? t('petitions.voteYes') : t('petitions.voteNo')}
                      </Badge>
                    ) : (
                      <Badge className={TONE.neutral}>{t('petition.waiting')}</Badge>
                    )}
                  </li>
                )
              })}
            </ul>

            {/* PC: the voter table of the mockup (R29). */}
            <Table className="mt-2 hidden lg:table">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px] font-700 uppercase tracking-wide text-muted">
                    {t('common.member')}
                  </TableHead>
                  <TableHead className="text-[11px] font-700 uppercase tracking-wide text-muted">
                    {t('common.role')}
                  </TableHead>
                  <TableHead className="text-[11px] font-700 uppercase tracking-wide text-muted">
                    {t('petition.voteColumn')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const vote = petition.votes.find((row) => row.memberId === member.id)
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="max-w-[180px] truncate font-700 text-ink">
                        {member.id === session?.memberId ? t('common.you') : member.name}
                      </TableCell>
                      <TableCell className="text-[13px] font-500 text-muted">
                        {t(`roles.${member.role}`)}
                      </TableCell>
                      <TableCell>
                        {vote ? (
                          <Badge className={vote.choice === 'yes' ? TONE.success : TONE.danger}>
                            {vote.choice === 'yes'
                              ? t('petitions.voteYes')
                              : t('petitions.voteNo')}
                          </Badge>
                        ) : (
                          <span className="text-[13px] font-500 text-muted">
                            {t('petition.waiting')}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>

      <PinGateModal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={t('petitions.castVote')}
        note={t('petitions.quorumNote', {
          required: quorum.required,
          total: quorum.totalMembers,
        })}
        submitLabel={t('common.confirm')}
        onSubmit={runVote}
      >
        <div className="rounded-2xl bg-bg p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[14px] font-800 text-ink">{petition.title}</span>
            <Badge className={pending === 'no' ? TONE.danger : TONE.success}>
              {pending === 'no' ? t('petitions.voteNo') : t('petitions.voteYes')}
            </Badge>
          </div>
          <p className="mt-1 text-[13px] font-500 text-muted">
            {formatCurrency(petition.amount, language)}
          </p>
        </div>
      </PinGateModal>
    </div>
  )
}

function DetailRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <dt className="shrink-0 text-[13px] font-500 text-muted">{label}</dt>
      <dd className="text-right text-[13px] font-700 text-ink">{value}</dd>
    </div>
  )
}
