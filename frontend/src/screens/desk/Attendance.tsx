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
import { Switch } from '@/components/ui/switch'
import { PinGateModal } from '@/components/pin-gate'
import { BackButton } from '@/components/back-button'
import { LivePill } from '@/components/live-pill'
import { PageHeading } from '@/components/page-heading'
import { MemberAvatar } from '@/components/member-avatar'
import { UsersIcon } from '@/components/icons'
import { CheckCheckIcon } from 'lucide-react'
import { translateError } from '@/lib/errors'
import type { AnnouncementPayload } from '@/services/types'

type AttendanceContent = Omit<AnnouncementPayload, 'groupId' | 'memberId' | 'pin'>

export function DeskAttendance() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { members, call } = useData()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10))
  const [present, setPresent] = useState<Record<string, boolean>>({})
  const [pinOpen, setPinOpen] = useState(false)

  const toggle = (memberId: string) =>
    setPresent((prev) => ({ ...prev, [memberId]: !prev[memberId] }))

  const markAllPresent = () =>
    setPresent(Object.fromEntries(members.map((member) => [member.id, true])))

  const presentCount = members.filter((member) => present[member.id]).length

  const payload = useMemo<AttendanceContent | null>(
    () =>
      title.trim()
        ? {
            type: 'attendance',
            tag: 'normal',
            title: title.trim(),
            body: t('bulletin.attendanceSummary', { present: presentCount, total: members.length }),
            attendance: {
              meetingDate: new Date(meetingDate).getTime(),
              presentCount,
              entries: members.map((member) => ({
                memberId: member.id,
                name: member.name,
                present: Boolean(present[member.id]),
              })),
            },
          }
        : null,
    [title, meetingDate, members, present, presentCount, t],
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
        setPresent({})
        setPinOpen(false)
        return { ok: true }
      }
      return { ok: false, errorKey: result.errorKey }
    } catch (cause) {
      return { ok: false, errorKey: translateError(t, cause) }
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <BackButton to="/desk" className="self-start lg:hidden" />

      <PageHeading
        icon={UsersIcon}
        title={t('deskExtra.toolAttendance')}
        description={t('deskExtra.attendanceSub')}
        meta={<LivePill labelKey="home.live" />}
      />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-[17px] font-800 text-ink">
              <UsersIcon className="size-[18px] text-green" aria-hidden="true" />
              {t('desk.attendanceTitle')}
            </h2>
            <p className="mt-0.5 text-[13px] font-500 text-muted">
              {t('bulletin.attendanceSummary', {
                present: presentCount,
                total: members.length,
              })}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={markAllPresent}>
            <CheckCheckIcon className="size-4" aria-hidden="true" />
            {t('desk.markAllPresent')}
          </Button>
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
          <div className="flex flex-col">
            {members.map((member) => {
              const isPresent = Boolean(present[member.id])
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <MemberAvatar name={member.name} />
                    <span className="truncate text-[14px] font-700 text-ink">{member.name}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <span
                      className={`text-[12px] font-700 ${
                        isPresent ? 'text-success' : 'text-danger'
                      }`}
                    >
                      {isPresent ? t('desk.present') : t('desk.absent')}
                    </span>
                    <Switch checked={isPresent} onCheckedChange={() => toggle(member.id)} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      <div className="sticky bottom-20 z-10 rounded-card border border-line bg-card p-3 shadow-xs lg:bottom-4">
        <Button
          className="w-full bg-gold text-ink hover:bg-gold-deep hover:text-white disabled:bg-green/40 disabled:text-white/70 disabled:opacity-100"
          disabled={!payload}
          onClick={() => setPinOpen(true)}
        >
          <UsersIcon className="size-[18px]" />
          {t('desk.attendanceSubmit')}
        </Button>
      </div>

      <PinGateModal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        title={t('desk.attendanceSubmit')}
        submitLabel={t('desk.attendanceSubmit')}
        onSubmit={submit}
      />
    </div>
  )
}
