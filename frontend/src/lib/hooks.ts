import { useMemo, useSyncExternalStore } from 'react'
import { computeQuorum, type QuorumState } from '@shared/quorum'
import type { GroupDoc, MemberDoc, PetitionDoc } from '@shared/schema'
import { useData } from '@/state/DataContext'
import { useAuth } from '@/state/AuthContext'
import {
  deriveNotifications,
  loadLastSeen,
  unreadCount,
  type AppNotification,
  type NotificationCategory,
} from '@/lib/notifications'

/* ------------------------------------------------------------------- clock */

let cachedNow = Date.now()

/**
 * The wall clock as an external store. Components subscribe to a tick and
 * re-render; `Date.now()` never runs inside render (react-hooks/purity) and
 * state never flips inside an effect (react-hooks/set-state-in-effect).
 */
export function useNow(intervalMs = 30_000): number {
  return useSyncExternalStore(
    (onStoreChange) => {
      const id = window.setInterval(() => {
        cachedNow = Date.now()
        onStoreChange()
      }, intervalMs)
      return () => window.clearInterval(id)
    },
    () => cachedNow,
    () => cachedNow,
  )
}

/** Read-only client preview of the same quorum engine the Cloud Function runs. */
export function useQuorumState(petition: PetitionDoc, totalMembers: number): QuorumState {
  return useMemo(() => computeQuorum(totalMembers, petition.votes), [petition.votes, totalMembers])
}

/** The payout order starting from this cycle's recipient. */
export function useUpcomingRounds(limit = 5): { member: MemberDoc; cycle: number }[] {
  const { group, members } = useData()
  return useMemo(() => {
    if (!group) return []
    const order = buildRotation(group, members)
    return order.slice(0, limit).map((member, index) => ({
      member,
      cycle: group.currentCycle + index,
    }))
  }, [group, members, limit])
}

export function buildRotation(group: GroupDoc, members: MemberDoc[]): MemberDoc[] {
  const byId = new Map(members.map((m) => [m.id, m]))
  const ordered = group.rotationOrder
    .map((id) => byId.get(id))
    .filter((m): m is MemberDoc => Boolean(m))
  if (ordered.length === 0) return []
  const startIndex =
    Math.max(0, group.currentCycle - 1) % Math.max(1, group.rotationOrder.length)
  const rotated = [...ordered.slice(startIndex), ...ordered.slice(0, startIndex)]
  return rotated
}

export function useCurrentRecipient(): MemberDoc | null {
  const { group, members } = useData()
  return useMemo(() => {
    if (!group) return null
    const rotation = buildRotation(group, members)
    return rotation[0] ?? null
  }, [group, members])
}

/* ------------------------------------------------------------ notifications */

const NOTIFY_KEY = 'ibimina.notify'

interface NotifyFlags {
  deposits: boolean
  votes: boolean
  payouts: boolean
  chat: boolean
}

const DEFAULT_FLAGS: NotifyFlags = { deposits: true, votes: true, payouts: true, chat: false }

/** The member's category toggles, same key the settings screen writes. */
export function readNotifyFlags(): NotifyFlags {
  try {
    const raw = localStorage.getItem(NOTIFY_KEY)
    if (!raw) return { ...DEFAULT_FLAGS }
    return { ...DEFAULT_FLAGS, ...(JSON.parse(raw) as Partial<NotifyFlags>) }
  } catch {
    return { ...DEFAULT_FLAGS }
  }
}

const FLAG_BY_CATEGORY: Record<NotificationCategory, keyof NotifyFlags> = {
  votes: 'votes',
  payouts: 'payouts',
  chat: 'chat',
  deposits: 'deposits',
}

export interface NotificationsResult {
  items: AppNotification[]
  unread: number
}

/**
 * Derived-notification list for the signed-in member, filtered by their
 * saved category preferences. Read state comes from a single local cursor.
 */
export function useNotifications(): NotificationsResult {
  const { group, members, petitions, announcements, auditLogs } = useData()
  const { session } = useAuth()
  const now = useNow()

  return useMemo(() => {
    const flags = readNotifyFlags()
    const all = deriveNotifications({
      session,
      group,
      members,
      petitions,
      announcements,
      auditLogs,
      now,
    })
    const items = all.filter((item) => flags[FLAG_BY_CATEGORY[item.category]])
    return { items, unread: unreadCount(items, loadLastSeen()) }
  }, [session, group, members, petitions, announcements, auditLogs, now])
}
