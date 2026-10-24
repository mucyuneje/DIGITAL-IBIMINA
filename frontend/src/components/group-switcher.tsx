'use client'

import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2Icon, CheckIcon, ChevronDownIcon } from 'lucide-react'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * Switches between the groups the signed-in phone belongs to (R59).
 *
 * The members collection is flat: one phone owns one member document per
 * group. The active membership decides which group the whole app reads, so
 * switching re-binds every listener in the data layer.
 *
 * With a single group there is nothing to switch to — the component renders
 * its `fallback` instead (the plain group name), so the header never loses
 * the name of the group it is showing.
 */
export function GroupSwitcher({
  tone = 'light',
  className = '',
  labelClassName = '',
  fallback = null,
}: {
  tone?: 'light' | 'dark'
  className?: string
  labelClassName?: string
  fallback?: ReactNode
}) {
  const { t } = useTranslation()
  const { memberships, activeMemberId, switchGroup } = useAuth()
  const { group } = useData()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  if (memberships.length < 2) return <>{fallback}</>

  const active =
    memberships.find((membership) => membership.memberId === activeMemberId) ??
    memberships[0]
  const activeName = group?.name ?? active.groupName ?? t('states.noGroup')
  const dark = tone === 'dark'

  const choose = async (groupId: string) => {
    if (busy || groupId === active.groupId) return
    setBusy(true)
    try {
      await switchGroup(groupId)
      const next = memberships.find((membership) => membership.groupId === groupId)
      toast.success(t('groupSwitcher.switched', { group: next?.groupName ?? '' }))
    } catch {
      toast.error(t('groupSwitcher.failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={t('groupSwitcher.label')}
            className={[
              'flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-left transition-colors',
              dark ? 'text-white hover:bg-white/10' : 'text-ink hover:bg-ink/[0.04]',
              className,
            ].join(' ')}
          />
        }
      >
        <Building2Icon
          className={dark ? 'size-4 shrink-0 text-gold' : 'size-4 shrink-0 text-green'}
        />
        <span
          className={[
            'min-w-0 flex-1 truncate',
            labelClassName || 'text-[13px] font-700',
          ].join(' ')}
        >
          {activeName}
        </span>
        <ChevronDownIcon className="size-3.5 shrink-0 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('groupSwitcher.label')}</DropdownMenuLabel>
          {memberships.map((membership) => {
            const isActive = membership.memberId === activeMemberId
            return (
              <DropdownMenuItem
                key={membership.memberId}
                onClick={() => void choose(membership.groupId)}
                className="justify-between gap-3"
              >
                <span className="min-w-0 flex-1 truncate">
                  {membership.groupName ?? membership.groupId}
                </span>
                {isActive ? <CheckIcon className="size-4 shrink-0 text-green" /> : null}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
