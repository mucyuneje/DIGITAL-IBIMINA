'use client'

import { useMemo, useState } from 'react'
import { Navigate } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PinGateModal } from '@/components/pin-gate'
import { BackButton } from '@/components/back-button'
import { LivePill } from '@/components/live-pill'
import { PageHeading } from '@/components/page-heading'
import { CalendarIcon, CheckIcon } from '@/components/icons'
import { FileTextIcon, PlusIcon, XIcon } from 'lucide-react'
import { translateError } from '@/lib/errors'
import type { AnnouncementPayload } from '@/services/types'

type MinutesContent = Omit<AnnouncementPayload, 'groupId' | 'memberId' | 'pin'>

export function DeskMinutes() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { call } = useData()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10))
  const [agenda, setAgenda] = useState<string[]>([])
  const [resolutions, setResolutions] = useState<string[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [pinOpen, setPinOpen] = useState(false)

  const payload = useMemo<MinutesContent | null>(
    () =>
      title.trim()
        ? {
            type: 'minutes',
            tag: 'normal',
            title: title.trim(),
            body: '',
            minutes: {
              meetingDate: new Date(meetingDate).getTime(),
              agenda,
              resolutions,
              nextActions: actions,
            },
          }
        : null,
    [title, meetingDate, agenda, resolutions, actions],
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
        setAgenda([])
        setResolutions([])
        setActions([])
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
        icon={CalendarIcon}
        title={t('deskExtra.toolMinutes')}
        description={t('deskExtra.minutesSub')}
        meta={<LivePill labelKey="home.live" />}
      />

      <Card>
        <div>
          <h2 className="flex items-center gap-2 text-[17px] font-800 text-ink">
            <FileTextIcon className="size-[18px] text-green" aria-hidden="true" />
            {t('desk.minutesTitle')}
          </h2>
          <p className="mt-0.5 text-[13px] font-500 text-muted">{t('bulletin.appendOnly')}</p>
        </div>
        <div className="flex flex-col gap-4">
          <Field className="gap-1.5">
            <FieldLabel className="text-[13px] font-700">
              {t('desk.announceTitleField')}
            </FieldLabel>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <Field className="gap-1.5">
            <FieldLabel className="text-[13px] font-700">{t('bulletin.meetingDate')}</FieldLabel>
            <Input
              type="date"
              value={meetingDate}
              onChange={(event) => setMeetingDate(event.target.value)}
            />
          </Field>
          <ListEditor label={t('bulletin.agenda')} values={agenda} onChange={setAgenda} />
          <ListEditor
            label={t('bulletin.resolutions')}
            values={resolutions}
            onChange={setResolutions}
          />
          <ListEditor
            label={t('bulletin.nextActions')}
            values={actions}
            onChange={setActions}
          />
          <div className="flex justify-end">
            <Button
              className="bg-gold text-ink hover:bg-gold-deep hover:text-white disabled:bg-green/40 disabled:text-white/70 disabled:opacity-100"
              disabled={!payload}
              onClick={() => setPinOpen(true)}
            >
              <CheckIcon className="size-[18px]" aria-hidden="true" />
              {t('desk.minutesSubmit')}
            </Button>
          </div>
        </div>
      </Card>

      <PinGateModal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        title={t('desk.minutesSubmit')}
        submitLabel={t('desk.minutesSubmit')}
        onSubmit={submit}
      />
    </div>
  )
}

function ListEditor({
  label,
  values,
  onChange,
}: {
  label: string
  values: string[]
  onChange: (next: string[]) => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')

  const add = () => {
    const value = draft.trim()
    if (!value) return
    onChange([...values, value])
    setDraft('')
  }

  return (
    <Field className="gap-1.5">
      <FieldLabel className="text-[13px] font-700">{label}</FieldLabel>
      <div className="flex flex-col gap-2">
        {values.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-line p-3">
            {values.map((value, index) => (
              <div key={`${value}-${index}`} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 text-[13px] font-500 text-ink">{value}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('desk.removeItem')}
                  className="shrink-0"
                  onClick={() => onChange(values.filter((_, i) => i !== index))}
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="flex-1"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                add()
              }
            }}
          />
          <Button variant="outline" size="sm" onClick={add} disabled={!draft.trim()}>
            <PlusIcon className="size-4" />
            {t('desk.addItem')}
          </Button>
        </div>
      </div>
    </Field>
  )
}
