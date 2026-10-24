/**
 * DEMO BACKEND — in-browser stand-in for Firestore.
 *
 * Exists so the whole product is explorable before a Firebase project exists.
 * It mirrors the production semantics (same schema, same quorum function, same
 * ledger rules, same PIN lockout shape) but keeps data in localStorage.
 *
 * Security note: the real PIN check runs server-side against bcrypt. In demo
 * mode there is no server, so we use WebCrypto SHA-256 + per-member salt and
 * clearly mark it as demo-only. Nothing here ships to production.
 */
import {
  LOAN_INTEREST_RATE,
  MEMBER_CAP,
  PETITION_WINDOW_MS,
  loanTotalDue,
  normalizePhone,
  type AnnouncementDoc,
  type AuditLogDoc,
  type ChatMessageDoc,
  type GroupDoc,
  type LoanDoc,
  type MemberCredentialDoc,
  type MemberDoc,
  type PaymentIntentDoc,
  type PetitionDoc,
} from '@shared/schema'
import { buildAuditEntry } from '@shared/ledger'
import { requiredApprovals } from '@shared/quorum'

export interface DemoDb {
  groups: GroupDoc[]
  members: MemberDoc[]
  petitions: PetitionDoc[]
  announcements: AnnouncementDoc[]
  chatMessages: ChatMessageDoc[]
  loans: LoanDoc[]
  auditLogs: AuditLogDoc[]
  credentials: MemberCredentialDoc[]
  /**
   * Demo-only stand-in for the server-only `PaymentIntentDoc` collection.
   * Never pushed to subscribers — the client learns the state from the
   * callable's answer, exactly as the production contract specifies.
   */
  payments: PaymentIntentDoc[]
  /** Demo-only: anomaly ids an officer has marked as reviewed. */
  reviewedAnomalies: string[]
  /** Monotonic counter; bumped on every save for cross-tab sync. */
  revision: number
}

// v4: deposits became a two-step payment (requested → confirmed), so the demo
// DB gained a `payments` list. Bumping the key discards any v3 state that has
// no such list (the loader defaults it, but a clean re-seed is clearer).
const STORAGE_KEY = 'ibimina.demo.v4'
export const SEEDED_FLAG = 'ibimina.demo.seeded.v4'

export function emptyDb(): DemoDb {
  return {
    groups: [],
    members: [],
    petitions: [],
    announcements: [],
    chatMessages: [],
    loans: [],
    auditLogs: [],
    credentials: [],
    payments: [],
    reviewedAnomalies: [],
    revision: 0,
  }
}

export function loadDb(): DemoDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyDb()
    const parsed = JSON.parse(raw) as DemoDb
    const db = { ...emptyDb(), ...parsed }

    // v4 stored 0-prefixed demo phones. Canonicalise them in memory so an
    // existing browser keeps its memberships after the +250 switch; the next
    // save writes the canonical values back.
    db.members = (db.members ?? []).map((member) => {
      const phone = normalizePhone(member.phone)
      return phone === member.phone ? member : { ...member, phone }
    })

    return db
  } catch {
    return emptyDb()
  }
}

export function saveDb(db: DemoDb) {
  try {
    db.revision = (db.revision ?? 0) + 1
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    postRemoteCommit(db.revision)
  } catch {
    /* quota / private mode — demo data simply does not persist */
  }
}

/**
 * Anomaly ids an officer already marked as reviewed. Read straight from
 * storage so a mark survives a refresh and shows up in the other tab
 * (P2-12). The demo layer is the only backend that stores them today.
 */
export function readReviewedAnomalies(): string[] {
  return loadDb().reviewedAnomalies ?? []
}

/* -------------------------------------------- cross-tab live sync (P1-2) */

const SYNC_CHANNEL = 'ibimina.demo.sync'
let syncChannel: BroadcastChannel | null = null

function getSyncChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null
  if (!syncChannel) syncChannel = new BroadcastChannel(SYNC_CHANNEL)
  return syncChannel
}

function postRemoteCommit(revision: number) {
  getSyncChannel()?.postMessage({ revision })
}

/**
 * Fires when another tab commits (BroadcastChannel, with a storage-event
 * fallback for browsers without it). Handler re-reads through loadDb().
 */
export function subscribeRemoteCommits(onCommit: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const channel = getSyncChannel()
  if (channel) {
    channel.addEventListener('message', onCommit)
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) onCommit()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    channel?.removeEventListener('message', onCommit)
    window.removeEventListener('storage', onStorage)
  }
}

export function markSeeded() {
  try {
    localStorage.setItem(SEEDED_FLAG, '1')
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------ PIN handling */

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function makeSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return toHex(bytes.buffer)
}

/** DEMO ONLY. Production hashes with bcrypt inside a Cloud Function. */
export async function demoHashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return `demo$sha256$${salt}$${toHex(digest)}`
}

