/**
 * SINGLE SOURCE OF TRUTH for every derived figure in the app: cycle payment
 * status, cycle progress, payout rotation and approval thresholds.
 *
 * Rules (all derived from the ledger, never hard-coded):
 * - The current cycle begins at the most recent payout entry (or at group
 *   creation when no payout has happened yet).
 * - A member's contribution this cycle is the sum of their `deposit` entries
 *   after that point. `paid` when it covers the monthly contribution,
 *   `partial` when > 0 but short, `unpaid` otherwise.
 * - "Position" means payout round. Members already paid in the current lap of
 *   rotationOrder sit before `currentRecipientId`; members from the recipient
 *   onward are still waiting, with round = currentCycle + offset.
 */
import type { AuditLogDoc, GroupDoc, MemberDoc } from '@shared/schema'
import { requiredApprovals } from '@shared/quorum'

export type PaymentStatus = 'paid' | 'partial' | 'unpaid'

/** Timestamp of the most recent payout — the start of the current cycle. */
export function lastPayoutAt(logs: AuditLogDoc[]): number {
  let max = 0
  for (const log of logs) {
    if (log.type === 'payout' && log.timestamp > max) max = log.timestamp
  }
  return max
}

/** Cycle start = most recent payout, else group createdAt (seed has no explicit cycle-start field). */
export function cycleStartAt(group: GroupDoc, logs: AuditLogDoc[]): number {
  return lastPayoutAt(logs) || group.createdAt
}

const KIGALI_OFFSET_MS = 2 * 60 * 60 * 1000 // Africa/Kigali is UTC+2 year-round

/**
 * Payout is due at month-end in Africa/Kigali. Given the cycle start, returns
 * the epoch ms of the last calendar day of that month in Kigali (noon Kigali,
 * so `formatDate` lands on the correct day in any viewer timezone).
 */
export function nextPayoutDate(cycleStartMs: number): number {
  const kigali = new Date(cycleStartMs + KIGALI_OFFSET_MS)
  const year = kigali.getUTCFullYear()
  const month = kigali.getUTCMonth()
  // Day 0 of the next month = last day of this month.
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return Date.UTC(year, month, lastDay, 12) - KIGALI_OFFSET_MS
}

/** Deposits a member made after the last payout. */
export function contributedThisCycle(
  memberId: string,
  logs: AuditLogDoc[],
): number {
  const start = lastPayoutAt(logs)
  let sum = 0
  for (const log of logs) {
    if (
      log.type === 'deposit' &&
      log.initiatorId === memberId &&
      log.timestamp > start
    ) {
      sum += log.amount
    }
  }
  return sum
}

/** Lifetime deposits by a member, across every cycle. */
export function totalContributed(
  memberId: string,
  logs: AuditLogDoc[],
): number {
  let sum = 0
  for (const log of logs) {
    if (log.type === 'deposit' && log.initiatorId === memberId) {
      sum += log.amount
    }
  }
  return sum
}

export function paymentStatus(
  member: MemberDoc,
  group: GroupDoc,
  logs: AuditLogDoc[],
): PaymentStatus {
  const contributed = contributedThisCycle(member.id, logs)
  if (contributed >= group.contributionAmount) return 'paid'
  if (contributed > 0) return 'partial'
  return 'unpaid'
}

export interface CycleProgress {
  collected: number
  target: number
  paidCount: number
  partialCount: number
  unpaidCount: number
  memberCount: number
}

/** "175,000 of 400,000 collected" — computed entirely from the ledger. */
export function cycleProgress(
  group: GroupDoc,
  members: MemberDoc[],
  logs: AuditLogDoc[],
): CycleProgress {
  const start = lastPayoutAt(logs)
  let collected = 0
  for (const log of logs) {
    if (log.type === 'deposit' && log.timestamp > start) collected += log.amount
  }
  let paidCount = 0
  let partialCount = 0
  for (const member of members) {
    const status = paymentStatus(member, group, logs)
    if (status === 'paid') paidCount += 1
    else if (status === 'partial') partialCount += 1
  }
  return {
    collected,
    target: members.length * group.contributionAmount,
    paidCount,
    partialCount,
    unpaidCount: members.length - paidCount - partialCount,
    memberCount: members.length,
  }
}

export interface RotationEntry {
  member: MemberDoc
  /** Payout round this member is waiting for. */
  round: number
}

export interface RotationState {
  /** Index of the current recipient inside rotationOrder. */
  recipientIndex: number
  currentRecipient: MemberDoc | null
  /** Members already paid in this lap (rounds before currentCycle). */
  paidThisLap: MemberDoc[]
  /** Members still waiting, in payout order, with their real round numbers. */
  pending: RotationEntry[]
  /** Quorum needed to approve a withdrawal, derived from the roster. */
  requiredApprovals: number
}

export function rotationState(
  group: GroupDoc,
  members: MemberDoc[],
): RotationState {
  const byId = new Map(members.map((m) => [m.id, m]))
  const order = group.rotationOrder.filter((id) => byId.has(id))
  // Append any member missing from rotationOrder (joined later).
  for (const member of members) {
    if (!order.includes(member.id)) order.push(member.id)
  }
  let recipientIndex = group.currentRecipientId
    ? order.indexOf(group.currentRecipientId)
    : 0
  if (recipientIndex < 0) recipientIndex = 0

  const pending: RotationEntry[] = order.slice(recipientIndex).map((id, offset) => ({
    member: byId.get(id)!,
    round: group.currentCycle + offset,
  }))
  const paidThisLap = order
    .slice(0, recipientIndex)
    .map((id) => byId.get(id)!)
    .filter(Boolean)

  return {
    recipientIndex,
    currentRecipient: pending[0]?.member ?? null,
    paidThisLap,
    pending,
    requiredApprovals: requiredApprovals(members.length),
  }
}

/**
 * Remaining approvals for a petition, plus how many of them must come from
 * ordinary members (an officer-only quorum is not enough).
 */
export function approvalsLeft(petition: {
  votes: { memberId: string; choice: 'yes' | 'no' }[]
  requiredApprovals: number
}): { yes: number; no: number; remaining: number } {
  const yes = petition.votes.filter((v) => v.choice === 'yes').length
  const no = petition.votes.filter((v) => v.choice === 'no').length
  return { yes, no, remaining: Math.max(0, petition.requiredApprovals - yes) }
}
