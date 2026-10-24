'use client'

import { useMemo, useState } from 'react'
import { useNavigate } from '@/lib/router'
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { PinGateModal, type PinGateResult } from '@/components/pin-gate'
import { PhoneNumber, PhoneNumberField } from '@/components/phone-field'
import { PageHeading } from '@/components/page-heading'
import {
  CheckIcon,
  ClockIcon,
  CloseIcon,
  PlusIcon,
  UsersIcon,
  VaultIcon,
} from '@/components/icons'
import { useQuorumState } from '@/lib/hooks'
import { approvalsLeft } from '@/lib/cycle'
import { currentLanguage } from '@/i18n'
import { requiredApprovals } from '@shared/quorum'
import { isValidRwandanPhone, normalizePhone } from '@shared/schema'
import { formatAmount, formatCurrency, formatRelative } from '@shared/money'
import type { MemberDoc, PetitionDoc, PetitionStatus, VoteEntry } from '@shared/schema'

const TONE: Record<string, string> = {
  success: 'bg-success-bg text-success',
  danger: 'bg-danger-bg text-danger',
}

const PETITION_TONE: Record<PetitionStatus, string> = {
  open: 'bg-pending-bg text-pending',
  approved: 'bg-success-bg text-success',
  rejected: 'bg-danger-bg text-danger',
  expired: 'bg-ink/[0.06] text-muted',
  paid: 'bg-success-bg text-success',
}

type Filter = 'all' | PetitionStatus

interface NewDraft {
  title: string
  amount: number
  detail: string
  recipientName?: string
  recipientPhone?: string
}

type PendingAction =
  | { kind: 'create'; draft: NewDraft }
  | { kind: 'vote'; petition: PetitionDoc; choice: VoteEntry['choice'] }

