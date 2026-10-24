'use client'

import { useMemo, useState } from 'react'
import { Navigate } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { PinGateModal } from '@/components/pin-gate'
import { BackButton } from '@/components/back-button'
import { LivePill } from '@/components/live-pill'
import { PageHeading } from '@/components/page-heading'
import { BulletinIcon } from '@/components/icons'
import {
  CalendarDaysIcon,
  InfoIcon,
  MegaphoneIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { translateError } from '@/lib/errors'
import type { AnnouncementPayload } from '@/services/types'
import type { BulletinTag } from '@shared/schema'

type AnnouncementContent = Omit<AnnouncementPayload, 'groupId' | 'memberId' | 'pin'>

const TAG_ITEM_CLASS: Record<BulletinTag, string> = {
  urgent: 'data-pressed:bg-danger-bg data-pressed:text-danger',
  normal: 'data-pressed:bg-ink/[0.06] data-pressed:text-ink',
  event: 'data-pressed:bg-gold-soft data-pressed:text-pending',
}

export function DeskAnnounce() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { call } = useData()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tag, setTag] = useState<BulletinTag>('normal')
  const [pinOpen, setPinOpen] = useState(false)

  const titleValid = title.trim().length >= 3
  const bodyValid = body.trim().length >= 10
  const valid = titleValid && bodyValid

  const payload = useMemo<AnnouncementContent | null>(
    () =>
      titleValid && bodyValid
        ? { type: 'announcement', tag, title: title.trim(), body: body.trim() }
        : null,
    [title, body, tag, titleValid, bodyValid],
  )

  if (session && session.role === 'member') return <Navigate to="/403" replace />

  const submit = async (pin: string) => {
    if (!session || !payload) return { ok: false, errorKey: 'errors.generic' }
    try {
      const result = await call('postAnnouncement', {
        groupId: session.groupId,
        memberId: session.memberId,
        pin,
        ...payload,
      })
      if (result.ok) {
        toast.success(t('common.done'))
        setTitle('')
        setBody('')
        setPinOpen(false)
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
        icon={BulletinIcon}
        title={t('deskExtra.toolAnnounce')}
        description={t('deskExtra.announceSub')}
        meta={<LivePill labelKey="home.live" />}
      />

      <Card>
        <div>
          <h2 className="flex items-center gap-2 text-[17px] font-800 text-ink">
            <MegaphoneIcon className="size-[18px] text-green" aria-hidden="true" />
            {t('desk.announceTitle')}
          </h2>
          <p className="mt-0.5 text-[13px] font-500 text-muted">{t('desk.pinGateNote')}</p>
        </div>
        <div className="flex flex-col gap-4">
          <Field className="gap-1.5">
            <FieldLabel className="text-[13px] font-700">{t('desk.announceTag')}</FieldLabel>
            <ToggleGroup
              variant="outline"
              value={[tag]}
              onValueChange={(next) => {
                const value = next[0]
                if (value) setTag(value as BulletinTag)
              }}
            >
              <ToggleGroupItem value="urgent" className={TAG_ITEM_CLASS.urgent}>
                <TriangleAlertIcon className="size-3.5" aria-hidden="true" />
                {t('bulletin.tags.urgent')}
              </ToggleGroupItem>
              <ToggleGroupItem value="normal" className={TAG_ITEM_CLASS.normal}>
                <InfoIcon className="size-3.5" aria-hidden="true" />
                {t('bulletin.tags.normal')}
              </ToggleGroupItem>
              <ToggleGroupItem value="event" className={TAG_ITEM_CLASS.event}>
                <CalendarDaysIcon className="size-3.5" aria-hidden="true" />
                {t('bulletin.tags.event')}
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>
          <Field className="gap-1.5">
            <FieldLabel className="text-[13px] font-700">
              {t('desk.announceTitleField')}
            </FieldLabel>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            {title.length > 0 && !titleValid ? (
              <FieldError>{t('desk.announceTitleRequired')}</FieldError>
            ) : null}
          </Field>
          <Field className="gap-1.5">
            <FieldLabel className="text-[13px] font-700">{t('desk.announceBody')}</FieldLabel>
            <Textarea value={body} onChange={(event) => setBody(event.target.value)} />
            {body.length > 0 && !bodyValid ? (
              <FieldError>{t('desk.announceBodyRequired')}</FieldError>
            ) : null}
          </Field>
          <div className="flex justify-end">
            <Button
              className="bg-gold text-ink hover:bg-gold-deep hover:text-white disabled:bg-green/40 disabled:text-white/70 disabled:opacity-100"
              disabled={!valid}
              onClick={() => {
                if (!payload) return
                setPinOpen(true)
              }}
            >
              <BulletinIcon className="size-[18px]" />
              {t('desk.announceSubmit')}
            </Button>
          </div>
        </div>
      </Card>

      <PinGateModal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        title={t('desk.announceSubmit')}
        submitLabel={t('desk.announceSubmit')}
        onSubmit={submit}
      />
    </div>
  )
}
