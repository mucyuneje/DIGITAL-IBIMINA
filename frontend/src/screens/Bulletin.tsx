'use client'

import { useMemo, useState } from 'react'
import { useNavigate } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ChatPanel } from '@/components/chat/chat-panel'
import { MemberAvatar } from '@/components/member-avatar'
import { LivePill } from '@/components/live-pill'
import { PageHeading, type PageIcon } from '@/components/page-heading'
import {
  BulletinIcon,
  ChatIcon,
  CheckIcon,
  CloseIcon,
  PlusIcon,
  UsersIcon,
} from '@/components/icons'
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  FileTextIcon,
  MegaphoneIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { isOfficer, type AnnouncementDoc, type BulletinType } from '@shared/schema'
import { currentLanguage } from '@/i18n'
import { formatDate, formatRelative } from '@shared/money'

const TONE: Record<string, string> = {
  danger: 'bg-danger-bg text-danger',
  gold: 'bg-gold-soft text-pending',
  neutral: 'bg-ink/[0.06] text-muted',
}

/**
 * P2-4: every bulletin card carries a left border that encodes its type, so
 * the stream can be scanned without reading the badge. Event cards use the
 * pitch-book blue; the brand palette has no blue token, so the stock Tailwind
 * sky colour stands in for it.
 */
const BORDER: Record<string, string> = {
  urgent: 'border-l-danger',
  event: 'border-l-sky-500',
  normal: 'border-l-line',
  minutes: 'border-l-success',
  attendance: 'border-l-success',
}

function typeTone(item: AnnouncementDoc): string | null {
  if (item.type === 'minutes' || item.type === 'attendance') return null
  if (item.tag === 'urgent') return 'danger'
  if (item.tag === 'event') return 'gold'
  return 'neutral'
}

function typeBorder(item: AnnouncementDoc): string {
  if (item.type === 'minutes' || item.type === 'attendance') return BORDER[item.type]
  if (item.tag === 'urgent' || item.tag === 'event') return BORDER[item.tag]
  return BORDER.normal
}

function typeLabel(item: AnnouncementDoc): string {
  if (item.type === 'minutes') return 'bulletinUi.typeMinutes'
  if (item.type === 'attendance') return 'bulletinUi.typeAttendance'
  if (item.tag === 'urgent') return 'bulletinUi.typeUrgent'
  if (item.tag === 'event') return 'bulletinUi.typeEvent'
  return 'bulletinUi.typeNotice'
}

function typeIcon(item: AnnouncementDoc) {
  if (item.type === 'minutes') {
    return <FileTextIcon className="size-3" aria-hidden="true" />
  }
  if (item.type === 'attendance') {
    return <UsersIcon className="size-3" aria-hidden="true" />
  }
  if (item.tag === 'urgent') {
    return <TriangleAlertIcon className="size-3" aria-hidden="true" />
  }
  if (item.tag === 'event') {
    return <CalendarDaysIcon className="size-3" aria-hidden="true" />
  }
  return <MegaphoneIcon className="size-3" aria-hidden="true" />
}

type Filter = 'all' | BulletinType
type Panel = 'feed' | 'chat'

const FILTER_ICON: Record<Filter, PageIcon> = {
  all: BulletinIcon,
  announcement: MegaphoneIcon,
  minutes: FileTextIcon,
  attendance: UsersIcon,
}

