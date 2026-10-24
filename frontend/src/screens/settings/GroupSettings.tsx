'use client'

import { useState } from 'react'
import { Navigate } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'
import { CheckIcon, CopyIcon, SaveIcon, UsersRoundIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { PinGateModal, type PinGateResult } from '@/components/pin-gate'
import { SettingsPageHeader } from '@/components/settings-page-header'
import { currentLanguage } from '@/i18n'
import { translateError } from '@/lib/errors'
import { formatCurrency } from '@shared/money'

export function SettingsGroup() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { group, call } = useData()
  const toast = useToast()
  const language = currentLanguage()
  const [draft, setDraft] = useState<{ name: string; contribution: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // The group document arrives after the first paint in demo/Firebase mode.
  // Deriving from it keeps the form filled without an effect that overwrites
  // whatever the member is already typing.
  const name = draft?.name ?? group?.name ?? ''
  const contribution =
    draft?.contribution ?? (group ? String(group.contributionAmount ?? '') : '')
  const setName = (next: string) => setDraft({ name: next, contribution })
  const setContribution = (next: string) => setDraft({ name, contribution: next })

  const amount = Number(contribution.replace(/[^\d]/g, ''))
  const changed =
    group != null &&
    (name.trim() !== group.name || Math.round(amount) !== group.contributionAmount)
  const valid =
    name.trim().length > 0 &&
    Number.isFinite(amount) &&
    amount > 0 &&
    changed

  const openPin = () => {
    if (!session || !group || !valid) return
    setPinOpen(true)
  }

  const save = async (pin: string): Promise<PinGateResult> => {
    if (!session || !group || !valid) return { ok: false }
    setBusy(true)
    try {
      const res = await call('updateGroup', {
        groupId: group.id,
        actorId: session.memberId,
        name: name.trim(),
        monthlyContribution: Math.round(amount),
        pin,
      })
      if (res.ok) {
        toast.success(t('group.updated'))
        setPinOpen(false)
      } else {
        toast.error(t('errors.generic'), res.errorKey ? t(res.errorKey) : undefined)
      }
      return { ok: res.ok, errorKey: res.errorKey }
    } catch (cause) {
      toast.error(translateError(t, cause))
      return { ok: false, errorKey: 'errors.generic' }
    } finally {
      setBusy(false)
    }
  }

  const copyInvite = async () => {
    if (!group) return
    try {
      await navigator.clipboard.writeText(group.inviteCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
      toast.success(t('group.copied'))
    } catch (cause) {
      toast.error(translateError(t, cause))
    }
  }

  if (session?.role === 'member') {
    return <Navigate to="/403" replace />
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <SettingsPageHeader
        icon={UsersRoundIcon}
        title={t('group.title')}
        subtitle={t('settingsIndex.groupHint')}
      />

      <Card className="w-full">
        <CardContent className="flex flex-col gap-4">
          <Field className="gap-1.5">
            <FieldLabel className="text-[13px] font-700">{t('group.name')}</FieldLabel>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field className="gap-1.5">
            <FieldLabel className="text-[13px] font-700">{t('group.contribution')}</FieldLabel>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <InputGroupText className="font-700">{t('common.rwsign')}</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                value={contribution}
                onChange={(event) => setContribution(event.target.value.replace(/[^\d]/g, ''))}
                inputMode="numeric"
              />
            </InputGroup>
          </Field>
        </CardContent>
        <CardFooter className="justify-end">
          <Button disabled={busy || !group || !valid} onClick={openPin}>
            {busy ? <Spinner className="size-4" /> : <SaveIcon />}
            {t('group.save')}
          </Button>
        </CardFooter>
      </Card>

      <PinGateModal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        title={t('group.pinTitle')}
        note={t('group.pinNote')}
        submitLabel={t('group.save')}
        onSubmit={save}
      >
        <div className="rounded-2xl bg-bg p-4">
          <p className="text-[13px] font-700 text-muted">{t('group.name')}</p>
          <p className="mt-1 text-[15px] font-800 text-ink">{name.trim()}</p>
          <p className="mt-3 text-[13px] font-700 text-muted">
            {t('group.contribution')}
          </p>
          <p className="amount mt-1 text-[17px] font-800 text-gold-deep">
            {formatCurrency(Math.round(amount), language)}
          </p>
        </div>
      </PinGateModal>

      <Card>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[17px] font-800 text-ink">{t('group.inviteCode')}</h2>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-bg px-4 py-3">
          <p className="font-mono text-[18px] font-800 tracking-[0.28em] text-ink">
            {group?.inviteCode ?? '—'}
          </p>
          <Button variant="outline" size="sm" onClick={() => void copyInvite()}>
            {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
            {copied ? t('common.copied') : t('common.copy')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