function PetitionStatusBadge({ status, label }: { status: PetitionStatus; label: string }) {
  return <Badge className={PETITION_TONE[status]}>{label}</Badge>
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

export function Withdrawals() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { group, members, petitions, loading, call } = useData()
  const toast = useToast()
  const language = currentLanguage()

  const [filter, setFilter] = useState<Filter>('all')
  const [newOpen, setNewOpen] = useState(false)
  const [pending, setPending] = useState<PendingAction | null>(null)

  const vaultBalance = group?.vaultBalance ?? 0

  const counts = useMemo(() => {
    const base: Record<Filter, number> = {
      all: petitions.length,
      open: 0,
      approved: 0,
      rejected: 0,
      expired: 0,
      paid: 0,
    }
    for (const petition of petitions) base[petition.status] += 1
    return base
  }, [petitions])

  const filterOptions: { value: Filter; label: string; count: number }[] = [
    { value: 'all', label: t('common.all'), count: counts.all },
    { value: 'open', label: t('petitions.status.open'), count: counts.open },
    { value: 'approved', label: t('petitions.status.approved'), count: counts.approved },
    { value: 'paid', label: t('petitions.status.paid'), count: counts.paid },
    { value: 'rejected', label: t('petitions.status.rejected'), count: counts.rejected },
    { value: 'expired', label: t('petitions.status.expired'), count: counts.expired },
  ]

  const filtered = useMemo(
    () => (filter === 'all' ? petitions : petitions.filter((p) => p.status === filter)),
    [petitions, filter],
  )

  const runPending = async (pin: string): Promise<PinGateResult> => {
    if (!session || !pending) return { ok: false }

    if (pending.kind === 'create') {
      const result = await call('createPetition', {
        groupId: session.groupId,
        memberId: session.memberId,
        title: pending.draft.title,
        detail: pending.draft.detail,
        amount: pending.draft.amount,
        recipientName: pending.draft.recipientName,
        recipientPhone: pending.draft.recipientPhone,
        pin,
      })
      if (result.ok) toast.success(t('petitions.submit'), t('petitions.autoYes'))
      return { ok: result.ok, errorKey: result.errorKey }
    }

    const { petition, choice } = pending
    const result = await call(
      'castVote',
      {
        groupId: session.groupId,
        memberId: session.memberId,
        petitionId: petition.id,
        choice,
        pin,
      },
      {
        keys: ['petitions'],
        patch: (current) => ({
          petitions: current.petitions.map((row) =>
            row.id === petition.id
              ? {
                  ...row,
                  votes: [
                    ...row.votes,
                    {
                      memberId: session.memberId,
                      memberName: session.name,
                      role: session.role,
                      choice,
                      at: Date.now(),
                    },
                  ],
                }
              : row,
          ),
        }),
      },
    )
    if (result.ok) {
      toast.success(choice === 'yes' ? t('petitions.voteYes') : t('petitions.voteNo'))
    }
    return { ok: result.ok, errorKey: result.errorKey }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        icon={VaultIcon}
        title={t('petitions.title')}
        description={t('petitions.sub')}
        actions={
          <Button
            className="bg-gold text-ink hover:bg-gold-deep hover:text-white"
            onClick={() => setNewOpen(true)}
          >
            <PlusIcon className="size-[18px]" />
            {t('petitions.new')}
          </Button>
        }
      />

      <Card className="bg-green text-white">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-700 uppercase tracking-wider text-white/60">
              {t('home.groupVault')}
            </p>
            <p className="amount mt-1.5 text-[30px] leading-none font-800">
              {formatCurrency(vaultBalance, language)}
            </p>
          </div>
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-gold">
            <VaultIcon className="size-6" />
          </span>
        </div>
      </Card>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-card p-1">
        <ToggleGroup
          value={[filter]}
          onValueChange={(next) => {
            const selected = next[0] as Filter | undefined
            if (selected) setFilter(selected)
          }}
          className="gap-1"
        >
          {filterOptions.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              className="min-h-9 rounded-xl px-3.5 text-[13px] font-700 aria-pressed:bg-green aria-pressed:text-white"
            >
              <span>{option.label}</span>
              <span className="rounded-chip bg-current/15 px-1.5 py-0.5 text-[11px] font-800">
                {option.count}
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {loading.petitions && petitions.length === 0 ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 2 }, (_, index) => (
            <Skeleton key={index} className="h-64 rounded-card" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <VaultIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle>{t('petitions.empty')}</EmptyTitle>
            <EmptyDescription>{t('petitions.emptyHint')}</EmptyDescription>
          </EmptyHeader>
          <Button
            className="bg-gold text-ink hover:bg-gold-deep hover:text-white"
            onClick={() => setNewOpen(true)}
          >
            <PlusIcon className="size-[18px]" />
            {t('petitions.new')}
          </Button>
        </Empty>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
          {filtered.map((petition) => (
            <PetitionCard
              key={petition.id}
              petition={petition}
              members={members}
              onVote={(target, choice) => setPending({ kind: 'vote', petition: target, choice })}
            />
          ))}
        </div>
      )}

      <NewPetitionModal
        open={newOpen}
        vaultBalance={vaultBalance}
        required={requiredApprovals(members.length)}
        total={members.length}
        onClose={() => setNewOpen(false)}
        onSubmit={(draft) => {
          setNewOpen(false)
          setPending({ kind: 'create', draft })
        }}
      />

      <PinGateModal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={pending?.kind === 'create' ? t('petitions.newTitle') : t('petitions.castVote')}
        note={
          pending && pending.kind === 'vote'
            ? t('petitions.quorumNote', {
                required: requiredApprovals(members.length),
                total: members.length,
              })
            : t('petitions.sub')
        }
        submitLabel={pending?.kind === 'create' ? t('petitions.submit') : t('common.confirm')}
        onSubmit={runPending}
      >
        {pending && pending.kind === 'create' ? (
          <div className="rounded-2xl bg-bg p-4">
            <p className="text-[14px] font-800 text-ink">{pending.draft.title}</p>
            <p className="amount mt-1 text-[17px] font-800 text-gold-deep">
              {formatCurrency(pending.draft.amount, language)}
            </p>
            {pending.draft.detail ? (
              <p className="mt-1.5 text-[13px] font-500 leading-relaxed text-muted">
                {pending.draft.detail}
              </p>
            ) : null}
            {pending.draft.recipientName || pending.draft.recipientPhone ? (
              <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[13px] font-700 text-ink">
                {pending.draft.recipientName ? <span>{pending.draft.recipientName}</span> : null}
                {pending.draft.recipientPhone ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <PhoneNumber
                      phone={pending.draft.recipientPhone}
                      withFlag
                      className="font-600"
                    />
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
        ) : pending && pending.kind === 'vote' ? (
          <div className="rounded-2xl bg-bg p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[14px] font-800 text-ink">{pending.petition.title}</span>
              <Badge
                className={
                  pending.choice === 'yes' ? TONE.success : TONE.danger
                }
              >
                {pending.choice === 'yes' ? t('petitions.voteYes') : t('petitions.voteNo')}
              </Badge>
            </div>
            <p className="mt-1 text-[13px] font-500 text-muted">
              {formatCurrency(pending.petition.amount, language)}
            </p>
          </div>
        ) : null}
      </PinGateModal>
    </div>
  )
}

function PetitionCard({
  petition,
  members,
  onVote,
}: {
  petition: PetitionDoc
  members: MemberDoc[]
  onVote: (petition: PetitionDoc, choice: VoteEntry['choice']) => void
}) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const navigate = useNavigate()
  const language = currentLanguage()
  const quorum = useQuorumState(petition, members.length)
  const left = approvalsLeft(petition)

  const open = petition.status === 'open'
  const isCreator = session != null && petition.createdBy === session.memberId
  const myVote = session
    ? petition.votes.find((v) => v.memberId === session.memberId)
    : undefined
  const hasVoted = Boolean(myVote)
  const canSeeRecipientPhone =
    session != null &&
    (session.role !== 'member' ||
      normalizePhone(session.phone) === normalizePhone(petition.recipientPhone ?? ''))
  const voterIds = new Set(petition.votes.map((vote) => vote.memberId))
  const unvoted = members.filter((member) => !voterIds.has(member.id))

  return (
    <Card
      role="link"
      tabIndex={0}
      className="cursor-pointer transition-colors hover:bg-ink/[0.03]"
      onClick={() => navigate(`/withdrawals/${petition.id}`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          navigate(`/withdrawals/${petition.id}`)
        }
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <PetitionStatusBadge
              status={petition.status}
              label={t(`petitions.status.${petition.status}`)}
            />
            <span className="text-[12px] font-500 text-muted">
              {t('petitions.initiatedBy', { name: petition.createdByName })}
            </span>
          </div>
          <h3 className="mt-2.5 text-[17px] font-800 text-ink">{petition.title}</h3>
          {petition.detail ? (
            <p className="mt-1 text-[13px] font-500 leading-relaxed text-muted">
              {petition.detail}
            </p>
          ) : null}
          {petition.recipientName ? (
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[13px] font-700 text-ink">
              <span>{t('petition.recipient')}:</span>
              <span>{petition.recipientName}</span>
              {petition.recipientPhone ? (
                <>
                  <span aria-hidden="true">·</span>
                  <PhoneNumber
                    phone={petition.recipientPhone}
                    masked={!canSeeRecipientPhone}
                    withFlag
                    className="font-600"
                  />
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="amount text-[18px] font-800 text-ink">
            {formatAmount(petition.amount, language)}
          </p>
          <p className="text-[11px] font-700 uppercase tracking-wide text-muted">{t('common.rwsign')}</p>
        </div>
      </div>

      <div className="mt-5">
        <QuorumProgress
          value={quorum.approvals}
          max={quorum.required}
          approved={quorum.approved}
          label={t('petitions.progress', {
            approvals: quorum.approvals,
            required: quorum.required,
          })}
          sublabel={t('petitions.quorumNote', {
            required: quorum.required,
            total: quorum.totalMembers,
          })}
        />
      </div>

      {petition.votes.length > 0 || (open && unvoted.length > 0) ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {petition.votes.map((vote) => (
            <Badge
              key={vote.memberId}
              className={
                vote.choice === 'yes'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }
            >
              {vote.choice === 'yes' ? (
                <CheckIcon className="size-3" />
              ) : (
                <CloseIcon className="size-3" />
              )}
              {vote.memberName}
            </Badge>
          ))}
          {open
            ? unvoted.map((member) => (
                <Badge key={member.id} variant="outline">
                  {member.id === session?.memberId ? t('common.you') : member.name}
                </Badge>
              ))
            : null}
        </div>
      ) : null}

      {open && left.remaining > 0 ? (
        <p className="mt-3 text-[12px] font-500 text-muted">
          {t('petition.waitingFor', { count: left.remaining })}
        </p>
      ) : null}
      {open && quorum.needsMemberApproval && !quorum.memberApprovalSatisfied ? (
        <p className="mt-1 text-[12px] font-500 text-muted">
          {t('petitions.memberRuleNeeded')}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[12px] font-500 text-muted">
          <ClockIcon className="size-3.5" />
          {open
            ? t('petitions.expires', { when: formatRelative(petition.expiresAt, language) })
            : petition.txnId
              ? t('petitions.txn', { txn: petition.txnId })
              : t(`petitions.status.${petition.status}`)}
        </div>

        {open ? (
          hasVoted ? (
            <Badge
              className={myVote?.choice === 'yes' ? TONE.success : TONE.danger}
            >
              {isCreator
                ? t('petitions.voted_created')
                : myVote?.choice === 'yes'
                  ? t('petitions.voted')
                  : t('petitions.votedNo')}
            </Badge>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation()
                  onVote(petition, 'no')
                }}
              >
                <CloseIcon className="size-4" />
                {t('petitions.voteNo')}
              </Button>
              <Button
                size="sm"
                onClick={(event) => {
                  event.stopPropagation()
                  onVote(petition, 'yes')
                }}
              >
                <CheckIcon className="size-4" />
                {t('petitions.voteYes')}
              </Button>
            </div>
          )
        ) : null}
      </div>
    </Card>
  )
}

function NewPetitionModal({
  open,
  vaultBalance,
  required,
  total,
  onClose,
  onSubmit,
}: {
  open: boolean
  vaultBalance: number
  required: number
  total: number
  onClose: () => void
  onSubmit: (draft: NewDraft) => void
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [detail, setDetail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const numericAmount = Number(amount.replace(/[^\d]/g, '')) || 0
  const trimmedTitle = title.trim()
  const trimmedDetail = detail.trim()
  const trimmedName = recipientName.trim()
  const trimmedPhone = recipientPhone.trim()
  const detailLength = trimmedDetail.length

  const fieldErrors: {
    title?: string
    amount?: string
    detail?: string
    recipientName?: string
    recipientPhone?: string
  } = {}
  if (!trimmedTitle) fieldErrors.title = t('petition.titleRequired')
  if (numericAmount <= 0) {
    fieldErrors.amount = t('petition.amountInvalid')
  } else if (numericAmount > vaultBalance) {
    fieldErrors.amount = t('petitions.amountTooHigh')
  }
  if (detailLength < 10 || detailLength > 200) {
    fieldErrors.detail = t('petition.reasonLength')
  }
  if (!trimmedName) {
    fieldErrors.recipientName = t('petition.recipientNameRequired')
  }
  if (!trimmedPhone || !isValidRwandanPhone(trimmedPhone)) {
    fieldErrors.recipientPhone = t('petition.recipientPhoneInvalid')
  }

  const formValid =
    !fieldErrors.title &&
    !fieldErrors.amount &&
    !fieldErrors.detail &&
    !fieldErrors.recipientName &&
    !fieldErrors.recipientPhone

  const touch = (key: string) =>
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }))

  const errorOf = (key: 'title' | 'amount' | 'detail' | 'recipientName' | 'recipientPhone') =>
    touched[key] ? fieldErrors[key] : undefined

  const reset = () => {
    setTitle('')
    setAmount('')
    setDetail('')
    setRecipientName('')
    setRecipientPhone('')
    setTouched({})
  }

  const close = () => {
    reset()
    onClose()
  }

  const attempt = () => {
    setTouched({
      title: true,
      amount: true,
      detail: true,
      recipientName: true,
      recipientPhone: true,
    })
    if (!formValid) return

    const draft: NewDraft = {
      title: trimmedTitle,
      amount: numericAmount,
      detail: trimmedDetail,
      recipientName: trimmedName,
      recipientPhone: normalizePhone(trimmedPhone),
    }
    reset()
    onSubmit(draft)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('petitions.newTitle')}</DialogTitle>
          <DialogDescription>{t('petition.newSummary')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field className="gap-1.5">
            <FieldLabel className="text-[13px] font-700">{t('petitions.purpose')}</FieldLabel>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => touch('title')}
              placeholder={t('petitions.purposePlaceholder')}
              autoFocus
              aria-invalid={Boolean(errorOf('title')) || undefined}
            />
            <FieldError>{errorOf('title')}</FieldError>
          </Field>

          <Field className="gap-1.5">
            <FieldLabel className="text-[13px] font-700">{t('petition.newAmount')}</FieldLabel>
            <InputGroup>
              <InputGroupInput
                value={amount}
                onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ''))}
                onBlur={() => touch('amount')}
                inputMode="numeric"
                aria-invalid={Boolean(errorOf('amount')) || undefined}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText className="font-700">{t('common.rwsign')}</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            <FieldDescription className="text-[12px]">
              {t('petitions.amountHint', { balance: formatCurrency(vaultBalance, language) })}
            </FieldDescription>
            <FieldError>{errorOf('amount')}</FieldError>
          </Field>

          <Field className="gap-1.5">
            <FieldLabel className="text-[13px] font-700">{t('petitions.detail')}</FieldLabel>
            <Textarea
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              onBlur={() => touch('detail')}
              placeholder={t('petitions.detailPlaceholder')}
              rows={3}
              aria-invalid={Boolean(errorOf('detail')) || undefined}
            />
            <FieldDescription className="flex items-center justify-between gap-2 text-[12px]">
              <span>{t('petition.newReasonHint')}</span>
              <span className="tabular-nums font-700">{detailLength}/200</span>
            </FieldDescription>
            <FieldError>{errorOf('detail')}</FieldError>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field className="gap-1.5">
              <FieldLabel className="text-[13px] font-700">
                {t('petition.newRecipient')}
              </FieldLabel>
              <Input
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
                onBlur={() => touch('recipientName')}
                aria-invalid={Boolean(errorOf('recipientName')) || undefined}
              />
              <FieldError>{errorOf('recipientName')}</FieldError>
            </Field>
            <Field id="petition-recipient-phone" className="gap-1.5">
              <FieldLabel className="text-[13px] font-700">
                {t('petition.newRecipientPhone')}
              </FieldLabel>
              <PhoneNumberField
                value={recipientPhone}
                onValueChange={setRecipientPhone}
                onBlur={() => touch('recipientPhone')}
                invalid={Boolean(errorOf('recipientPhone'))}
                aria-label={t('petition.newRecipientPhone')}
                aria-describedby={
                  errorOf('recipientPhone') ? 'petition-recipient-phone-error' : undefined
                }
              />
              <FieldError id="petition-recipient-phone-error">
                {errorOf('recipientPhone')}
              </FieldError>
            </Field>
          </div>

          <div className="flex items-start gap-2 rounded-2xl bg-bg px-4 py-3">
            <UsersIcon className="mt-0.5 size-4 shrink-0 text-muted" />
            <p className="text-[12px] font-500 leading-relaxed text-muted">
              {t('petition.newRule', { required, total })}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            {t('common.cancel')}
          </Button>
          <Button
            className="bg-gold text-ink hover:bg-gold-deep hover:text-white"
            disabled={!formValid}
            onClick={attempt}
          >
            <PlusIcon className="size-[18px]" />
            {t('petition.newSubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
