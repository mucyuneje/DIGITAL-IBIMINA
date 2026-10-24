'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2Icon } from 'lucide-react'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PinGateModal, type PinGateResult } from '@/components/pin-gate'
import { CloseIcon } from '@/components/icons'
import { SettingsPageHeader } from '@/components/settings-page-header'
import { errorKeyFrom, translateError } from '@/lib/errors'

const CONFIRM_PHRASE = 'DELETE'

export function SettingsDelete() {
  const { t } = useTranslation()
  const { session, signOut } = useAuth()
  const { call } = useData()
  const toast = useToast()
  const [step, setStep] = useState<1 | 2>(1)
  const [phrase, setPhrase] = useState('')
  const [gateOpen, setGateOpen] = useState(false)

  const phraseOk = phrase.trim() === CONFIRM_PHRASE

  const deleteAccount = async (): Promise<PinGateResult> => {
    if (!session) return { ok: false, errorKey: 'errors.sessionExpired' }
    try {
      const res = await call('deleteAccount', { memberId: session.memberId })
      if (res.ok) {
        toast.success(t('deleteAccount.done'))
        void signOut()
        return { ok: true }
      }
      if (res.errorKey === 'member.lastPresident' || res.errorKey === 'delete.onlyPresident') {
        toast.error(t(res.errorKey))
      } else {
        toast.error(t('errors.generic'), res.errorKey ? t(res.errorKey) : undefined)
      }
      return { ok: false, errorKey: res.errorKey }
    } catch (cause) {
      toast.error(translateError(t, cause))
      return { ok: false, errorKey: errorKeyFrom(cause) }
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <SettingsPageHeader
        icon={Trash2Icon}
        tone="danger"
        title={t('deleteAccount.title')}
        subtitle={t('settingsIndex.deleteHint')}
      />

      <Card>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[17px] font-800 text-ink">{t('deleteAccount.title')}</h2>
          </div>
          <div className="shrink-0">
            <span className="text-[12px] font-700 uppercase tracking-wide text-muted">
              {t('deleteAccount.step', { step })}
            </span>
          </div>
        </div>
        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <p className="text-[13px] font-500 leading-relaxed text-muted">
              {t('deleteAccount.body')}
            </p>
            <div className="flex justify-end">
              <Button variant="destructive" onClick={() => setStep(2)}>
                {t('common.continue')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-[13px] font-500 leading-relaxed text-muted">
              {t('deleteAccount.body')}
            </p>
            <Field className="gap-1.5">
              <FieldLabel className="text-[13px] font-700">
                {t('deleteAccount.phrase')}
              </FieldLabel>
              <Input
                value={phrase}
                onChange={(event) => setPhrase(event.target.value)}
                placeholder={t('deleteAccount.phrasePlaceholder')}
                autoComplete="off"
              />
              <FieldDescription className="text-[12px]">
                {t('deleteAccount.phraseHint')}
              </FieldDescription>
            </Field>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setStep(1)}>
                {t('common.back')}
              </Button>
              <Button
                variant="destructive"
                disabled={!phraseOk}
                onClick={() => setGateOpen(true)}
              >
                <CloseIcon />
                {t('deleteAccount.confirm')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <PinGateModal
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        title={t('deleteAccount.title')}
        note={t('deleteAccount.body')}
        submitLabel={t('deleteAccount.confirm')}
        onSubmit={deleteAccount}
      />
    </div>
  )
}
