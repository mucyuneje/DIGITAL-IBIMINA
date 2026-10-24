/**
 * Derived notifications.
 *
 * Nothing here is persisted: a notification is a *view* over data the app
 * already holds (open petitions, announcements, ledger rows, the payout date).
 * That keeps the model correct in demo and in production alike, and means a
 * notification can never drift from the state it describes.
 *
 * "Unread" is the only piece of local memory: a single `lastSeen` cursor in
 * localStorage, so the badge survives a reload without a server round-trip.
 */
import type {
  AnnouncementDoc,
  AuditLogDoc,
  GroupDoc,
  MemberDoc,
  PetitionDoc,
} from '@shared/schema'
import { isMoneyEntry } from '@shared/ledger'
import { cycleStartAt, nextPayoutDate } from '@/lib/cycle'

export type NotificationKind =
  | 'voteNeeded'
  | 'petitionDecided'
  | 'announcement'
  | 'payoutDue'
  | 'activity'

export type NotificationCategory = 'votes' | 'payouts' | 'chat' | 'deposits'

export interface AppNotification {
  /** Stable id — used for read/unread tracking and list keys. */
  id: string
  kind: NotificationKind
  category: NotificationCategory
  /** Where tapping the row takes the member. */
  to: string
  /** e.g. an amount or a member name worth showing. */
  actor?: string
  at: number
}

export interface NotificationInput {
  session: { memberId: string } | null
  group: GroupDoc | null
  members: MemberDoc[]
  petitions: PetitionDoc[]
  announcements: AnnouncementDoc[]
  auditLogs: AuditLogDoc[]
  /** Injected so the model is pure and testable. */
  now: number
}

const PAYOUT_SOON_MS = 3 * 24 * 60 * 60 * 1000
const ACTIVITY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const ACTIVITY_LIMIT = 8

/**
 * Builds the current notification list, newest first. Categories map onto the
 * member's preference toggles (`notif.*`), which the caller filters by.
 */
export function deriveNotifications(input: NotificationInput): AppNotification[] {
  const { session, group, petitions, announcements, auditLogs, now } = input
  if (!session) return []
  const mine = session.memberId
  const items: AppNotification[] = []

  // 1. A petition is open and I have not voted — the strongest signal in the app.
  for (const petition of petitions) {
    if (petition.status !== 'open') continue
    if (petition.votes.some((vote) => vote.memberId === mine)) continue
    items.push({
      id: `vote:${petition.id}`,
      kind: 'voteNeeded',
      category: 'votes',
      to: `/withdrawals/${petition.id}`,
      actor: petition.createdByName,
      at: petition.createdAt,
    })
  }

  // 2. A petition I raised was decided (approved / rejected / paid).
  for (const petition of petitions) {
    if (petition.createdBy !== mine) continue
    if (petition.status === 'open' || petition.status === 'expired') continue
    const at = petition.paidAt ?? petition.decidedAt ?? petition.createdAt
    items.push({
      id: `decided:${petition.id}:${petition.status}`,
      kind: 'petitionDecided',
      category: 'votes',
      to: `/withdrawals/${petition.id}`,
      actor: petition.title,
      at,
    })
  }

  // 3. Announcements / minutes / attendance posted by others.
  for (const row of announcements) {
    if (row.authorId === mine) continue
    items.push({
      id: `ann:${row.id}`,
      kind: 'announcement',
      category: 'chat',
      to: '/bulletin',
      actor: row.authorName,
      at: row.createdAt,
    })
  }

  // 4. Payout approaching.
  if (group) {
    const due = nextPayoutDate(cycleStartAt(group, auditLogs))
    if (due - now <= PAYOUT_SOON_MS) {
      items.push({
        id: `payout:${group.currentCycle}`,
        kind: 'payoutDue',
        category: 'payouts',
        to: '/rotation',
        actor: group.name,
        at: due,
      })
    }
  }

  // 5. Recent money movement by others (deposits, payouts, loans, penalties).
  const recent = auditLogs
    .filter((log) => isMoneyEntry(log.type))
    .filter((log) => log.initiatorId !== mine)
    .filter((log) => now - log.timestamp <= ACTIVITY_WINDOW_MS)
    .slice(0, ACTIVITY_LIMIT)
  for (const log of recent) {
    items.push({
      id: `act:${log.id}`,
      kind: 'activity',
      category: log.type === 'payout' ? 'payouts' : 'deposits',
      to: `/ledger/${log.txnId}`,
      actor: log.initiatorName,
      at: log.timestamp,
    })
  }

  return items.sort((a, b) => b.at - a.at)
}

/* ------------------------------------------------------------ read cursor */

const SEEN_KEY = 'ibimina.notifications.lastSeen'

/** Timestamp before which every notification counts as read. */
export function loadLastSeen(): number {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return raw ? Number(raw) || 0 : 0
  } catch {
    return 0
  }
}

export function markAllSeen(at: number = Date.now()): void {
  try {
    localStorage.setItem(SEEN_KEY, String(at))
  } catch {
    /* private mode — the badge simply resets next visit */
  }
}

export function unreadCount(items: AppNotification[], lastSeen: number): number {
  return items.filter((item) => item.at > lastSeen).length
}