export async function demoVerifyPin(
  pin: string,
  stored: string | undefined,
): Promise<boolean> {
  if (!stored) return false
  const parts = stored.split('$')
  const salt = parts[2]
  const expected = await demoHashPin(pin, salt)
  return timingSafeEqual(expected, stored)
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/* ------------------------------------------------- lockout (same shape as prod) */

export const MAX_PIN_ATTEMPTS = 5
export const LOCKOUT_BASE_MS = 30_000

export function lockoutMsFor(failedAttempts: number): number {
  if (failedAttempts < MAX_PIN_ATTEMPTS) return 0
  const over = failedAttempts - MAX_PIN_ATTEMPTS
  return LOCKOUT_BASE_MS * 2 ** over
}

/* ------------------------------------------------------------------- seed */

/**
 * A believable 8-member Ikimina so every screen has real-looking data.
 *
 * Internal-consistency rules enforced here:
 * - The running vault balance never drops below zero.
 * - Every timestamp is in the past, relative to `now`.
 * - Ledger, Loan page and Home all see the same loan (principal, interest,
 *   due date, status) because the loan docs mirror ledger entries exactly.
 * - Payout rounds: Jean Bosco (1), Aline (2) and Eric (3) have been paid;
 *   cycle 4's recipient is Claudine, so Rotation and Lottery only show
 *   members from round 4 onwards.
 * - Claudine paid 25,000 of her 50,000 contribution → "partial".
 */
export function buildSeed(now = Date.now()): DemoDb {
  const db = emptyDb()
  const month = 30 * 24 * 60 * 60 * 1000
  const day = 24 * 60 * 60 * 1000
  const hour = 60 * 60 * 1000
  const groupId = 'demo-group'
  const group: GroupDoc = {
    id: groupId,
    name: "Ikimina Cy'abaturanyi",
    contributionAmount: 50_000,
    memberCap: MEMBER_CAP,
    inviteCode: 'IBI-482913',
    currentCycle: 4,
    currentRecipientId: 'demo-m4',
    rotationOrder: [],
    vaultBalance: 0,
    status: 'active',
    createdAt: now - 5 * month,
    createdBy: 'demo-m1',
  }
  db.groups = [group]

  const people: Array<[string, string, string, MemberDoc['role']]> = [
    ['demo-m1', 'Jean Bosco Habimana', '+250788123456', 'president'],
    ['demo-m2', 'Aline Uwase', '+250788654321', 'treasurer'],
    ['demo-m3', 'Eric Niyonzima', '+250722334455', 'secretary'],
    ['demo-m4', 'Claudine Mukamana', '+250733112233', 'member'],
    ['demo-m5', 'Patrick Nsengimana', '+250799112233', 'member'],
    ['demo-m6', 'Solange Umutoni', '+250788445566', 'member'],
    ['demo-m7', 'Emmanuel Rwigema', '+250722778899', 'member'],
    ['demo-m8', 'Yvonne Byiringiro', '+250733556677', 'member'],
  ]

  db.members = people.map(([id, name, phone, role], index) => ({
    id,
    groupId,
    phone,
    name,
    role,
    rotationPosition: index + 1,
    joinedAt: now - (5 * month - index * 5 * 24 * 60 * 60 * 1000),
  }))
  // Position = payout round: rounds 1-3 are done (m1, m2, m3), so the
  // current recipient (round 4) is m4, then m5..m8 follow.
  group.rotationOrder = db.members.map((m) => m.id)

  for (const member of db.members) {
    db.credentials.push({
      id: member.id,
      memberId: member.id,
      groupId,
      // Every demo member uses PIN 12345.
      pinHash: '',
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: now,
    })
  }

  const M = (i: number) => db.members[i]

  type SeedEntry = {
    type: AuditLogDoc['type']
    amount: number
    at: number
    initiator: number
    detail: string
  }

  // Ordered chronologically. Running balance after each line (RWF):
  //  50 → 100 → 0 → 50 → 100 → 150 → 155 → 30 → 80 → 130 → 100 → 150
  //  → 181.5 → 231.5 → 281.5 → 331.5 → 181.5 → 206.5 → 256.5 → 306.5
  //  → 246.5 → 296.5 (vault never below zero)
  const ledgerSeed: SeedEntry[] = [
    // ---- cycle 1 (paid out to Jean Bosco)
    { type: 'deposit', amount: 50_000, at: now - 145 * day, initiator: 0, detail: 'Monthly contribution' },
    { type: 'deposit', amount: 50_000, at: now - 142 * day, initiator: 1, detail: 'Monthly contribution' },
    { type: 'payout', amount: 100_000, at: now - 140 * day, initiator: 0, detail: 'Cycle 1 payout to Jean Bosco Habimana' },
    // ---- cycle 2 (paid out to Aline)
    { type: 'deposit', amount: 50_000, at: now - 105 * day, initiator: 2, detail: 'Monthly contribution' },
    { type: 'deposit', amount: 50_000, at: now - 102 * day, initiator: 3, detail: 'Monthly contribution' },
    { type: 'deposit', amount: 50_000, at: now - 100 * day, initiator: 4, detail: 'Monthly contribution' },
    { type: 'penalty', amount: 5_000, at: now - 98 * day, initiator: 1, detail: 'Late contribution penalty — Emmanuel Rwigema' },
    { type: 'payout', amount: 125_000, at: now - 95 * day, initiator: 0, detail: 'Cycle 2 payout to Aline Uwase' },
    // ---- cycle 3 (loan to Emmanuel, repaid; paid out to Eric)
    { type: 'deposit', amount: 50_000, at: now - 78 * day, initiator: 5, detail: 'Monthly contribution' },
    { type: 'deposit', amount: 50_000, at: now - 75 * day, initiator: 6, detail: 'Monthly contribution' },
    { type: 'loan_issue', amount: 30_000, at: now - 72 * day, initiator: 1, detail: 'Emergency loan to Emmanuel Rwigema (30 days)' },
    { type: 'deposit', amount: 50_000, at: now - 70 * day, initiator: 7, detail: 'Monthly contribution' },
    { type: 'loan_repay', amount: 31_500, at: now - 62 * day, initiator: 1, detail: 'Loan repayment from Emmanuel Rwigema' },
    { type: 'deposit', amount: 50_000, at: now - 45 * day, initiator: 0, detail: 'Monthly contribution' },
    { type: 'deposit', amount: 50_000, at: now - 42 * day, initiator: 1, detail: 'Monthly contribution' },
    { type: 'deposit', amount: 50_000, at: now - 40 * day, initiator: 2, detail: 'Monthly contribution' },
    { type: 'payout', amount: 150_000, at: now - 38 * day, initiator: 0, detail: 'Cycle 3 payout to Eric Niyonzima' },
    // ---- cycle 4 (current): Claudine partial, Patrick/Solange/Emmanuel paid
    { type: 'deposit', amount: 25_000, at: now - 12 * day, initiator: 3, detail: 'Partial contribution' },
    { type: 'deposit', amount: 50_000, at: now - 10 * day, initiator: 4, detail: 'Monthly contribution' },
    { type: 'deposit', amount: 50_000, at: now - 9 * day, initiator: 5, detail: 'Monthly contribution' },
    { type: 'loan_issue', amount: 60_000, at: now - 8 * day, initiator: 1, detail: 'Emergency loan to Solange Umutoni (30 days)' },
    { type: 'deposit', amount: 50_000, at: now - 6 * day, initiator: 6, detail: 'Monthly contribution' },
  ]

  let balance = 0
  db.auditLogs = ledgerSeed.map((entry, index) => {
    const inflow =
      entry.type === 'deposit' || entry.type === 'loan_repay' || entry.type === 'penalty'
    balance = inflow ? balance + entry.amount : balance - entry.amount
    const initiator = M(entry.initiator)
    return buildAuditEntry({
      groupId,
      id: `demo-log-${index + 1}`,
      txnId: `TXN-${String(index + 1).padStart(6, '0')}`,
      type: entry.type,
      amount: entry.amount,
      initiatorId: initiator.id,
      initiatorName: initiator.name,
      initiatorRole: initiator.role,
      detail: entry.detail,
      pinVerified: true,
      balanceAfter: balance,
      relatedId: null,
      timestamp: entry.at,
    })
  })
  group.vaultBalance = balance // 296,500 — never negative

  db.announcements = [
    {
      id: 'demo-ann-1',
      groupId,
      type: 'announcement',
      tag: 'urgent',
      title: 'Bring your contribution by Friday',
      body:
        'Cycle 4 contributions close on Friday. Please send to the Treasurer before 6pm so the payout is not delayed.',
      authorId: 'demo-m1',
      authorName: 'Jean Bosco Habimana',
      authorRole: 'president',
      createdAt: now - 2 * day,
    },
    {
      id: 'demo-ann-2',
      groupId,
      type: 'minutes',
      tag: 'normal',
      title: 'Minutes — monthly meeting',
      body: 'Recorded decision to repair the group shop roof before the rains.',
      authorId: 'demo-m3',
      authorName: 'Eric Niyonzima',
      authorRole: 'secretary',
      createdAt: now - 6 * day,
      minutes: {
        meetingDate: now - 6 * day,
        agenda: ['Contributions status', 'Roof repair', 'Cycle 4 payout date'],
        resolutions: ['Approved 80,000 RWF for roof materials', 'Cycle 4 payout moved to the 28th'],
        nextActions: ['Treasurer to buy materials', 'Secretary to notify the landlord'],
      },
    },
    {
      id: 'demo-ann-3',
      groupId,
      type: 'attendance',
      tag: 'normal',
      title: 'Attendance — monthly meeting',
      body: 'Seven of eight members attended.',
      authorId: 'demo-m3',
      authorName: 'Eric Niyonzima',
      authorRole: 'secretary',
      createdAt: now - 6 * day,
      attendance: {
        meetingDate: now - 6 * day,
        presentCount: 7,
        entries: db.members.map((m) => ({
          memberId: m.id,
          name: m.name,
          present: m.id !== 'demo-m5',
        })),
      },
    },
  ]

  db.chatMessages = [
    {
      id: 'demo-chat-1',
      groupId,
      senderId: 'demo-m2',
      senderName: 'Aline Uwase',
      senderRole: 'treasurer',
      text: 'Received 50,000 from Yvonne today. Thank you!',
      createdAt: now - 5 * hour,
    },
    {
      id: 'demo-chat-2',
      groupId,
      senderId: 'demo-m4',
      senderName: 'Claudine Mukamana',
      senderRole: 'member',
      text: 'Can we move the payout a week later? I travel on the 25th.',
      createdAt: now - 3 * hour,
    },
  ]

  const petitionCreator = M(1)
  const withdrawal: PetitionDoc = {
    id: 'demo-pet-1',
    groupId,
    kind: 'withdrawal',
    title: 'Roof repair for the group shop',
    detail: 'Materials and labour for the roof before the rainy season.',
    amount: 80_000,
    status: 'open',
    createdBy: petitionCreator.id,
    createdByName: petitionCreator.name,
    createdByRole: petitionCreator.role,
    createdAt: now - 20 * hour,
    expiresAt: now + PETITION_WINDOW_MS - 20 * hour,
    requiredApprovals: requiredApprovals(db.members.length),
    totalMembersAtCreation: db.members.length,
    decidedAt: null,
    paidAt: null,
    txnId: null,
    votes: [
      {
        memberId: petitionCreator.id,
        memberName: petitionCreator.name,
        role: petitionCreator.role,
        choice: 'yes',
        at: now - 20 * hour,
      },
      {
        memberId: 'demo-m1',
        memberName: 'Jean Bosco Habimana',
        role: 'president',
        choice: 'yes',
        at: now - 18 * hour,
      },
      {
        memberId: 'demo-m5',
        memberName: 'Patrick Nsengimana',
        role: 'member',
        choice: 'yes',
        at: now - 2 * hour,
      },
      {
        memberId: 'demo-m7',
        memberName: 'Emmanuel Rwigema',
        role: 'member',
        choice: 'no',
        at: now - 1 * hour,
      },
    ],
  }
  db.petitions = [withdrawal]

  // Loans mirror the ledger exactly: Solange's active 60,000 (30 days,
  // due in 10 days) and Emmanuel's already-repaid 30,000 + 5%.
  const solange = M(5)
  const emmanuel = M(6)
  db.loans = [
    {
      id: 'demo-loan-1',
      groupId,
      borrowerId: emmanuel.id,
      borrowerName: emmanuel.name,
      principal: 30_000,
      interestRate: LOAN_INTEREST_RATE,
      termDays: 30,
      totalDue: loanTotalDue(30_000),
      issuedById: 'demo-m2',
      issuedByName: 'Aline Uwase',
      issuedByRole: 'treasurer',
      issuedAt: now - 72 * day,
      dueAt: now - 42 * day,
      status: 'repaid',
      repaidAt: now - 62 * day,
      repaidById: 'demo-m2',
      txnId: 'TXN-000012',
    },
    {
      id: 'demo-loan-2',
      groupId,
      borrowerId: solange.id,
      borrowerName: solange.name,
      principal: 60_000,
      interestRate: LOAN_INTEREST_RATE,
      termDays: 30,
      totalDue: loanTotalDue(60_000),
      issuedById: 'demo-m2',
      issuedByName: 'Aline Uwase',
      issuedByRole: 'treasurer',
      issuedAt: now - 8 * day,
      dueAt: now + 22 * day,
      status: 'active',
      repaidAt: null,
      repaidById: null,
      txnId: 'TXN-000021',
    },
  ]

  return db
}

/** Seeds PIN 12345 for every demo member (hashes must be async). */
export async function seedDemoDb(): Promise<DemoDb> {
  const db = buildSeed()
  for (const cred of db.credentials) {
    cred.pinHash = await demoHashPin('12345', makeSalt())
  }
  saveDb(db)
  markSeeded()
  return db
}
