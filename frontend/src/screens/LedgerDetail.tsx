'use client'

import { useState } from 'react'
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
import { PageHeading } from '@/components/page-heading'
import { LedgerIcon, LoanIcon, LockIcon } from '@/components/icons'
import { currentLanguage } from '@/i18n'
import { isGovernanceEntry } from '@shared/ledger'
import { formatAmount, formatCurrency, formatDateTime } from '@shared/money'
import type { AuditEntryType, AuditLogDoc } from '@shared/schema'

const TONE: Record<AuditEntryType, string> = {
  deposit: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  payout: 'border-amber-200 bg-amber-50 text-amber-800',
  loan_issue: 'border-sky-200 bg-sky-50 text-sky-800',
  loan_repay: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  penalty: 'border-rose-200 bg-rose-50 text-rose-800',
  cash_entry: 'border-line bg-ink/[0.04] text-muted',
  role_change: 'border-violet-200 bg-violet-50 text-violet-800',
  group_rule_change: 'border-slate-200 bg-slate-50 text-slate-700',
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

export function LedgerDetail() {
  const { t } = useTranslation()
  const { txn } = useParams()
  const { auditLogs, loading, error } = useData()

  const entry = auditLogs.find((row) => row.id === txn || row.txnId === txn)

  // Cold load: the collection is still empty while the listener attaches, so
  // the "not found" branch would flash. Show the skeleton until it settles.
  if (!entry && loading.auditLogs) {
    return <PageSkeleton rows={3} />
  }

  if (!entry && error === 'auditLogs') {
    return <ErrorState onRetry={() => window.location.reload()} />
  }

  if (!entry) {
    return (
      <div className="flex flex-col gap-6">
        <BackButton to="/ledger" className="-ml-2 self-start" />
        <Card>
          <p className="text-[15px] font-700 text-ink">{t('ledgerDetail.notFound')}</p>
        </Card>
      </div>
    )
  }

  return <LedgerEntryView entry={entry} />
}

function LedgerEntryView({ entry }: { entry: AuditLogDoc }) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { members, loans, call } = useData()
  const toast = useToast()
  const language = currentLanguage()

  const [gateOpen, setGateOpen] = useState(false)

  const initiator = members.find((member) => member.id === entry.initiatorId)
  const myLoan = session
    ? loans.find((loan) => loan.status === 'active' && loan.borrowerId === session.memberId)
    : undefined
  const showRepay =
    entry.type === 'loan_issue' &&
    session != null &&
    myLoan != null &&
    (entry.relatedId === session.memberId || entry.relatedId === myLoan.id)

  const runRepay = async (pin: string): Promise<PinGateResult> => {
    if (!session || !myLoan) return { ok: false }
    const result = await call('repayLoan', {
      groupId: session.groupId,
      memberId: session.memberId,
      loanId: myLoan.id,
      pin,
    })
    if (result.ok) {
      toast.success(
        t('ledgerRepay.title'),
        result.txnId ? t('ledgerRepay.success', { txn: result.txnId }) : undefined,
      )
    } else {
      toast.error(t('errors.generic'), result.errorKey ? t(result.errorKey) : undefined)
    }
    return { ok: result.ok, errorKey: result.errorKey }
  }

  const outgoing = entry.type === 'payout' || entry.type === 'loan_issue'

  return (
    <div className="flex flex-col gap-6">
      <BackButton to="/ledger" className="-ml-2 self-start" />
      <PageHeading
        icon={LedgerIcon}
        title={t('ledgerDetail.title', { txn: entry.txnId })}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={TONE[entry.type]}>{t(`ledger.types.${entry.type}`)}</Badge>
          {entry.pinVerified ? (
            <Badge variant="outline">{t('ledger.pinVerified')}</Badge>
          ) : (
            <Badge className="bg-ink/[0.06] text-muted">{t('ledger.pinNotRequired')}</Badge>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Avatar size="default">
            <AvatarFallback>{initialsOf(entry.initiatorName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-800 text-ink">
              {initiator && initiator.id === session?.memberId
                ? t('common.you')
                : entry.initiatorName}
            </p>
            <p className="text-[12px] font-500 text-muted">{t(`roles.${entry.initiatorRole}`)}</p>
          </div>
          <span
            className={`amount shrink-0 text-[18px] ${
              isGovernanceEntry(entry.type)
                ? 'text-muted'
                : outgoing
                  ? 'text-danger'
                  : 'text-success'
            }`}
          >
            {isGovernanceEntry(entry.type) ? (
              '—'
            ) : (
              <>
                {outgoing ? '−' : '+'}
                {formatAmount(entry.amount, language)}
              </>
            )}
          </span>
        </div>

        <dl className="mt-4 divide-y divide-line">
          <DetailRow label={t('ledger.detail')} value={entry.detail} />
          <DetailRow
            label={t('ledgerDetail.time')}
            value={formatDateTime(entry.timestamp, language)}
          />
          <DetailRow
            label={t('ledgerDetail.after')}
            value={formatAmount(entry.balanceAfter, language)}
          />
        </dl>
      </Card>

      <Card className="bg-bg">
        <div className="flex items-start gap-2.5">
          <LockIcon className="mt-0.5 size-4 shrink-0 text-muted" />
          <p className="text-[13px] font-500 leading-relaxed text-muted">
            {t('ledgerDetail.immutable')}
          </p>
        </div>
      </Card>

      {showRepay && myLoan ? (
        <Card>
          <h2 className="flex items-center gap-2 text-[17px] font-800 text-ink">
            <LoanIcon className="size-[18px] text-green" aria-hidden="true" />
            {t('ledgerRepay.title')}
          </h2>
          <div className="mt-1 flex items-center justify-between gap-4 py-2">
            <span className="text-[13px] font-500 text-muted">{t('ledgerRepay.due')}</span>
            <span className="amount text-[18px] font-800 text-gold-deep">
              {formatCurrency(myLoan.totalDue, language)}
            </span>
          </div>
          <Button
            className="mt-4 w-full bg-gold text-ink hover:bg-gold-deep hover:text-white"
            onClick={() => setGateOpen(true)}
          >
            <LoanIcon className="size-[18px]" aria-hidden="true" />
            {t('ledgerRepay.pay')}
          </Button>
        </Card>
      ) : null}

      <PinGateModal
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        title={t('ledgerRepay.pay')}
        submitLabel={t('ledgerRepay.pay')}
        onSubmit={runRepay}
      >
        <div className="rounded-2xl bg-bg p-4">
          <p className="text-[13px] font-700 text-muted">{t('ledgerRepay.due')}</p>
          <p className="amount mt-1 text-[17px] font-800 text-gold-deep">
            {myLoan ? formatCurrency(myLoan.totalDue, language) : ''}
          </p>
        </div>
      </PinGateModal>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <dt className="shrink-0 text-[13px] font-500 text-muted">{label}</dt>
      <dd className="text-right text-[13px] font-700 text-ink">{value}</dd>
    </div>
  )
}
