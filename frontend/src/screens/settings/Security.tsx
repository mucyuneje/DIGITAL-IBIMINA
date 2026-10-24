'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FingerprintIcon, ShieldCheckIcon, SmartphoneIcon } from 'lucide-react'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PinGateModal, type PinGateResult } from '@/components/pin-gate'
import { LockIcon } from '@/components/icons'
import { SettingsPageHeader } from '@/components/settings-page-header'
import { errorKeyFrom } from '@/lib/errors'
import { PIN_LENGTH, PIN_RE } from '@shared/schema'

export function SettingsSecurity() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { call } = useData()
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [gateOpen, setGateOpen] = useState(false)

  const openGate = () => {
    if (current.length > 0 && current.length !== PIN_LENGTH) {
      setError(t('security.pin.length'))
      return
    }
    setError(null)
    setGateOpen(true)
  }

  const changePin = async (pin: string): Promise<PinGateResult> => {
    if (newPin.length !== PIN_LENGTH || !PIN_RE.test(newPin)) {
      return { ok: false, errorKey: 'security.pin.length' }
    }
    if (newPin !== confirmPin) {
      return { ok: false, errorKey: 'securitySettings.mismatch' }
    }
    if (!session) return { ok: false, errorKey: 'errors.sessionExpired' }
    try {
      const res = await call('changePin', {
        memberId: session.memberId,
        currentPin: pin,
        newPin,
      })
      if (res.ok) {
        toast.success(t('securitySettings.changed'))
        setNewPin('')
        setConfirmPin('')
        setCurrent('')
        return { ok: true }
      }
      return { ok: false, errorKey: res.errorKey }
    } catch (cause) {
      return { ok: false, errorKey: errorKeyFrom(cause) }
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <SettingsPageHeader
        icon={ShieldCheckIcon}
        title={t('securitySettings.title')}
        subtitle={t('settingsIndex.securityHint')}
      />

      <Card>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success-bg text-success">
              <FingerprintIcon className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[15px] font-800 text-ink">
                {t('securitySettings.changePin')}
              </h2>
              <p className="mt-0.5 text-[12px] font-500 text-muted">
                {t('securitySettings.pinNote')}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Field className="gap-1.5">
            <FieldLabel htmlFor="security-current-pin" className="text-[13px] font-700">
              {t('securitySettings.current')}
            </FieldLabel>
            <Input
              id="security-current-pin"
              type="password"
              inputMode="numeric"
              value={current}
              onChange={(event) => {
                setCurrent(event.target.value)
                if (error) setError(null)
              }}
              aria-invalid={error !== null || undefined}
            />
            <FieldError>{error}</FieldError>
          </Field>
          <div className="flex justify-end">
            <Button onClick={openGate}>
              <LockIcon />
              {t('securitySettings.changePin')}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-start gap-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-bg text-green">
            <SmartphoneIcon className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-800 text-ink">{t('securitySettings.sessions')}</h2>
            <p className="mt-0.5 text-[12px] font-500 text-muted">
              {t('securitySettings.sessionNote')}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl bg-bg px-3.5 py-3">
          <span className="flex items-center gap-2 text-[13px] font-600 text-muted">
            <SmartphoneIcon className="size-4 text-green" />
            {t('securitySettings.device')}
          </span>
          <span className="inline-flex items-center gap-1.5 truncate text-[13px] font-800 text-ink">
            <span className="size-1.5 rounded-full bg-success" />
            {t('securitySettings.thisDevice')}
          </span>
        </div>
      </Card>

      <PinGateModal
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        title={t('securitySettings.changePin')}
        submitLabel={t('securitySettings.changePin')}
        onSubmit={changePin}
      >
        <div className="flex flex-col gap-4">
          <Field className="gap-1.5">
            <FieldLabel className="text-[13px] font-700">{t('securitySettings.new')}</FieldLabel>
            <Input
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(event) => setNewPin(event.target.value)}
            />
          </Field>
          <Field className="gap-1.5">
            <FieldLabel className="text-[13px] font-700">
              {t('securitySettings.confirm')}
            </FieldLabel>
            <Input
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value)}
            />
          </Field>
        </div>
      </PinGateModal>
    </div>
  )
}
