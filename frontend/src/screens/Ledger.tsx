'use client'

import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PinGateModal, type PinGateResult } from '@/components/pin-gate'
import { MemberAvatar } from '@/components/member-avatar'
import { PageHeading, type PageIcon } from '@/components/page-heading'
import {
  CheckIcon,
  DepositIcon,
  LedgerIcon,
  LoanIcon,
  LockIcon,
  SearchIcon,
  ShieldIcon,
  VaultIcon,
} from '@/components/icons'
import { TriangleAlertIcon } from 'lucide-react'
import type { AuditEntryType } from '@shared/schema'
import { isGovernanceEntry } from '@shared/ledger'
import { currentLanguage } from '@/i18n'
import { formatAmount, formatCurrency, formatDateTime } from '@shared/money'

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

type TabFilter = 'all' | 'deposits' | 'payouts' | 'loans' | 'penalties'

const TABS: TabFilter[] = ['all', 'deposits', 'payouts', 'loans', 'penalties']

const TAB_TYPES: Record<TabFilter, AuditEntryType[] | null> = {
  all: null,
  deposits: ['deposit'],
  payouts: ['payout'],
  loans: ['loan_issue', 'loan_repay'],
  penalties: ['penalty'],
}

const TAB_ICON: Record<TabFilter, PageIcon> = {
  all: LedgerIcon,
  deposits: DepositIcon,
  payouts: VaultIcon,
  loans: LoanIcon,
  penalties: TriangleAlertIcon,
}

