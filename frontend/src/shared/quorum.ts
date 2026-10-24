/**
 * The quorum engine — ONE source of truth for multi-sig approval.
 *
 * Used by the Cloud Function that casts votes and by the client for its
 * read-only preview. Never reimplement these rules anywhere else: officer
 * collusion must be structurally impossible, not merely hidden by the UI.
 *
 * Rules (pitch book, Sections 5 & "Multi-sig withdrawals"):
 *  1. A withdrawal needs 75% approval — 75% of ALL members, not of votes cast.
 *  2. The petition creator is an automatic Yes at creation time.
 *  3. Once a group has 4+ members, at least one approving vote must come from
 *     an ordinary Member (role `member`), never only from officers.
 */
import type { Role, VoteEntry } from './schema';
import { MIN_MEMBERS_FOR_OFFICER_QUORUM } from './schema';

export const QUORUM_RATE = 0.75;

/** Approvals needed for a group of `totalMembers` to pass a withdrawal. */
export function requiredApprovals(totalMembers: number): number {
  if (!Number.isFinite(totalMembers) || totalMembers <= 0) return 0;
  return Math.ceil(totalMembers * QUORUM_RATE);
}

/** Groups of 4+ members demand at least one ordinary-member approval. */
export function needsMemberApproval(totalMembers: number): boolean {
  return totalMembers >= MIN_MEMBERS_FOR_OFFICER_QUORUM;
}

export interface QuorumState {
  totalMembers: number;
  required: number;
  approvals: number;
  rejections: number;
  /** Approvals cast by members with role `member`. */
  memberApprovals: number;
  needsMemberApproval: boolean;
  memberApprovalSatisfied: boolean;
  /** True only when BOTH conditions hold — this is the single pass/fail gate. */
  approved: boolean;
  remainingApprovals: number;
  remainingMemberApprovals: number;
  /** How many of the roster still has not voted. */
  outstandingVotes: number;
  /** True when even every remaining member voting yes cannot reach quorum. */
  impossible: boolean;
}

export function computeQuorum(
  totalMembers: number,
  votes: readonly VoteEntry[],
): QuorumState {
  const required = requiredApprovals(totalMembers);
  let approvals = 0;
  let rejections = 0;
  let memberApprovals = 0;
  const voters = new Set<string>();

  for (const vote of votes) {
    voters.add(vote.memberId);
    if (vote.choice === 'yes') {
      approvals += 1;
      if (vote.role === ('member' as Role)) memberApprovals += 1;
    } else {
      rejections += 1;
    }
  }

  const mustHaveMemberApproval = needsMemberApproval(totalMembers);
  const memberApprovalSatisfied = !mustHaveMemberApproval || memberApprovals >= 1;
  const outstandingVotes = Math.max(0, totalMembers - voters.size);
  const approved = approvals >= required && memberApprovalSatisfied;

  return {
    totalMembers,
    required,
    approvals,
    rejections,
    memberApprovals,
    needsMemberApproval: mustHaveMemberApproval,
    memberApprovalSatisfied,
    approved,
    remainingApprovals: Math.max(0, required - approvals),
    remainingMemberApprovals: mustHaveMemberApproval
      ? Math.max(0, 1 - memberApprovals)
      : 0,
    outstandingVotes,
    impossible: !approved && approvals + outstandingVotes < required,
  };
}

/** Rejects a duplicate vote from the same member (idempotency guard). */
export function hasVoted(votes: readonly VoteEntry[], memberId: string): boolean {
  return votes.some((v) => v.memberId === memberId);
}

/**
 * Whether a member is allowed to open a withdrawal petition at all:
 * any member of the group may propose; officers may not bypass anything.
 */
export function canPropose(role: Role): boolean {
  return true && Boolean(role);
}
