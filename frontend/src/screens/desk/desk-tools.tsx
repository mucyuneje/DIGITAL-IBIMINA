'use client'

import type { ReactNode } from 'react'
import { HandCoinsIcon } from 'lucide-react'
import { BulletinIcon, CalendarIcon, ShuffleIcon, UsersIcon } from '@/components/icons'

export interface DeskTool {
  to: string
  labelKey: string
  subKey: string
  icon: ReactNode
}

/**
 * The five officer tools (R30). One registry drives the phone card grid and
 * the PC master list, so the pitch wording never drifts between the two.
 */
export const DESK_TOOLS: DeskTool[] = [
  {
    to: '/desk/announce',
    labelKey: 'deskExtra.toolAnnounce',
    subKey: 'deskExtra.announceSub',
    icon: <BulletinIcon className="size-5" />,
  },
  {
    to: '/desk/minutes',
    labelKey: 'deskExtra.toolMinutes',
    subKey: 'deskExtra.minutesSub',
    icon: <CalendarIcon className="size-5" />,
  },
  {
    to: '/desk/loan',
    labelKey: 'deskExtra.toolLoan',
    subKey: 'deskExtra.loanSub',
    icon: <HandCoinsIcon className="size-5" />,
  },
  {
    to: '/desk/attendance',
    labelKey: 'deskExtra.toolAttendance',
    subKey: 'deskExtra.attendanceSub',
    icon: <UsersIcon className="size-5" />,
  },
  {
    to: '/desk/lottery',
    labelKey: 'deskExtra.toolLottery',
    subKey: 'deskExtra.lotterySubShort',
    icon: <ShuffleIcon className="size-5" />,
  },
]