export function Ledger() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { auditLogs, members, loans, loading, call } = useData()
  const toast = useToast()
  const language = currentLanguage()
  const [tab, setTab] = useState<TabFilter>('all')
  const [initiator, setInitiator] = useState<'all' | string>('all')
  const [term, setTerm] = useState('')
  const [gateOpen, setGateOpen] = useState(false)

  const myLoan = session
    ? loans.find((loan) => loan.status === 'active' && loan.borrowerId === session.memberId)
    : undefined

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
      setGateOpen(false)
    } else {
      toast.error(t('errors.generic'), result.errorKey ? t(result.errorKey) : undefined)
    }
    return { ok: result.ok, errorKey: result.errorKey }
  }

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase()
    const allowedTypes = TAB_TYPES[tab]
    return auditLogs.filter((entry) => {
      if (allowedTypes && !allowedTypes.includes(entry.type)) return false
      if (initiator !== 'all' && entry.initiatorId !== initiator) return false
      if (!needle) return true
      return (
        entry.txnId.toLowerCase().includes(needle) ||
        entry.detail.toLowerCase().includes(needle) ||
        String(entry.amount).includes(needle) ||
        entry.initiatorName.toLowerCase().includes(needle)
      )
    })
  }, [auditLogs, tab, initiator, term])

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        icon={LedgerIcon}
        title={t('ledger.title')}
        description={t('ledger.sub')}
        meta={
          <Badge variant="outline">
            <LockIcon className="size-3.5" />
            {t('ledger.locked')}
          </Badge>
        }
        actions={
          <Badge className="bg-green text-white">
            <ShieldIcon className="size-3.5" />
            {t('ledger.exportNote', { count: filtered.length, total: auditLogs.length })}
          </Badge>
        }
      />

      <p className="-mt-3 text-[12px] font-500 text-muted">{t('ledgerDetail.immutable')}</p>

      {myLoan ? (
        <Card>
          <h2 className="flex items-center gap-2 text-[17px] font-800 text-ink">
            <LoanIcon className="size-[18px] text-green" aria-hidden="true" />
            {t('ledgerRepay.title')}
          </h2>
          <div className="mt-2 flex items-center justify-between gap-4 py-1">
            <span className="text-[13px] font-500 text-muted">{t('ledgerRepay.principal')}</span>
            <span className="amount text-[15px] font-800 text-ink">
              {formatCurrency(myLoan.principal, language)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 py-1">
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
        {myLoan ? (
          <div className="rounded-2xl bg-bg p-4">
            <p className="text-[13px] font-700 text-muted">{t('ledgerRepay.due')}</p>
            <p className="amount mt-1 text-[17px] font-800 text-gold-deep">
              {formatCurrency(myLoan.totalDue, language)}
            </p>
          </div>
        ) : null}
      </PinGateModal>

      <Card>
        <Tabs value={tab} onValueChange={(next) => setTab(next as TabFilter)}>
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0 sm:w-auto sm:flex-nowrap">
            {TABS.map((key) => {
              const TabIcon = TAB_ICON[key]
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="rounded-chip border border-line bg-card px-3 py-1.5 text-[13px] font-700 data-active:border-green data-active:bg-green data-active:text-white"
                >
                  <TabIcon className="size-3.5" aria-hidden="true" />
                  {t(`ledgerTabs.${key}`)}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
        <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <SearchIcon className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder={t('ledger.searchPlaceholder')}
            />
          </InputGroup>
          <Select
            value={initiator}
            items={[
              { value: 'all', label: `${t('ledger.initiator')} · ${t('common.all')}` },
              ...members.map((member) => ({ value: member.id, label: member.name })),
            ]}
            onValueChange={(next) => {
              if (next) setInitiator(next)
            }}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t('ledger.initiator')} · {t('common.all')}
              </SelectItem>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading.auditLogs && auditLogs.length === 0 ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-11 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LockIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle>
              {auditLogs.length === 0 ? t('ledger.empty') : t('ledger.emptyFiltered')}
            </EmptyTitle>
            {auditLogs.length === 0 ? (
              <EmptyDescription>{t('ledger.emptyHint')}</EmptyDescription>
            ) : null}
          </EmptyHeader>
        </Empty>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('ledger.txn')}</TableHead>
                <TableHead>{t('ledger.type')}</TableHead>
                <TableHead>{t('ledger.initiatedBy')}</TableHead>
                <TableHead>{t('ledger.detail')}</TableHead>
                <TableHead>{t('ledger.pinColumn')}</TableHead>
                <TableHead className="text-right">{t('common.amount')}</TableHead>
                <TableHead className="text-right">{t('ledger.balanceAfter')}</TableHead>
                <TableHead>{t('ledgerDetail.time')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => (
                <TableRow
                  key={entry.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/ledger/${entry.txnId}`)}
                >
                  <TableCell className="font-mono text-[11px] font-700 tracking-wide text-muted">
                    <Link
                      to={`/ledger/${entry.txnId}`}
                      className="underline decoration-dotted underline-offset-2 hover:text-green"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {entry.txnId}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge className={TONE[entry.type]}>
                      {t(`ledger.types.${entry.type}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MemberAvatar name={entry.initiatorName} size="sm" />
                      <span className="font-700 text-ink">
                        {entry.initiatorId === session?.memberId
                          ? t('common.you')
                          : entry.initiatorName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate font-700 text-ink">
                    {entry.detail}
                  </TableCell>
                  <TableCell>
                    {entry.pinVerified ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50 text-emerald-800"
                      >
                        <CheckIcon className="size-3" />
                        {t('ledger.pinVerified')}
                      </Badge>
                    ) : (
                      <Badge className="bg-ink/[0.06] text-muted">
                        {t('ledger.pinNotRequired')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell
                    className={`amount text-right ${
                      isGovernanceEntry(entry.type)
                        ? 'text-muted'
                        : entry.type === 'payout' || entry.type === 'loan_issue'
                          ? 'text-danger'
                          : 'text-success'
                    }`}
                  >
                    {isGovernanceEntry(entry.type) ? (
                      '—'
                    ) : (
                      <>
                        {entry.type === 'payout' || entry.type === 'loan_issue' ? '−' : '+'}
                        {formatAmount(entry.amount, language)}
                      </>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted">
                    {formatAmount(entry.balanceAfter, language)}
                  </TableCell>
                  <TableCell className="text-[12px] font-500 text-muted">
                    {formatDateTime(entry.timestamp, language)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
