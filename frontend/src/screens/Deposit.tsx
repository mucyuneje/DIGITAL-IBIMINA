'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import {
  ArrowRightIcon,
  DeleteIcon,
  InfoIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  WalletIcon,
} from 'lucide-react'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CheckIcon, CloseIcon, DepositIcon, VaultIcon } from '@/components/icons'
import { PageHeading } from '@/components/page-heading'
import { PageSkeleton } from '@/components/page-skeleton'
import { PhoneNumberField } from '@/components/phone-field'
import { translateError } from '@/lib/errors'
import { contributedThisCycle } from '@/lib/cycle'
import { currentLanguage } from '@/i18n'
import { formatAmount, formatCurrency } from '@shared/money'
import {
  PIN_LENGTH,
  isValidRwandanPhone,
  normalizePhone,
  rwandanNationalNumber,
} from '@shared/schema'

export function Deposit() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { group, auditLogs, ready } = useData()
  const language = currentLanguage()

  const [amount, setAmount] = useState('')
  const [amountEdited, setAmountEdited] = useState(false)
  const contribution = group?.contributionAmount ?? null
  const [prefilledFor, setPrefilledFor] = useState<number | null>(null)

  // Prefill once group data arrives (cold /deposit load races the subscription).
  // Adjust-during-render pattern: safe, no effect, no cascade.
  if (!amountEdited && contribution != null && contribution !== prefilledFor) {
    setPrefilledFor(contribution)
    setAmount(String(contribution))
  }

  const [momo, setMomo] = useState(() => rwandanNationalNumber(session?.phone ?? ''))
  const [pinOpen, setPinOpen] = useState(false)

  const numericAmount = Number(amount.replace(/[^\d]/g, '')) || 0
  const balanceAfter = (group?.vaultBalance ?? 0) + numericAmount
  const momoTouched = momo.trim().length > 0
  const momoValid = isValidRwandanPhone(momo)
  const momoDiffers =
    momoValid &&
    Boolean(session?.phone) &&
    normalizePhone(momo) !== normalizePhone(session?.phone ?? '')
  const amountValid = numericAmount > 0
  const canContinue = amountValid && momoValid
  const myContributed = session ? contributedThisCycle(session.memberId, auditLogs) : 0
  const completesContribution =
    Boolean(group) &&
    numericAmount > 0 &&
    myContributed + numericAmount >= (group?.contributionAmount ?? 0)

  // Quick amounts are multiples of this group's contribution, never fixed
  // numbers copied from another Ikimina.
  const quick = useMemo(
    () =>
      group
        ? [0.5, 1, 2]
            .map((multiple) => Math.round(group.contributionAmount * multiple))
            .filter((value, index, all) => value > 0 && all.indexOf(value) === index)
        : [],
    [group],
  )

  // Cold load: the vault and contribution arrive with the group document, so
  // hold the form until it lands rather than showing a 0 balance and no prefill.
  if (!ready) {
    return <PageSkeleton rows={3} className="mx-auto max-w-xl" />
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 pb-4">
      <PageHeading
        icon={DepositIcon}
        title={t('deposit.title')}
        description={t('deposit.sub', { group: group?.name ?? t('common.appName') })}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <Card className="overflow-hidden p-0">
          {/* The balance stays visible while the member types, so the effect
              of the deposit is always one glance away. */}
          <div className="relative overflow-hidden bg-green px-5 py-5 text-white sm:px-6">
            <span
              className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full bg-gold/15"
              aria-hidden="true"
            />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10px] font-800 uppercase tracking-[0.16em] text-white/60">
                  <VaultIcon className="size-3.5" />
                  {t('deposit.vault')}
                </p>
                <p className="amount mt-2 truncate text-[32px] leading-none sm:text-[38px]">
                  {formatCurrency(group?.vaultBalance ?? 0, language)}
                </p>
              </div>
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-gold">
                <WalletIcon className="size-5" />
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-6 p-5 sm:p-6">
            <Field className="gap-2">
              <div className="flex items-center justify-between gap-3">
                <FieldLabel className="text-[13px] font-800">
                  {t('deposit.amountLabel')}
                </FieldLabel>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-700 text-muted">
                  <WalletIcon className="size-3.5" />
                  {t('common.rwsign')}
                </span>
              </div>
              <InputGroup className="h-16 w-full rounded-2xl border-2 border-line bg-card shadow-none">
                <InputGroupInput
                  value={amount}
                  onChange={(event) => {
                    setAmountEdited(true)
                    setAmount(event.target.value.replace(/[^\d]/g, ''))
                  }}
                  inputMode="numeric"
                  aria-label={t('deposit.amountLabel')}
                  className="amount h-full px-4 text-[30px] font-800 leading-none sm:text-[36px]"
                  placeholder="0"
                />
                <InputGroupAddon align="inline-end" className="pr-4">
                  <InputGroupText className="text-[13px] font-800 tracking-wide text-muted">
                    {t('common.rwsign')}
                  </InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              <p className="text-[12px] font-500 leading-relaxed text-muted">
                {t('deposit.amountHint', {
                  amount: formatCurrency(contribution ?? 0, language),
                })}
              </p>

              <ToggleGroup
                value={amount === '' ? [] : [amount]}
                onValueChange={(next) => {
                  const value = next[0]
                  if (value) {
                    setAmountEdited(true)
                    setAmount(value)
                  }
                }}
                className="mt-1 w-full flex-wrap justify-start"
              >
                {quick.map((value) => {
                  const selected = String(value) === amount
                  return (
                    <ToggleGroupItem
                      key={value}
                      value={String(value)}
                      className={[
                        'h-9 min-w-0 rounded-chip px-3.5 text-[12px] font-700 transition-colors',
                        selected
                          ? 'border border-gold bg-gold text-ink hover:bg-gold-deep hover:text-white aria-pressed:border-gold aria-pressed:bg-gold aria-pressed:text-ink hover:aria-pressed:bg-gold-deep hover:aria-pressed:text-white'
                          : 'border border-line bg-bg text-muted hover:border-gold/50 hover:text-ink aria-pressed:border-line aria-pressed:bg-bg aria-pressed:text-muted',
                      ].join(' ')}
                    >
                      {formatAmount(value, language)}
                    </ToggleGroupItem>
                  )
                })}
              </ToggleGroup>
            </Field>

            <div className="h-px bg-line" />

            <Field className="gap-2">
              <FieldLabel className="flex items-center gap-1.5 text-[13px] font-800">
                <SmartphoneIcon className="size-4 text-green" />
                {t('deposit.momoLabel')}
              </FieldLabel>
              <PhoneNumberField
                value={momo}
                onValueChange={setMomo}
                invalid={momoTouched && !momoValid}
                groupClassName={[
                  'h-12',
                  momoTouched && !momoValid ? 'border-danger' : '',
                ].join(' ')}
                aria-label={t('deposit.momoLabel')}
                aria-describedby={
                  momoTouched && !momoValid ? 'deposit-momo-error' : 'deposit-momo-hint'
                }
              />
              <p id="deposit-momo-hint" className="text-[12px] font-500 leading-relaxed text-muted">
                {t('deposit.momoHint')}
              </p>
              {momoTouched && !momoValid ? (
                <FieldError id="deposit-momo-error">{t('deposit.momoInvalid')}</FieldError>
              ) : null}
              {momoDiffers ? (
                <p className="flex items-start gap-2 rounded-xl bg-pending-bg px-3 py-2 text-[12px] font-600 leading-relaxed text-pending">
                  <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {t('deposit.momoDifferent')}
                </p>
              ) : null}
            </Field>

            <div className="rounded-2xl bg-bg p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-[12px] font-600 text-muted">
                  <WalletIcon className="size-4 text-green" />
                  {t('deposit.previewLabel')}
                </span>
                <span className="amount shrink-0 text-[16px] text-green">
                  {formatCurrency(balanceAfter, language)}
                </span>
              </div>
              {amountValid ? (
                <p className="mt-1 text-right text-[12px] font-700 text-gold-deep">
                  + {formatAmount(numericAmount, language)} {t('common.rwsign')}
                </p>
              ) : null}
              {completesContribution ? (
                <p className="mt-2 flex items-start gap-1.5 border-t border-line/70 pt-2 text-[12px] font-600 leading-relaxed text-success">
                  <CheckIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {t('deposit.willBePaid')}
                </p>
              ) : null}
            </div>

            <Button
              size="lg"
              className="h-14 w-full bg-gold text-[15px] font-800 text-ink hover:bg-gold-deep hover:text-white"
              disabled={!canContinue}
              onClick={() => setPinOpen(true)}
            >
              {amountValid
                ? t('deposit.continueAmount', {
                    amount: formatCurrency(numericAmount, language),
                  })
                : t('deposit.continue')}
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </Card>

        <Card className="hidden gap-4 lg:flex">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success-bg text-success">
              <WalletIcon className="size-[18px]" />
            </span>
            <h2 className="text-[15px] font-800 text-ink">{t('deposit.summary')}</h2>
          </div>

          <dl className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-[12px] font-500 text-muted">{t('deposit.currentBalance')}</dt>
              <dd className="amount text-right text-[13px] text-ink">
                {formatCurrency(group?.vaultBalance ?? 0, language)}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-[12px] font-500 text-muted">{t('deposit.amountLabel')}</dt>
              <dd className="amount text-right text-[13px] text-green">
                {amountValid ? `+ ${formatCurrency(numericAmount, language)}` : '—'}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3 border-t border-line pt-3">
              <dt className="text-[12px] font-800 text-ink">{t('deposit.afterBalance')}</dt>
              <dd className="amount text-right text-[15px] text-green">
                {formatCurrency(balanceAfter, language)}
              </dd>
            </div>
          </dl>

          <div className="flex items-start gap-2 rounded-xl bg-bg p-3 text-[11px] font-500 leading-relaxed text-muted">
            <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-green" />
            {t('deposit.pinNote')}
          </div>
        </Card>
      </div>

      <PinStepDialog
        key={pinOpen ? 'open' : 'closed'}
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        amount={numericAmount}
        momo={normalizePhone(momo)}
        onDone={() => navigate('/')}
      />
    </div>
  )
}

