'use client'

import { useMemo, useState } from 'react'
import { Link, Navigate } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { PinGateModal } from '@/components/pin-gate'
import { BackButton } from '@/components/back-button'
import { LivePill } from '@/components/live-pill'
import { PageHeading } from '@/components/page-heading'
import { MemberAvatar } from '@/components/member-avatar'
import { CheckIcon, LoanIcon } from '@/components/icons'
import { FileTextIcon, TriangleAlertIcon } from 'lucide-react'
import { translateError } from '@/lib/errors'
import { useNow } from '@/lib/hooks'
import { currentLanguage } from '@/i18n'
import { formatCurrency, formatDate } from '@shared/money'
import { LOAN_INTEREST_RATE, loanTotalDue } from '@shared/schema'
import type { LoanDoc } from '@shared/schema'

const MIN_PRINCIPAL = 1000
const DAY_MS = 86_400_000

export function DeskLoan() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { members, loans, group, call, loading } = useData()
  const toast = useToast()
  const language = currentLanguage()
  const now = useNow()

  const [borrowerId, setBorrowerId] = useState('')
  const [principal, setPrincipal] = useState('')
  const [termDays, setTermDays] = useState<30 | 60>(30)
  const [agreed, setAgreed] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)
  const [repayTarget, setRepayTarget] = useState<LoanDoc | null>(null)
  const [penaltyOpen, setPenaltyOpen] = useState(false)
  const [penaltyTarget, setPenaltyTarget] = useState('')
  const [penaltyAmount, setPenaltyAmount] = useState('')
  const [penaltyReason, setPenaltyReason] = useState('')

  const numericPrincipal = Number(principal.replace(/[^\d]/g, '')) || 0
  const totalDue = loanTotalDue(numericPrincipal)
  const interest = totalDue - numericPrincipal
  const vaultBalance = group?.vaultBalance ?? 0

  const principalAboveVault = numericPrincipal > vaultBalance
  const principalBelowMin = principal.length > 0 && numericPrincipal < MIN_PRINCIPAL
  const issueValid =
    Boolean(borrowerId) &&
    numericPrincipal >= MIN_PRINCIPAL &&
    !principalAboveVault &&
    agreed

  const activeLoans = useMemo(() => loans.filter((loan) => loan.status === 'active'), [loans])

  const memberItems = members.map((member) => ({ value: member.id, label: member.name }))

  const penaltyAmountNum = Number(penaltyAmount.replace(/[^\d]/g, '')) || 0
  const penaltyAmountInvalid =
    penaltyAmount.length > 0 &&
    (penaltyAmountNum <= 0 || penaltyAmountNum > vaultBalance)
  const penaltyReasonInvalid = penaltyReason.length > 0 && penaltyReason.trim().length < 5
  const penaltyValid =
    Boolean(penaltyTarget) &&
    penaltyAmountNum > 0 &&
    penaltyAmountNum <= vaultBalance &&
    penaltyReason.trim().length >= 5

  if (session && session.role === 'member') return <Navigate to="/403" replace />

  const issue = async (pin: string) => {
    if (!session) return { ok: false, errorKey: 'errors.generic' }
    if (!borrowerId) return { ok: false, errorKey: 'desk.loanBorrower' }
    if (numericPrincipal < MIN_PRINCIPAL) return { ok: false, errorKey: 'desk.loanPrincipalMin' }
    if (numericPrincipal > vaultBalance) return { ok: false, errorKey: 'errors.insufficientFunds' }
    try {
      const result = await call('issueLoan', {
        groupId: session.groupId,
        memberId: session.memberId,
        borrowerId,
        principal: numericPrincipal,
        termDays,
        pin,
      })
      if (result.ok) {
        toast.success(t('desk.loanSubmit'), formatCurrency(totalDue, language))
        setBorrowerId('')
        setPrincipal('')
        setAgreed(false)
        setPinOpen(false)
        return { ok: true }
      }
      return { ok: false, errorKey: result.errorKey }
    } catch (cause) {
      return { ok: false, errorKey: translateError(t, cause) }
    }
  }

  const repay = async (pin: string) => {
    if (!session || !repayTarget) return { ok: false, errorKey: 'errors.generic' }
    try {
      const result = await call('repayLoan', {
        groupId: session.groupId,
        memberId: session.memberId,
        loanId: repayTarget.id,
        pin,
      })
      if (result.ok) {
        toast.success(t('desk.repayDone'), repayTarget.borrowerName)
        setRepayTarget(null)
        return { ok: true }
      }
      return { ok: false, errorKey: result.errorKey }
    } catch (cause) {
      return { ok: false, errorKey: translateError(t, cause) }
    }
  }

  const penalise = async (pin: string) => {
    if (!session || !penaltyTarget) return { ok: false, errorKey: 'errors.generic' }
    if (penaltyAmountNum <= 0) return { ok: false, errorKey: 'common.amount' }
    try {
      const result = await call('recordPenalty', {
        groupId: session.groupId,
        memberId: session.memberId,
        targetMemberId: penaltyTarget,
        amount: penaltyAmountNum,
        reason: penaltyReason.trim(),
        pin,
      })
      if (result.ok) {
        toast.success(t('ledger.types.penalty'))
        setPenaltyOpen(false)
        setPenaltyAmount('')
        setPenaltyReason('')
        return { ok: true }
      }
      return { ok: false, errorKey: result.errorKey }
    } catch (cause) {
      return { ok: false, errorKey: translateError(t, cause) }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <BackButton to="/desk" className="self-start lg:hidden" />

      <PageHeading
        icon={LoanIcon}
        title={t('deskExtra.toolLoan')}
        description={t('deskExtra.loanSub')}
        meta={<LivePill labelKey="home.live" />}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div>
            <h2 className="flex items-center gap-2 text-[17px] font-800 text-ink">
              <LoanIcon className="size-[18px] text-green" aria-hidden="true" />
              {t('desk.loanTitle')}
            </h2>
            <p className="mt-0.5 text-[13px] font-500 text-muted">{t('desk.loanSub')}</p>
          </div>
          <div className="flex flex-col gap-4">
            <Field className="gap-1.5">
              <FieldLabel className="text-[13px] font-700">{t('desk.loanBorrower')}</FieldLabel>
              <Select
                value={borrowerId || null}
                onValueChange={(next) => setBorrowerId(next ?? '')}
                items={memberItems}
              >
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field className="gap-1.5">
              <FieldLabel className="text-[13px] font-700">{t('desk.loanPrincipal')}</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  value={principal}
                  onChange={(event) => setPrincipal(event.target.value.replace(/[^\d]/g, ''))}
                  inputMode="numeric"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText className="font-700">{t('common.rwsign')}</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription className="text-[12px]">
                {t('desk.loanVaultBalance', { amount: formatCurrency(vaultBalance, language) })}
              </FieldDescription>
              {principalBelowMin ? (
                <FieldError>{t('desk.loanPrincipalMin')}</FieldError>
              ) : null}
              {principalAboveVault ? (
                <FieldError>{t('errors.insufficientFunds')}</FieldError>
              ) : null}
            </Field>
            <Field className="gap-1.5">
              <FieldLabel className="text-[13px] font-700">{t('desk.loanTerm')}</FieldLabel>
              <ToggleGroup
                value={[String(termDays)]}
                onValueChange={(next) => {
                  const value = next[0]
                  if (value) setTermDays(value === '60' ? 60 : 30)
                }}
              >
                <ToggleGroupItem
                  value="30"
                  className="aria-pressed:bg-green aria-pressed:text-white"
                >
                  {t('desk.loanTerm30')}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="60"
                  className="aria-pressed:bg-green aria-pressed:text-white"
                >
                  {t('desk.loanTerm60')}
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>

            <div className="rounded-2xl bg-bg p-4">
              <Row label={t('desk.loanPrincipal')} value={formatCurrency(numericPrincipal, language)} />
              <Row
                label={t('desk.loanInterest')}
                value={`${formatCurrency(interest, language)} (${LOAN_INTEREST_RATE * 100}%)`}
              />
              <div className="mt-2 border-t border-line pt-2">
                <Row
                  label={t('desk.loanTotalDue')}
                  value={formatCurrency(totalDue, language)}
                  strong
                />
              </div>
            </div>

            <p className="text-[12px] font-500 leading-relaxed text-muted">{t('desk.loanNote')}</p>

            <Link
              to="/disclosure"
              className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-2xl border border-line bg-card px-5 text-[15px] font-700 text-ink transition-colors hover:border-green/40 hover:bg-green/[0.03]"
            >
              <FileTextIcon className="size-4" aria-hidden="true" />
              {t('deskExtra.loanDisclosureLink')}
            </Link>

            <p className="text-[12px] font-500 leading-relaxed text-muted">
              {t('deskExtra.loanWarning')}
            </p>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-green"
              />
              <span className="text-[13px] font-700 text-ink">{t('deskExtra.loanAgree')}</span>
            </label>

            <div className="flex justify-end">
              <Button
                className="bg-gold text-ink hover:bg-gold-deep hover:text-white disabled:bg-green/40 disabled:text-white/70 disabled:opacity-100"
                disabled={!issueValid}
                onClick={() => setPinOpen(true)}
              >
                <LoanIcon className="size-[18px]" />
                {t('deskExtra.loanIssue')}
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <div>
              <h2 className="flex items-center gap-2 text-[17px] font-800 text-ink">
                <LoanIcon className="size-[18px] text-green" aria-hidden="true" />
                {t('desk.loansActive')}
              </h2>
            </div>
            {loading.loans && activeLoans.length === 0 ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 2 }, (_, index) => (
                  <Skeleton key={index} className="h-24 rounded-2xl" />
                ))}
              </div>
            ) : activeLoans.length === 0 ? (
              <Empty>
                <EmptyMedia variant="icon">
                  <LoanIcon className="size-6" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>{t('desk.loansNone')}</EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="flex flex-col gap-3">
                {activeLoans.map((loan) => {
                  const daysLeft = Math.ceil((loan.dueAt - now) / DAY_MS)
                  const overdue = daysLeft < 0
                  return (
                    <li key={loan.id} className="rounded-2xl border border-line p-4">
                      <div className="flex items-center gap-3">
                        <MemberAvatar name={loan.borrowerName} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-800 text-ink">
                            {loan.borrowerName}
                          </p>
                          <p className="text-[12px] font-500 text-muted">
                            {t('desk.loanDue', { date: formatDate(loan.dueAt, language) })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="amount text-[15px] text-ink">
                            {formatCurrency(loan.totalDue, language)}
                          </p>
                          <p className="text-[11px] font-700 text-muted">
                            {formatCurrency(loan.principal, language)} + {LOAN_INTEREST_RATE * 100}%
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        {overdue ? (
                          <Badge className="bg-danger-bg text-danger">
                            {t('deskExtra.loanOverdue', { days: Math.abs(daysLeft) })}
                          </Badge>
                        ) : (
                          <Badge className="bg-ink/[0.06] text-muted">
                            {t('deskExtra.loanDaysLeft', { days: daysLeft })}
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRepayTarget(loan)}
                        >
                          <CheckIcon className="size-4" aria-hidden="true" />
                          {t('desk.repay')}
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card>
            <div>
              <h2 className="flex items-center gap-2 text-[17px] font-800 text-ink">
                <TriangleAlertIcon className="size-[18px] text-pending" aria-hidden="true" />
                {t('ledger.types.penalty')}
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              <Field className="gap-1.5">
                <FieldLabel className="text-[13px] font-700">{t('desk.loanBorrower')}</FieldLabel>
                <Select
                  value={penaltyTarget || null}
                  onValueChange={(next) => setPenaltyTarget(next ?? '')}
                  items={memberItems}
                >
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!penaltyTarget && (penaltyAmount.length > 0 || penaltyReason.length > 0) ? (
                  <FieldError>{t('desk.penaltyTargetRequired')}</FieldError>
                ) : null}
              </Field>
              <Field className="gap-1.5">
                <FieldLabel className="text-[13px] font-700">{t('common.amount')}</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    value={penaltyAmount}
                    onChange={(event) => setPenaltyAmount(event.target.value.replace(/[^\d]/g, ''))}
                    inputMode="numeric"
                    placeholder={t('common.amount')}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText className="font-700">{t('common.rwsign')}</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
                {penaltyAmountInvalid ? (
                  <FieldError>
                    {penaltyAmountNum > vaultBalance
                      ? t('errors.insufficientFunds')
                      : t('petition.amountInvalid')}
                  </FieldError>
                ) : null}
              </Field>
              <Field className="gap-1.5">
                <FieldLabel className="text-[13px] font-700">{t('petition.reason')}</FieldLabel>
                <Input
                  value={penaltyReason}
                  onChange={(event) => setPenaltyReason(event.target.value)}
                  placeholder={t('petitions.purpose')}
                />
                {penaltyReasonInvalid ? (
                  <FieldError>{t('desk.penaltyReasonRequired')}</FieldError>
                ) : null}
              </Field>
              <Button
                variant="outline"
                className="self-end disabled:opacity-60"
                disabled={!penaltyValid}
                onClick={() => setPenaltyOpen(true)}
              >
                <TriangleAlertIcon className="size-4" aria-hidden="true" />
                {t('ledger.types.penalty')}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <PinGateModal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        title={t('desk.loanSubmit')}
        submitLabel={t('desk.loanSubmit')}
        onSubmit={issue}
      >
        <div className="rounded-2xl bg-bg p-4">
          <Row
            label={t('desk.loanTotalDue')}
            value={formatCurrency(totalDue, language)}
            strong
          />
          <Row label={t('desk.loanTerm')} value={termDays === 30 ? t('desk.loanTerm30') : t('desk.loanTerm60')} />
        </div>
      </PinGateModal>

      <PinGateModal
        open={Boolean(repayTarget)}
        onClose={() => setRepayTarget(null)}
        title={t('desk.repay')}
        submitLabel={t('desk.repay')}
        onSubmit={repay}
      >
        {repayTarget ? (
          <div className="rounded-2xl bg-bg p-4">
            <Row label={repayTarget.borrowerName} value={formatCurrency(repayTarget.totalDue, language)} strong />
          </div>
        ) : null}
      </PinGateModal>

      <PinGateModal
        open={penaltyOpen}
        onClose={() => setPenaltyOpen(false)}
        title={t('ledger.types.penalty')}
        submitLabel={t('common.confirm')}
        onSubmit={penalise}
      />
    </div>
  )
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className={`text-[13px] ${strong ? 'font-800 text-ink' : 'font-500 text-muted'}`}>
        {label}
      </span>
      <span className={`amount text-[14px] ${strong ? 'text-ink' : 'text-ink/80'}`}>{value}</span>
    </div>
  )
}
