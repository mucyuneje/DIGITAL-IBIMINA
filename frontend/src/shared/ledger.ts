/**
 * Ledger primitives shared by the demo backend and by the Cloud Functions.
 * A TXN id is generated once, at the moment the balance changes, inside the
 * same transaction that writes the audit entry — never in a second pass.
 */
import type { AuditEntryType, AuditLogDoc, Role } from './schema'

const ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'

function randomChars(length: number): string {
  const bytes = new Uint8Array(length)
  globalThis.crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length]
  return out
}

export function makeTxnId(now = Date.now()): string {
  const stamp = now.toString(36).toUpperCase().slice(-5)
  return `TXN-${stamp}${randomChars(4)}`
}

/** Every group invite code starts with this prefix (pitch book, R3). */
export const INVITE_CODE_PREFIX = 'IBI-'

/** Six characters after the prefix — `IBI-482913` in the pitch book. */
export const INVITE_CODE_LENGTH = 6

export function makeInviteCode(): string {
  return `${INVITE_CODE_PREFIX}${randomChars(INVITE_CODE_LENGTH)}`
}

/**
 * Accepts what people actually type — `482913`, `IBI482913`, `ibi-482913`
 * or `IBI-482913` — and returns the canonical `IBI-482913` form. Returns an
 * empty string when nothing usable was typed.
 */
export function normalizeInviteCode(raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  const body = cleaned.startsWith('IBI') ? cleaned.slice(3) : cleaned
  if (!body) return ''
  return `${INVITE_CODE_PREFIX}${body}`
}

/** True when the code is exactly `IBI-` plus six characters. */
export function isValidInviteCode(code: string): boolean {
  return new RegExp(`^${INVITE_CODE_PREFIX}[A-Z0-9]{${INVITE_CODE_LENGTH}}$`).test(code)
}

/** Governance entries are auditable but do not move money. */
export function isGovernanceEntry(type: AuditEntryType): boolean {
  return type === 'role_change' || type === 'group_rule_change'
}

/** True for entries whose amount changed the vault balance. */
export function isMoneyEntry(type: AuditEntryType): boolean {
  return !isGovernanceEntry(type)
}

export interface AuditEntryInput {
  groupId: string
  id: string
  txnId: string
  type: AuditEntryType
  amount: number
  initiatorId: string
  initiatorName: string
  initiatorRole: Role
  detail: string
  pinVerified: boolean
  balanceAfter: number
  relatedId: string | null
  timestamp?: number
}

/** Builds a complete ledger row. Fields never vary in shape between writers. */
export function buildAuditEntry(input: AuditEntryInput): AuditLogDoc {
  return {
    id: input.id,
    groupId: input.groupId,
    txnId: input.txnId,
    type: input.type,
    amount: input.amount,
    initiatorId: input.initiatorId,
    initiatorName: input.initiatorName,
    initiatorRole: input.initiatorRole,
    detail: input.detail,
    timestamp: input.timestamp ?? Date.now(),
    pinVerified: input.pinVerified,
    balanceAfter: input.balanceAfter,
    relatedId: input.relatedId,
  }
}