/**
 * Step 2: the PIN lives in a dialog, never inline (pitch mockup).
 * Five round dots, a 3×4 keypad, a shake on a wrong PIN, then a short
 * success state. The deposit logic itself is unchanged — it still calls
 * `recordDeposit` and the service layer writes the ledger entry + vault.
 */
function PinStepDialog({
  open,
  onClose,
  amount,
  momo,
  onDone,
}: {
  open: boolean
  onClose: () => void
  amount: number
  momo: string
  onDone: () => void
}) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { group, call } = useData()
  const toast = useToast()
  const language = currentLanguage()

  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [succeeded, setSucceeded] = useState<{ balanceAfter: number } | null>(null)
  /** `pending` = the request left the app and we are waiting on MoMo. */
  const [pending, setPending] = useState(false)
  const keyboardRef = useRef<HTMLInputElement | null>(null)
  // Balance captured the moment a deposit is attempted; the optimistic patch
  // mutates `group`, so the success card must not read the bumped value.
  const balanceBeforeRef = useRef(0)

  useEffect(() => {
    if (open && !busy && !succeeded && !pending) keyboardRef.current?.focus()
  }, [open, busy, succeeded, pending])

  /**
   * Polls a started payment until the provider settles it. The vault only
   * moves on `confirmed`, so the optimistic patch is applied at that point —
   * never while the money is still on its way.
   */
  const pollUntilSettled = useCallback(
    async (paymentRef: string, candidate: string): Promise<void> => {
      if (!session) return
      // Give the sandbox/provider a moment before the first poll.
      await new Promise((resolve) => window.setTimeout(resolve, 700))
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const result = await call('recordDeposit', {
          groupId: session.groupId,
          memberId: session.memberId,
          amount,
          momoNumber: momo,
          pin: candidate,
          paymentRef,
        })
        if (!result.ok) {
          setPending(false)
          setError(t(result.errorKey ?? 'errors.generic'))
          setPin('')
          return
        }
        if (result.status === 'confirmed') {
          toast.success(
            t('deposit.success', { amount: formatCurrency(amount, language) }),
            t('deposit.successNote', { txn: result.txnId ?? '' }),
          )
          setPending(false)
          setSucceeded({ balanceAfter: balanceBeforeRef.current + amount })
          return
        }
        await new Promise((resolve) => window.setTimeout(resolve, 900))
      }
      // Timed out still pending — surface it honestly rather than faking success.
      setPending(false)
      setError(t('deposit.stillPending'))
    },
    [amount, call, language, momo, session, t, toast],
  )

  const submit = useCallback(
    async (candidate: string) => {
      if (!session || candidate.length !== PIN_LENGTH) return
      setBusy(true)
      setError(null)
      // Snapshot the current vault before any optimistic patch mutates it.
      balanceBeforeRef.current = group?.vaultBalance ?? 0
      try {
        const result = await call('recordDeposit', {
          groupId: session.groupId,
          memberId: session.memberId,
          amount,
          momoNumber: momo,
          pin: candidate,
        })
        if (!result.ok) {
          setShake(true)
          window.setTimeout(() => setShake(false), 450)
          setError(t(result.errorKey ?? 'errors.generic'))
          setPin('')
          return
        }
        // Money is requested, not moved. Wait for the provider to confirm.
        if (result.status === 'requested' && result.paymentRef) {
          setPending(true)
          await pollUntilSettled(result.paymentRef, candidate)
          return
        }
        // No async provider (e.g. a future synchronous backend): settle now.
        toast.success(
          t('deposit.success', { amount: formatCurrency(amount, language) }),
          t('deposit.successNote', { txn: result.txnId ?? '' }),
        )
        setSucceeded({ balanceAfter: balanceBeforeRef.current + amount })
      } catch (cause) {
        setShake(true)
        window.setTimeout(() => setShake(false), 450)
        setError(translateError(t, cause))
        setPin('')
      } finally {
        setBusy(false)
      }
    },
    [amount, call, group?.vaultBalance, language, momo, pollUntilSettled, session, t, toast],
  )

  const pinReady = pin.length === PIN_LENGTH

  const pushDigit = useCallback(
    (digit: string) => {
      if (busy) return
      setPin((current) => {
        if (current.length >= PIN_LENGTH) return current
        return current + digit
      })
      setError(null)
    },
    [busy],
  )

  const removeDigit = useCallback(() => {
    if (busy) return
    setPin((current) => current.slice(0, -1))
    setError(null)
  }, [busy])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:max-w-sm"
      >
        {succeeded ? (
          <SuccessState amount={amount} balanceAfter={succeeded.balanceAfter} onDone={onDone} />
        ) : pending ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-gold-soft text-pending">
              <Spinner className="size-7" />
            </span>
            <div>
              <DialogTitle className="text-[18px] font-800">{t('deposit.pendingTitle')}</DialogTitle>
              <p className="mt-1 text-[13px] font-600 text-muted" role="status">
                {t('deposit.pendingBody')}
              </p>
            </div>
            <span className="amount text-[20px] text-ink">{formatCurrency(amount, language)}</span>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setPending(false)
                setPin('')
              }}
            >
              {t('common.cancel')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5">
            <div className="flex w-full items-center justify-between">
              <DialogTitle className="text-[18px] font-800">{t('deposit.pinTitle')}</DialogTitle>
              <button
                type="button"
                aria-label={t('common.cancel')}
                onClick={() => !busy && onClose()}
                className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
              >
                <CloseIcon className="size-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[15px] font-700">
              <span className="amount">{formatAmount(amount, language)}</span>
              <span className="text-muted">{t('common.rwsign')}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        aria-label={t('deposit.pinNote')}
                        className="ml-1 grid size-5 place-items-center rounded-full text-muted"
                      />
                    }
                  >
                    <InfoIcon className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent>{t('deposit.pinNote')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Hidden input keeps the physical keyboard working. */}
            <input
              ref={keyboardRef}
              value=""
              onChange={(event) => {
                const digit = event.target.value.replace(/\D/g, '').slice(-1)
                if (digit) pushDigit(digit)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Backspace') {
                  event.preventDefault()
                  removeDigit()
                }
              }}
              inputMode="numeric"
              autoComplete="off"
              aria-label={t('auth.pinTitle')}
              className="sr-only"
            />

            <div
              className={`flex items-center justify-center gap-3 ${shake ? 'animate-shake' : ''}`}
              aria-hidden="true"
            >
              {Array.from({ length: PIN_LENGTH }, (_, index) => (
                <span
                  key={index}
                  className={[
                    'size-3.5 rounded-full transition-colors',
                    index < pin.length ? 'bg-green' : 'bg-ink/15',
                  ].join(' ')}
                />
              ))}
            </div>

            {error ? (
              <p role="alert" className="-mt-2 text-[12px] font-700 text-danger">
                {error}
              </p>
            ) : null}

            <PinKeypad
              disabled={busy}
              onDigit={pushDigit}
              onDelete={removeDigit}
            />

            <Button
              size="lg"
              className="h-14 w-full bg-gold text-[15px] font-800 text-ink hover:bg-gold-deep hover:text-white"
              disabled={busy || !pinReady}
              onClick={() => void submit(pin)}
            >
              {busy ? <Spinner className="size-5" /> : null}
              {busy ? t('deposit.submitting') : t('deposit.submit')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** The 3×4 keypad of the pitch mockup: 1–9, empty, 0, backspace. */
function PinKeypad({
  disabled,
  onDigit,
  onDelete,
}: {
  disabled?: boolean
  onDigit: (digit: string) => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

  return (
    <div role="group" aria-label={t('auth.pinKeypad')} className="grid w-full grid-cols-3 gap-2">
      {digits.map((digit) => (
        <PinKey key={digit} label={digit} onClick={() => onDigit(digit)} disabled={disabled} />
      ))}
      <span aria-hidden="true" />
      <PinKey label="0" onClick={() => onDigit('0')} disabled={disabled} />
      <PinKey
        label={t('auth.pinDelete')}
        onClick={onDelete}
        disabled={disabled}
        icon={<DeleteIcon className="size-5" />}
      />
    </div>
  )
}

function PinKey({
  label,
  onClick,
  disabled,
  icon,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  icon?: ReactNode
}) {
  return (
    <Button
      type="button"
      variant="outline"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="h-14 w-full rounded-xl text-[20px] font-800"
    >
      {icon ?? label}
    </Button>
  )
}

function SuccessState({
  amount,
  balanceAfter,
  onDone,
}: {
  amount: number
  balanceAfter: number
  onDone: () => void
}) {
  const { t } = useTranslation()
  const language = currentLanguage()

  return (
    <div className="animate-rise flex flex-col items-center gap-4 py-2 text-center">
      <span className="grid size-16 animate-pulse-soft place-items-center rounded-full bg-green text-white">
        <CheckIcon className="size-8" />
      </span>
      <div>
        <DialogTitle className="text-[18px] font-800">{t('deposit.successTitle')}</DialogTitle>
        <p className="amount mt-1 text-[22px] text-green">+ {formatCurrency(amount, language)}</p>
        <p className="mt-1 text-[12px] font-600 text-muted">
          {t('deposit.vault')}: {formatCurrency(balanceAfter, language)}
        </p>
      </div>
      <Button
        size="lg"
        className="h-14 w-full bg-gold text-[15px] font-800 text-ink hover:bg-gold-deep hover:text-white"
        onClick={onDone}
      >
        {t('deposit.done')}
      </Button>
    </div>
  )
}
