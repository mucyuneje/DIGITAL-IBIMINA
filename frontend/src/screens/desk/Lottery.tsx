'use client'

import { useMemo, useState } from 'react'
import { Navigate } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PinGateModal } from '@/components/pin-gate'
import { BackButton } from '@/components/back-button'
import { LivePill } from '@/components/live-pill'
import { PageHeading } from '@/components/page-heading'
import { MemberAvatar } from '@/components/member-avatar'
import { CheckIcon, ShuffleIcon } from '@/components/icons'
import { TrophyIcon } from 'lucide-react'
import { rotationState } from '@/lib/cycle'
import { translateError } from '@/lib/errors'

export function DeskLottery() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { group, members, call, loading } = useData()
  const toast = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const rotation = useMemo(
    () => (group ? rotationState(group, members) : null),
    [group, members],
  )
  const pending = rotation?.pending ?? []

  if (session && session.role === 'member') return <Navigate to="/403" replace />

  const run = async (pin: string) => {
    if (!session) return { ok: false, errorKey: 'errors.generic' }
    try {
      const result = await call('runRotationLottery', {
        groupId: session.groupId,
        memberId: session.memberId,
        pin,
      })
      if (result.ok) {
        toast.success(t('deskExtra.lotteryDone'))
        setRevealed(true)
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
        icon={ShuffleIcon}
        title={t('deskExtra.toolLottery')}
        description={t('deskExtra.lotterySub')}
        meta={<LivePill labelKey="home.live" />}
      />

      <Card>
        <div>
          <h2 className="flex items-center gap-2 text-[17px] font-800 text-ink">
            <ShuffleIcon className="size-[18px] text-green" aria-hidden="true" />
            {t('desk.rotationTitle')}
          </h2>
          <p className="mt-0.5 text-[13px] font-500 text-muted">{t('desk.rotationSub')}</p>
        </div>
        <p className="text-[12px] font-500 text-muted">{t('deskExtra.lotteryPendingNote')}</p>
        <p className="text-[13px] font-700 text-muted">{t('members.positionHint')}</p>
        {loading.members && pending.length === 0 ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-14 rounded-2xl" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShuffleIcon className="size-6" />
              </EmptyMedia>
              <EmptyTitle>{t('rotation.empty')}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <ol className="flex flex-col gap-1">
            {pending.map((entry) => (
              <li
                key={entry.member.id}
                className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-ink/[0.03]"
              >
                <MemberAvatar name={entry.member.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-700">
                    {entry.member.id === session?.memberId
                      ? t('common.you')
                      : entry.member.name}
                  </p>
                  <p className="text-[12px] font-500 text-muted">
                    {t(`roles.${entry.member.role}`)}
                  </p>
                </div>
                <Badge className="bg-gold-soft text-pending">
                  {t('rotation.round', { round: entry.round })}
                </Badge>
              </li>
            ))}
          </ol>
        )}
        <div className="flex justify-end">
          <Button
            className="bg-gold text-ink hover:bg-gold-deep hover:text-white"
            disabled={pending.length === 0}
            onClick={() => setConfirmOpen(true)}
          >
            <ShuffleIcon className="size-[18px]" />
            {t('deskExtra.lotteryRun')}
          </Button>
        </div>
      </Card>

      {revealed ? (
        <Card className="animate-in fade-in-0">
          <div>
            <h2 className="flex items-center gap-2 text-[17px] font-800 text-ink">
              <TrophyIcon className="size-[18px] text-gold-deep" aria-hidden="true" />
              {t('deskExtra.lotteryResult')}
            </h2>
            <p className="mt-0.5 text-[13px] font-500 text-muted">
              {t('deskExtra.lotteryResultNote')}
            </p>
          </div>
          <ol className="flex flex-col gap-1">
            {pending.map((entry, index) => (
              <li
                key={entry.member.id}
                className="animate-in fade-in-0 flex items-center gap-3 rounded-2xl px-2 py-2.5 fill-mode-both"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gold text-[12px] font-800 text-ink">
                  {index + 1}
                </span>
                <MemberAvatar name={entry.member.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-700">
                    {entry.member.id === session?.memberId
                      ? t('common.you')
                      : entry.member.name}
                  </p>
                </div>
                <Badge className="bg-gold-soft text-pending">
                  {t('rotation.round', { round: entry.round })}
                </Badge>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('deskExtra.lotteryConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('deskExtra.lotteryConfirmBody', { count: members.length })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              className="bg-gold text-ink hover:bg-gold-deep hover:text-white"
              onClick={() => {
                setConfirmOpen(false)
                setPinOpen(true)
              }}
            >
              <CheckIcon className="size-[18px]" aria-hidden="true" />
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PinGateModal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        title={t('deskExtra.lotteryRun')}
        note={t('desk.rotationConfirm', { count: members.length })}
        submitLabel={t('deskExtra.lotteryRun')}
        onSubmit={run}
      />
    </div>
  )
}