export function Bulletin() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { announcements, loading } = useData()
  const [filter, setFilter] = useState<Filter>('all')
  const [panel, setPanel] = useState<Panel>('feed')
  const officer = Boolean(session && isOfficer(session.role))

  const filtered = useMemo(
    () => (filter === 'all' ? announcements : announcements.filter((a) => a.type === filter)),
    [announcements, filter],
  )

  const counts = useMemo(
    () => ({
      all: announcements.length,
      announcement: announcements.filter((a) => a.type === 'announcement').length,
      minutes: announcements.filter((a) => a.type === 'minutes').length,
      attendance: announcements.filter((a) => a.type === 'attendance').length,
    }),
    [announcements],
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        icon={BulletinIcon}
        title={t('bulletin.title')}
        description={t('bulletin.sub')}
        actions={
          <>
            <LivePill labelKey="bulletin.live" />
            {officer ? (
              <Button onClick={() => navigate('/desk')}>
                <PlusIcon className="size-[18px]" />
                {t('bulletin.newAnnouncement')}
              </Button>
            ) : (
              <Badge variant="outline">{t('bulletinUi.readonly')}</Badge>
            )}
          </>
        }
      />

      <div className="lg:hidden">
        <ToggleGroup
          value={[panel]}
          onValueChange={(next) => {
            const value = next[0]
            if (value) setPanel(value as Panel)
          }}
        >
          <ToggleGroupItem value="feed" className="aria-pressed:bg-green aria-pressed:text-white">
            <BulletinIcon className="size-4" />
            {t('bulletin.announcements')}
            <span className="ml-1 text-[11px] font-700 opacity-70">{counts.all}</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="chat" className="aria-pressed:bg-green aria-pressed:text-white">
            <ChatIcon className="size-4" />
            {t('bulletin.chat')}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className={`flex flex-col gap-4 ${panel === 'chat' ? 'hidden lg:flex' : ''}`}>
          <ToggleGroup
            className="w-full flex-wrap"
            value={[filter]}
            onValueChange={(next) => {
              const value = next[0]
              if (value) setFilter(value as Filter)
            }}
          >
            {([
              { value: 'all', label: t('common.all'), count: counts.all },
              { value: 'announcement', label: t('bulletin.announcements'), count: counts.announcement },
              { value: 'minutes', label: t('bulletin.minutes'), count: counts.minutes },
              { value: 'attendance', label: t('bulletin.attendance'), count: counts.attendance },
            ] as const).map((row) => {
              const FilterIcon = FILTER_ICON[row.value]
              return (
                <ToggleGroupItem
                  key={row.value}
                  value={row.value}
                  className="border border-line bg-card px-3 py-1.5 text-[13px] font-700 aria-pressed:border-green aria-pressed:bg-green aria-pressed:text-white"
                >
                  <FilterIcon className="size-3.5" aria-hidden="true" />
                  {row.label}
                  <span className="ml-1 text-[11px] font-700 opacity-70">{row.count}</span>
                </ToggleGroupItem>
              )
            })}
          </ToggleGroup>

          {loading.announcements && announcements.length === 0 ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-40 rounded-card" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BulletinIcon className="size-6" />
                </EmptyMedia>
                <EmptyTitle>{t('bulletin.empty')}</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((item) => (
                <div key={item.id} className="animate-rise">
                  <FeedItem item={item} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`h-full min-h-0 ${panel === 'feed' ? 'hidden lg:block' : ''}`}>
          <ChatPanel />
        </div>
      </div>
    </div>
  )
}

/**
 * The demo join flow writes a fixed English announcement ("<name> joined the
 * group"). demo.ts is read-only, so the copy is re-rendered here in the
 * active language instead of being edited at the source.
 */
const JOIN_TITLE = /^(.+?) joined the group$/
const JOIN_BODY = /^(.+?) is now a member of (.+?)\.$/

function joinAnnouncement(item: AnnouncementDoc, t: (key: string, opts?: Record<string, unknown>) => string) {
  if (item.type !== 'announcement') return null
  const title = item.title.match(JOIN_TITLE)
  if (!title) return null
  const body = item.body ? item.body.match(JOIN_BODY) : null
  const name = title[1]
  return {
    title: t('bulletin.joinedTitle', { name }),
    body: body ? t('bulletin.joinedBody', { name, group: body[2] }) : item.body,
  }
}

function FeedItem({ item }: { item: AnnouncementDoc }) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const [expanded, setExpanded] = useState(false)
  const hasDetails = Boolean(item.body) || Boolean(item.minutes)
  const tone = typeTone(item)
  const joined = joinAnnouncement(item, t)
  const title = joined?.title ?? item.title
  const body = joined?.body ?? item.body

  return (
    <Card className={`border-l-4 ${typeBorder(item)}`}>
      <div className="flex flex-wrap items-center gap-2">
        {tone === null ? (
          <Badge variant="outline">
            {typeIcon(item)}
            {t(typeLabel(item))}
          </Badge>
        ) : (
          <Badge className={TONE[tone]}>
            {typeIcon(item)}
            {t(typeLabel(item))}
          </Badge>
        )}
        <span className="text-[12px] font-500 text-muted">
          {formatRelative(item.createdAt, language)}
        </span>
      </div>

      <h3 className="text-[17px] font-800 text-ink">{title}</h3>
      {body && !expanded ? (
        <p className="line-clamp-2 text-[13px] font-500 leading-relaxed text-muted">{body}</p>
      ) : null}
      {body && expanded ? (
        <p className="text-[13px] font-500 leading-relaxed text-muted">{body}</p>
      ) : null}

      {item.minutes && expanded ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-bg p-4">
          <p className="text-[12px] font-700 uppercase tracking-wide text-muted">
            {t('bulletin.meetingDate')}: {formatDate(item.minutes.meetingDate, language)}
          </p>
          <Block title={t('bulletin.agenda')} items={item.minutes.agenda} />
          <Block title={t('bulletin.resolutions')} items={item.minutes.resolutions} />
          <Block title={t('bulletin.nextActions')} items={item.minutes.nextActions} />
        </div>
      ) : null}

      {item.attendance ? (
        <div className="rounded-2xl bg-bg p-4">
          <div className="flex items-center gap-2">
            <UsersIcon className="size-4 text-muted" />
            <p className="text-[12px] font-700 text-muted">
              {t('bulletin.attendanceSummary', {
                present: item.attendance.presentCount,
                total: item.attendance.entries.length,
              })}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.attendance.entries.map((entry) => (
              <span
                key={entry.memberId}
                className={`inline-flex items-center gap-1.5 rounded-chip px-2 py-1 text-[12px] font-700 ${
                  entry.present ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'
                }`}
              >
                {entry.present ? (
                  <CheckIcon className="size-3.5" />
                ) : (
                  <CloseIcon className="size-3.5" />
                )}
                {entry.name.split(' ')[0]}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {hasDetails ? (
        <Button
          variant="ghost"
          size="sm"
          className="self-start -ml-2.5"
          onClick={() => setExpanded((value) => !value)}
        >
          <ChevronDownIcon
            className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
          {expanded ? t('bulletinUi.collapse') : t('bulletinUi.expand')}
        </Button>
      ) : null}

      <div className="flex items-center gap-2 border-t border-line pt-3">
        <MemberAvatar name={item.authorName} size="sm" />
        <span className="text-[12px] font-500 text-muted">
          {t('bulletin.postedBy', {
            name: item.authorName,
            role: t(`roles.${item.authorRole}`),
          })}
        </span>
      </div>
    </Card>
  )
}

function Block({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="text-[12px] font-700 uppercase tracking-wide text-muted">{title}</p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {items.map((entry, index) => (
          <li key={`${title}-${index}`} className="flex gap-2 text-[13px] font-500 text-ink">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold" />
            {entry}
          </li>
        ))}
      </ul>
    </div>
  )
}


