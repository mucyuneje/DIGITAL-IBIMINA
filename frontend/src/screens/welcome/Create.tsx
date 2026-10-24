'use client'

import { useState } from 'react'
import { useNavigate } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { WelcomeLayout } from './WelcomeLayout'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'
import { PhoneNumber, PhoneNumberField } from '@/components/phone-field'
import { CheckIcon, PlusIcon } from '@/components/icons'
import { SendIcon, ShieldCheckIcon, TriangleAlertIcon } from 'lucide-react'
import { translateError } from '@/lib/errors'
import { currentLanguage } from '@/i18n'
import { formatAmount } from '@shared/money'
import {
  MEMBER_CAP,
  PIN_LENGTH,
  isValidRwandanPhone,
  normalizePhone,
  rwandanNationalNumber,
} from '@shared/schema'

export function Create() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { verifiedPhone, requestOtp, confirmOtp, refresh, busy } = useAuth()
  const { call } = useData()
  const toast = useToast()

  const [groupName, setGroupName] = useState('')
  const [contribution, setContribution] = useState('50000')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // A member must have a verified phone before they can create a group.
  const [phone, setPhone] = useState(() => rwandanNationalNumber(verifiedPhone ?? ''))
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [verified, setVerified] = useState(Boolean(verifiedPhone))
  const needsVerification = !verified

  const phoneValid = isValidRwandanPhone(phone)
  const amount = Number(contribution.replace(/[^\d]/g, '')) || 0

  const pinsMatch = pin.length === PIN_LENGTH && pin === confirmPin

  const sendCode = async () => {
    setError(null)
    if (!phoneValid) {
      setError(t('auth.phoneInvalid'))
      return
    }
    try {
      await requestOtp(normalizePhone(phone))
      setCodeSent(true)
    } catch (cause) {
      setError(translateError(t, cause))
    }
  }

  const verifyCode = async () => {
    setError(null)
    try {
      await confirmOtp(code.trim())
      setVerified(true)
    } catch (cause) {
      setError(translateError(t, cause))
    }
  }

  const submit = async () => {
    setError(null)
    if (!groupName.trim()) {
      setError(t('auth.groupName'))
      return
    }
    if (amount <= 0) {
      setError(t('deposit.amountLabel'))
      return
    }
    if (!name.trim()) {
      setError(t('auth.name'))
      return
    }
    if (!pinsMatch) {
      setError(t('auth.pinInvalid'))
      return
    }

    setSubmitting(true)
    try {
      const result = await call('createGroup', {
        groupName: groupName.trim(),
        contributionAmount: amount,
        name: name.trim(),
        phone: normalizePhone(phone),
        pin,
        preferredLanguage: currentLanguage(),
      })
      if (!result.ok) {
        setError(t(result.errorKey ?? 'errors.generic'))
        return
      }
      await refresh()
      toast.success(t('auth.welcomePresident', { group: groupName.trim() }), result.inviteCode)
      navigate('/', { replace: true })
    } catch (cause) {
      setError(translateError(t, cause))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <WelcomeLayout
      title={t('auth.createGroup')}
      subtitle={t('auth.groupNameHint')}
      wide
    >
      <div className="flex flex-col gap-5">
        {needsVerification ? (
          <div className="animate-rise rounded-card border border-pending/25 bg-pending-bg p-4">
            <p className="text-[13px] font-700 text-pending">{t('auth.verifyFirst')}</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field id="create-phone" className="flex-1 gap-1.5">
                <FieldLabel className="text-[13px] font-700">{t('auth.phone')}</FieldLabel>
                <PhoneNumberField
                  value={phone}
                  onValueChange={setPhone}
                  disabled={codeSent}
                  aria-label={t('auth.phone')}
                />
              </Field>
              <Button
                variant="outline"
                className="h-11"
                disabled={busy}
                onClick={() => void sendCode()}
              >
                {busy ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                ) : (
                  <SendIcon className="size-4" aria-hidden="true" />
                )}
                {t('auth.sendCode')}
              </Button>
            </div>
            {codeSent ? (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                <Field className="flex-1 gap-1.5">
                  <FieldLabel className="text-[13px] font-700">{t('auth.otp')}</FieldLabel>
                  <Input
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    placeholder="000000"
                    inputMode="numeric"
                    className="tracking-[0.4em]"
                  />
                </Field>
                <Button disabled={busy} onClick={() => void verifyCode()}>
                  {busy ? (
                    <span className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                  ) : (
                    <ShieldCheckIcon className="size-4" aria-hidden="true" />
                  )}
                  {t('auth.verify')}
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl bg-success-bg px-4 py-3">
            <CheckIcon className="size-4 shrink-0 text-success" aria-hidden="true" />
            <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-[13px] font-700 text-success">
              <span>{t('auth.otpVerified')} ·</span>
              <PhoneNumber phone={normalizePhone(phone)} withFlag />
            </span>
          </div>
        )}

        <Field className="gap-1.5">
          <FieldLabel className="text-[13px] font-700">{t('auth.groupName')}</FieldLabel>
          <Input
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder={t('auth.groupNamePlaceholder')}
          />
          <FieldDescription className="text-[12px]">{t('auth.groupNameHint')}</FieldDescription>
        </Field>

        <Field className="gap-1.5">
          <FieldLabel className="text-[13px] font-700">{t('auth.contribution')}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              value={contribution}
              onChange={(event) => setContribution(event.target.value.replace(/[^\d]/g, ''))}
              inputMode="numeric"
              className="amount font-800"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupText className="font-700">{t('common.rwsign')}</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
          <FieldDescription className="text-[12px]">
            {t('auth.contributionHint')} · {formatAmount(amount, currentLanguage())}{' '}
            {t('common.rwsign')}
          </FieldDescription>
        </Field>

        <Field className="gap-1.5">
          <FieldLabel className="text-[13px] font-700">{t('auth.name')}</FieldLabel>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('auth.namePlaceholder')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="gap-1.5">
            <FieldLabel className="text-[13px] font-700">{t('auth.newMemberPin')}</FieldLabel>
            <InputOTP maxLength={PIN_LENGTH} value={pin} onChange={setPin}>
              <InputOTPGroup>
                {Array.from({ length: PIN_LENGTH }, (_, index) => (
                  <InputOTPSlot key={index} index={index} />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <FieldDescription className="text-[12px]">{t('auth.pinHint')}</FieldDescription>
          </Field>
          <Field className="gap-1.5">
            <FieldLabel className="text-[13px] font-700">{t('common.confirm')}</FieldLabel>
            <InputOTP
              maxLength={PIN_LENGTH}
              value={confirmPin}
              onChange={setConfirmPin}
              aria-invalid={confirmPin.length === PIN_LENGTH && !pinsMatch ? true : undefined}
            >
              <InputOTPGroup>
                {Array.from({ length: PIN_LENGTH }, (_, index) => (
                  <InputOTPSlot key={index} index={index} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </Field>
        </div>

        {error ? (
          <p className="flex items-start gap-2 rounded-2xl bg-danger-bg px-4 py-3 text-[13px] font-700 text-danger">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] font-500 text-muted">
            {t('auth.maxMembers', { count: MEMBER_CAP })}
          </span>
          <Button
            size="lg"
            className="bg-gold text-ink hover:bg-gold-deep hover:text-white"
            disabled={submitting || needsVerification}
            onClick={() => void submit()}
          >
            {submitting ? (
              <span className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
            ) : (
              <PlusIcon className="size-[18px]" aria-hidden="true" />
            )}
            {t('auth.createGroup')}
          </Button>
        </div>
      </div>
    </WelcomeLayout>
  )
}
