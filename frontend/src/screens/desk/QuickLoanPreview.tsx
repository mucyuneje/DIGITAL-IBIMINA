'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '@/lib/router'
import { Card } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { LoanIcon } from '@/components/icons'
import { ArrowRightIcon } from 'lucide-react'
import { currentLanguage } from '@/i18n'
import { formatCurrency } from '@shared/money'
import { LOAN_INTEREST_RATE, loanTotalDue } from '@shared/schema'

/**
 * Quick loan preview (R31): principal → interest → total due, live as the
 * officer types. The maths is the loan tool's maths — same `loanTotalDue`,
 * same rate — so the preview can never disagree with the form.
 */
export function QuickLoanPreview() {
  const { t } = useTranslation()
  const language = currentLanguage()
  const [principal, setPrincipal] = useState('100000')

  const numeric = Number(principal.replace(/[^\d]/g, '') || 0)
  const total = loanTotalDue(numeric)
  const interest = total - numeric

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[17px] font-800 text-ink">
            <LoanIcon className="size-[18px] text-green" aria-hidden="true" />
            {t('deskExtra.quickLoan.title')}
          </h2>
          <p className="mt-0.5 text-[13px] font-500 leading-relaxed text-muted">
            {t('deskExtra.quickLoan.hint')}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-gold-soft px-2.5 py-1 text-[11px] font-800 text-pending">
          {`${LOAN_INTEREST_RATE * 100}%`}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <Field className="gap-1.5">
          <FieldLabel className="text-[13px] font-700">{t('desk.loanPrincipal')}</FieldLabel>
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <InputGroupText className="font-700">RWF</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              value={principal}
              onChange={(event) =>
                setPrincipal(event.target.value.replace(/[^\d]/g, '').slice(0, 12))
              }
              inputMode="numeric"
              className="tracking-[0.04em]"
            />
          </InputGroup>
        </Field>

        <dl className="divide-y divide-line overflow-hidden rounded-2xl bg-bg px-4">
          <Row label={t('desk.loanPrincipal')} value={formatCurrency(numeric, language)} />
          <Row label={t('desk.loanInterest')} value={formatCurrency(interest, language)} />
          <Row
            label={t('desk.loanTotalDue')}
            value={formatCurrency(total, language)}
            strong
          />
        </dl>

        <Link
          to="/desk/loan"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gold px-4 text-[14px] font-800 text-ink transition-colors hover:bg-gold-deep hover:text-white"
        >
          {t('deskExtra.quickLoan.action')}
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </Card>
  )
}

function Row({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-[13px] font-500 text-muted">{label}</dt>
      <dd
        className={[
          'truncate font-800 text-ink',
          strong ? 'text-[16px]' : 'text-[14px]',
        ].join(' ')}
      >
        {value}
      </dd>
    </div>
  )
}
