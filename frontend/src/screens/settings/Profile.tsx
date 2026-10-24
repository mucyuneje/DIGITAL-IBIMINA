'use client'

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'
import { SaveIcon, ShieldCheckIcon, UserRoundIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { MemberAvatar } from '@/components/member-avatar'
import { PhoneNumber, PhoneNumberField } from '@/components/phone-field'
import { PinGateModal, type PinGateResult } from '@/components/pin-gate'
import { SettingsPageHeader } from '@/components/settings-page-header'
import { DEMO_OTP, dataMode } from '@/config'
import { translateError } from '@/lib/errors'
import {
  formatRwandanPhone,
  isValidRwandanPhone,
  normalizePhone,
  rwandanNationalNumber,
} from '@shared/schema'

export function SettingsProfile() {
  const { t } = useTranslation()
  const { session, refresh } = useAuth()
  const { call } = useData()
  const toast = useToast()
  const [name, setName] = useState(session?.name ?? '')
  const [phone, setPhone] = useState(() => rwandanNationalNumber(session?.phone ?? ''))
  const [touched, setTouched] = useState({ name: false, phone: false })
  const [busy, setBusy] = useState(false)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)

  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone])
  const phoneChanged = useMemo(
    () => normalizedPhone !== normalizePhone(session?.phone ?? ''),
    [normalizedPhone, session?.phone],
  )
  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    const trimmedName = name.trim()
    if (trimmedName.length < 2) {
      e.name = t('errors.nameRequired')
    }
    if (!isValidRwandanPhone(normalizedPhone)) {
      e.phone = t('errors.phoneInvalid')
    }
    return e
  }, [name, normalizedPhone, t])

  const isValid = Object.keys(errors).length === 0
  const showNameError = touched.name && errors.name
  const showPhoneError = touched.phone && errors.phone

  const persist = async (pin: string): Promise<PinGateResult> => {
    if (!session || !isValid) return { ok: false }
    setBusy(true)
    try {
      const res = await call('updateProfile', {
        memberId: session.memberId,
        name: name.trim(),
        phone: normalizedPhone,
        ...(phoneChanged ? { pin, otp: otp.trim() } : {}),
      })
      if (res.ok) {
        toast.success(t('profile.updated'))
        setOtp('')
        setPinOpen(false)
        await refresh().catch(() => undefined)
        return { ok: true }
      }
      toast.error(
        t('errors.generic'),
        res.errorKey ? t(res.errorKey) : undefined,
      )
      return { ok: false, errorKey: res.errorKey }
    } catch (cause) {
      toast.error(translateError(t, cause))
      return { ok: false, errorKey: 'errors.generic' }
    } finally {
      setBusy(false)
    }
  }

  const requestSave = () => {
    if (!session || !isValid) return
    if (!phoneChanged) {
      void persist('')
      return
    }
    setOtp('')
    setOtpError(null)
    setVerifyOpen(true)
  }

  const closeVerify = () => {
    setVerifyOpen(false)
    setOtp('')
    setOtpError(null)
  }

  const verifyOtp = () => {
    const code = otp.trim()
    if (code.length !== 6) {
      setOtpError(t('errors.otpIncorrect'))
      return
    }
    // Demo builds have no SMS provider. Production must verify a server-issued
    // challenge bound to the new number as well as the PIN.
    if (dataMode === 'demo' && code !== DEMO_OTP) {
      setOtpError(t('errors.otpIncorrect'))
      return
    }
    setOtpError(null)
    setVerifyOpen(false)
    setPinOpen(true)
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <SettingsPageHeader
        icon={UserRoundIcon}
        title={t('profile.title')}
        subtitle={t('profile.subtitle')}
      />

      <Card>
        <div className="flex items-center gap-4">
          <MemberAvatar name={session?.name ?? ''} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-[17px] font-800 text-ink">{session?.name}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge className="bg-green text-white">
                {session ? t(`roles.${session.role}`) : ''}
              </Badge>
              <PhoneNumber
                phone={session?.phone}
                withFlag
                className="text-[13px] font-500 text-muted"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="w-full">
        <CardContent className="flex flex-col gap-4">
          <Field id="profile-name" className="gap-1.5">
            <FieldLabel className="text-[13px] font-700">{t('profile.name')}</FieldLabel>
            <Input
              id="profile-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                if (!touched.name) setTouched((prev) => ({ ...prev, name: true }))
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
              autoComplete="name"
              aria-invalid={Boolean(showNameError) || undefined}
              aria-describedby={showNameError ? 'profile-name-error' : undefined}
            />
            {showNameError && <FieldError id="profile-name-error">{errors.name}</FieldError>}
          </Field>
          <Field id="profile-phone" className="gap-1.5">
            <FieldLabel className="text-[13px] font-700">{t('profile.phone')}</FieldLabel>
            <PhoneNumberField
              value={phone}
              onValueChange={(next) => {
                setPhone(next)
                if (!touched.phone) setTouched((prev) => ({ ...prev, phone: true }))
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
              invalid={Boolean(showPhoneError)}
              aria-label={t('profile.phone')}
              aria-describedby={showPhoneError ? 'profile-phone-error' : 'profile-phone-hint'}
            />
            {showPhoneError ? (
              <FieldError id="profile-phone-error">{errors.phone}</FieldError>
            ) : (
              <FieldDescription id="profile-phone-hint" className="text-[12px]">
                {phoneChanged ? t('profile.phoneChangeHint') : t('profile.phoneHint')}
              </FieldDescription>
            )}
          </Field>
        </CardContent>
        <CardFooter className="justify-end">
          <Button disabled={busy || !session || !isValid} onClick={requestSave}>
            {busy ? <Spinner className="size-4" /> : <SaveIcon />}
            {t('profile.save')}
          </Button>
        </CardFooter>
      </Card>

      <Dialog
        open={verifyOpen}
        onOpenChange={(next) => {
          if (!next) closeVerify()
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('auth.otpTitle')}</DialogTitle>
            <DialogDescription>
              {t('auth.otpSentTo', {
                phone: formatRwandanPhone(normalizedPhone),
              })}
            </DialogDescription>
          </DialogHeader>
          <Field className="gap-1.5">
            <FieldLabel className="text-[13px] font-700">{t('auth.otp')}</FieldLabel>
            <Input
              value={otp}
              onChange={(event) => {
                setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                if (otpError) setOtpError(null)
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              aria-invalid={Boolean(otpError) || undefined}
            />
            {dataMode === 'demo' ? (
              <FieldDescription className="text-[12px]">
                {t('auth.demoCode', { code: DEMO_OTP })}
              </FieldDescription>
            ) : null}
            {otpError ? <FieldError>{otpError}</FieldError> : null}
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={closeVerify}>
              {t('common.cancel')}
            </Button>
            <Button onClick={verifyOtp} disabled={otp.trim().length !== 6}>
              <ShieldCheckIcon />
              {t('auth.verify')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PinGateModal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        title={t('profile.phone')}
        note={t('profile.phoneChangeHint')}
        submitLabel={t('profile.save')}
        onSubmit={persist}
      >
        <div className="rounded-2xl bg-bg p-4">
          <p className="text-[13px] font-700 text-muted">{t('profile.phone')}</p>
          <PhoneNumber
            phone={normalizedPhone}
            withFlag
            className="mt-1 text-[15px] font-800 text-ink"
          />
        </div>
      </PinGateModal>
    </div>
  )
}
