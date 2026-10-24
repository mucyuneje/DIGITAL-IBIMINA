/**
 * DEMO data + auth layer. Mirrors production behaviour exactly where it can,
 * so switching to Firebase changes the wire, not the product.
 */
import {
  LOAN_INTEREST_RATE,
  MEMBER_CAP,
  PETITION_WINDOW_MS,
  PIN_RE,
  isValidRwandanPhone,
  loanTotalDue,
  normalizePhone,
  type MemberDoc,
  type Role,
} from '@shared/schema'
import { buildAuditEntry, makeInviteCode, makeTxnId } from '@shared/ledger'
import { computeQuorum, hasVoted, requiredApprovals } from '@shared/quorum'
import { DEMO_OTP, SESSION_STORAGE_KEY, bypassAuth } from '@/config'
import {
  SEEDED_FLAG,
  demoHashPin,
  demoVerifyPin,
  lockoutMsFor,
  loadDb,
  makeSalt,
  saveDb,
  seedDemoDb,
  subscribeRemoteCommits,
  type DemoDb,
} from './demoDb'
import type {
  ActionName,
  ActionPayload,
  ActionReturns,
  AuthLayer,
  AuthSession,
  AuthState,
  DataLayer,
  Membership,
  SubscriptionHandlers,
  Unsubscribe,
} from './types'

const synthLatency = () => new Promise((r) => setTimeout(r, 120))

type Listener = (state: AuthState) => void

/**
 * What is written to `localStorage`. Only ids are stored — never the phone
 * number (PII). `memberships` is optional so a session written by an older
 * build (a single member id) still restores.
 */
interface DemoSession {
  uid: string
  activeMemberId?: string
  memberships?: { groupId: string; memberId: string }[]
}

/** Builds the session payload for one member document. */
function sessionOf(member: MemberDoc): AuthSession {
  return {
    uid: member.id,
    memberId: member.id,
    groupId: member.groupId,
    role: member.role,
    name: member.name,
    phone: member.phone,
  }
}

/** One membership (member document) of a group, with its denormalised name. */
function membershipOf(db: DemoDb, memberId: string): Membership | null {
  const member = db.members.find((m) => m.id === memberId)
  if (!member) return null
  return {
    groupId: member.groupId,
    memberId: member.id,
    groupName: db.groups.find((g) => g.id === member.groupId)?.name,
  }
}

/**
 * Every group a phone belongs to, most recent first. The members collection
 * is flat, so one phone can own one member document per group (R59).
 */
function membershipsForPhone(db: DemoDb, phone: string): Membership[] {
  return db.members
    .filter((m) => m.phone === phone)
    .sort((a, b) => b.joinedAt - a.joinedAt)
    .map((m) => membershipOf(db, m.id))
    .filter((m): m is Membership => m !== null)
}

/** Merges known memberships with everything the phone is a member of. */
function collectMemberships(
  db: DemoDb,
  known: Membership[],
  memberIds: (string | null | undefined)[],
): Membership[] {
  const list: Membership[] = []
  const add = (membership: Membership | null) => {
    if (!membership) return
    if (list.some((m) => m.memberId === membership.memberId)) return
    list.push(membership)
  }
  for (const entry of known) add(membershipOf(db, entry.memberId))
  for (const id of memberIds) {
    const member = id ? db.members.find((m) => m.id === id) : undefined
    if (!member) continue
    for (const membership of membershipsForPhone(db, member.phone)) add(membership)
  }
  return list
}

class DemoAuth implements AuthLayer {
  private state: AuthState = {
    ready: false,
    uid: null,
    verifiedPhone: null,
    session: null,
    memberships: [],
    activeMemberId: null,
  }
  private listeners = new Set<Listener>()
  private pendingPhone: string | null = null

  constructor() {
    // During SSR there is no localStorage and no signed-in member: stay
    // not-ready until the browser constructor re-runs and restores.
    if (typeof window === 'undefined') return
    void this.restore()
  }

  private async restore() {
    if (bypassAuth) {
      await this.autoSignIn()
      return
    }
    let saved: DemoSession | null = null
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY)
      saved = raw ? (JSON.parse(raw) as DemoSession) : null
    } catch {
      saved = null
    }
    if (saved?.uid) {
      const db = loadDb()
      const memberships = collectMemberships(db, saved.memberships ?? [], [
        saved.uid,
        saved.activeMemberId,
      ])
      const activeId = saved.activeMemberId ?? saved.uid
      const active =
        memberships.find((m) => m.memberId === activeId) ?? memberships[0] ?? null
      const member = active
        ? db.members.find((m) => m.id === active.memberId)
        : undefined
      if (member) {
        this.setState({
          ready: true,
          uid: member.id,
          verifiedPhone: member.phone,
          session: sessionOf(member),
          memberships,
          activeMemberId: member.id,
        })
        return
      }
    }
    this.setState({
      ready: true,
      uid: null,
      verifiedPhone: null,
      session: null,
      memberships: [],
      activeMemberId: null,
    })
  }

  /**
   * TEMPORARY dev shortcut (see `bypassAuth`). Seeds the sample Ikimina if
   * needed and signs in as its president so every screen is reachable without
   * going through OTP + PIN. Remove once the login flow is final.
   */
  private async autoSignIn() {
    let db = loadDb()
    if (db.members.length === 0) db = await seedDemoDb()
    // The shortcut keeps the membership the member last switched to, so the
    // active group survives a reload exactly like the real session does.
    let member = db.members[0]
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY)
      const saved = raw ? (JSON.parse(raw) as DemoSession) : null
      const preferred = db.members.find(
        (m) => m.id === (saved?.activeMemberId ?? saved?.uid),
      )
      if (preferred) member = preferred
    } catch {
      /* ignore */
    }
    if (!member) {
      this.setState({
        ready: true,
        uid: null,
        verifiedPhone: null,
        session: null,
        memberships: [],
        activeMemberId: null,
      })
      return
    }
    const memberships = collectMemberships(db, [], [member.id])
    this.setState({
      ready: true,
      uid: member.id,
      verifiedPhone: member.phone,
      session: sessionOf(member),
      memberships,
      activeMemberId: member.id,
    })
  }

  private setState(next: AuthState) {
    this.state = next
    if (next.session) {
      try {
        localStorage.setItem(
          SESSION_STORAGE_KEY,
          // Persist only ids — never the phone number (PII).
          JSON.stringify({
            uid: next.session.memberId,
            activeMemberId: next.activeMemberId ?? next.session.memberId,
            memberships: next.memberships.map((m) => ({
              groupId: m.groupId,
              memberId: m.memberId,
            })),
          }),
        )
      } catch {
        /* ignore */
      }
    } else {
      try {
        localStorage.removeItem(SESSION_STORAGE_KEY)
      } catch {
        /* ignore */
      }
    }
    for (const listener of this.listeners) listener(next)
  }

  getState() {
    return this.state
  }

  subscribe(cb: Listener): Unsubscribe {
    this.listeners.add(cb)
    cb(this.state)
    return () => this.listeners.delete(cb)
  }

  async requestOtp(phone: string) {
    await synthLatency()
    const normalized = normalizePhone(phone)
    if (!isValidRwandanPhone(normalized)) throw new Error('errors:phoneInvalid')
    this.pendingPhone = normalized
  }

  async confirmOtp(code: string) {
    await synthLatency()
    if (!this.pendingPhone) throw new Error('errors:otpExpired')
    // Demo mode accepts the documented demo code only.
    if (code.trim() !== DEMO_OTP) throw new Error('errors:otpIncorrect')

    if (!localStorage.getItem(SEEDED_FLAG)) await seedDemoDb()
    const db = loadDb()
    // The phone may belong to several groups — the most recent one wins.
    const memberships = membershipsForPhone(db, this.pendingPhone)
    const member = memberships[0]
      ? db.members.find((m) => m.id === memberships[0].memberId)
      : undefined
    this.setState({
      ready: true,
      uid: member?.id ?? `pending-${this.pendingPhone}`,
      verifiedPhone: this.pendingPhone,
      session: member ? sessionOf(member) : null,
      memberships,
      activeMemberId: member?.id ?? null,
    })
  }

  async signOut() {
    // While auth is bypassed, "sign out" just re-binds the demo member so the
    // app never falls back to the login screen.
    if (bypassAuth) {
      await this.autoSignIn()
      return
    }
    this.pendingPhone = null
    this.setState({
      ready: true,
      uid: null,
      verifiedPhone: null,
      session: null,
      memberships: [],
      activeMemberId: null,
    })
  }

  async refresh() {
    const activeId = this.state.activeMemberId ?? this.state.uid
    if (!activeId) return
    const db = loadDb()
    const member = db.members.find((m) => m.id === activeId)
    if (!member) return
    const memberships = collectMemberships(db, this.state.memberships, [member.id])
    this.setState({
      ...this.state,
      ready: true,
      uid: member.id,
      verifiedPhone: member.phone,
      session: sessionOf(member),
      memberships,
      activeMemberId: member.id,
    })
  }

  /** Binds the session to another group the same phone belongs to (R59). */
  async switchGroup(groupId: string) {
    const membership = this.state.memberships.find((m) => m.groupId === groupId)
    if (!membership) throw new Error('errors:notMember')
    const db = loadDb()
    const member = db.members.find((m) => m.id === membership.memberId)
    if (!member) throw new Error('errors:notMember')
    this.setState({
      ...this.state,
      ready: true,
      uid: member.id,
      verifiedPhone: member.phone,
      session: sessionOf(member),
      activeMemberId: member.id,
    })
  }

  /**
   * Called by the data layer once Create/Join has produced a member. The
   * membership is added to the ones the phone already has — joining a second
   * group never signs the member out of the first one.
   */
  bindSession(memberId: string) {
    const db = loadDb()
    const member = db.members.find((m) => m.id === memberId)
    if (!member) return
    const membership = membershipOf(db, memberId)
    const memberships = [
      ...this.state.memberships.filter((m) => m.memberId !== memberId),
      ...(membership ? [membership] : []),
    ]
    this.setState({
      ready: true,
      uid: member.id,
      verifiedPhone: member.phone,
      session: sessionOf(member),
      memberships,
      activeMemberId: member.id,
    })
  }

  /**
   * Called when a member document is deleted. The membership disappears; if
   * it was the active one, the session falls back to another group the same
   * phone belongs to, and signs out when there is none left (R59).
   */
  handleMemberRemoved(memberId: string) {
    const memberships = this.state.memberships.filter((m) => m.memberId !== memberId)
    if (this.state.activeMemberId !== memberId) {
      this.setState({ ...this.state, memberships })
      return
    }
    const db = loadDb()
    const phone = this.state.session?.phone
    const remaining = phone ? membershipsForPhone(db, phone) : []
    const next = remaining[0]
    if (!next) {
      this.setState({
        ready: true,
        uid: null,
        verifiedPhone: null,
        session: null,
        memberships: [],
        activeMemberId: null,
      })
      return
    }
    const member = db.members.find((m) => m.id === next.memberId)
    if (!member) {
      this.setState({ ...this.state, memberships: remaining, activeMemberId: null })
      return
    }
    this.setState({
      ...this.state,
      ready: true,
      uid: member.id,
      verifiedPhone: member.phone,
      session: sessionOf(member),
      memberships: remaining,
      activeMemberId: member.id,
    })
  }
}

export const demoAuth = new DemoAuth()

/* --------------------------------------------------------------- data layer */

const listeners = new Set<{ groupId: string; handlers: SubscriptionHandlers }>()

/* ---------------------------- transactional writes (P1-1) */

/**
 * Serialises every action so a PIN await can never interleave between the
 * state snapshot and its commit — the demo equivalent of a Firestore
 * transaction running one at a time on the server.
 */
let txChain: Promise<unknown> = Promise.resolve()

function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = txChain.then(fn)
  txChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

/* --------------------------- cross-tab live sync (P1-2) */

subscribeRemoteCommits(() => {
  for (const { groupId, handlers } of listeners) pushSnapshot(groupId, handlers)
})

function getDb(): DemoDb {
  // Demo data is tiny; always read through so a background seed is never
  // shadowed by a stale in-memory copy.
  return loadDb()
}

function commit(next: DemoDb) {
  saveDb(next)
  for (const { groupId, handlers } of listeners) pushSnapshot(groupId, handlers)
}

function pushSnapshot(groupId: string, handlers: SubscriptionHandlers) {
  const current = getDb()
  handlers.group(current.groups.find((g) => g.id === groupId) ?? null)
  handlers.members(current.members.filter((m) => m.groupId === groupId))
  handlers.petitions(
    current.petitions
      .filter((p) => p.groupId === groupId)
      .sort((a, b) => b.createdAt - a.createdAt),
  )
  handlers.announcements(
    current.announcements
      .filter((a) => a.groupId === groupId)
      .sort((a, b) => b.createdAt - a.createdAt),
  )
  handlers.chatMessages(
    current.chatMessages
      .filter((c) => c.groupId === groupId)
      .sort((a, b) => a.createdAt - b.createdAt),
  )
  handlers.loans(current.loans.filter((l) => l.groupId === groupId && l.status === 'active'))
  handlers.auditLogs(
    current.auditLogs
      .filter((l) => l.groupId === groupId)
      .sort((a, b) => b.timestamp - a.timestamp),
  )
}

function fail(errorKey: string): { ok: false; errorKey: string } {
  return { ok: false, errorKey }
}

const ROLES: readonly Role[] = ['president', 'treasurer', 'secretary', 'member']

/** Denies the action when the PIN is wrong, and applies exponential lockout. */
async function requirePin(dbState: DemoDb, memberId: string, pin: string): Promise<{ ok: true } | { ok: false; errorKey: string } | { ok: false; errorKey: string; minutes: number }> {
  const cred = dbState.credentials.find((c) => c.memberId === memberId)
  if (!cred) return fail('errors.notMember')
  const now = Date.now()
  if (cred.lockedUntil && cred.lockedUntil > now) {
    return { ok: false, errorKey: 'errors.pinLocked', minutes: Math.ceil((cred.lockedUntil - now) / 60000) }
  }
  const valid = await demoVerifyPin(pin, cred.pinHash)
  if (!valid) {
    cred.failedAttempts += 1
    const wait = lockoutMsFor(cred.failedAttempts)
    if (wait > 0) cred.lockedUntil = now + wait
    return { ok: false, errorKey: 'errors.pinIncorrect' }
  }
  cred.failedAttempts = 0
  cred.lockedUntil = null
  cred.updatedAt = now
  return { ok: true }
}

function nextRotationPosition(dbState: DemoDb, groupId: string): number {
  return dbState.members.filter((m) => m.groupId === groupId).length + 1
}

function memberOrThrow(dbState: DemoDb, memberId: string) {
  const member = dbState.members.find((m) => m.id === memberId)
  if (!member) throw new Error('errors:notMember')
  return member
}

function pushLedger(dbState: DemoDb, entry: Parameters<typeof buildAuditEntry>[0]) {
  const row = buildAuditEntry(entry)
  dbState.auditLogs.push(row)
  return row
}

class DemoData implements DataLayer {
  readonly mode = 'demo' as const

  subscribeGroup(groupId: string, handlers: SubscriptionHandlers): Unsubscribe {
    const entry = { groupId, handlers }
    listeners.add(entry)
    // One "snapshot" per collection, exactly like Firestore listeners.
    void Promise.resolve().then(async () => {
      if (!localStorage.getItem(SEEDED_FLAG)) await seedDemoDb()
      pushSnapshot(groupId, handlers)
    })
    return () => {
      listeners.delete(entry)
    }
  }

  async call<K extends ActionName>(
    action: K,
    payload: ActionPayload[K],
  ): Promise<ActionReturns[K]> {
    await synthLatency()
    // One action at a time; state is read and committed inside the lock.
    return runExclusive(() => this.dispatch(action, payload))
  }

  private async dispatch<K extends ActionName>(
    action: K,
    payload: ActionPayload[K],
  ): Promise<ActionReturns[K]> {
    switch (action) {
      case 'verifyPin':
        return (await this.verifyPin(payload as ActionPayload['verifyPin'])) as ActionReturns[K]
      case 'createGroup':
        return (await this.createGroup(payload as ActionPayload['createGroup'])) as ActionReturns[K]
      case 'joinGroup':
        return (await this.joinGroup(payload as ActionPayload['joinGroup'])) as ActionReturns[K]
      case 'recordDeposit':
        return (await this.recordDeposit(payload as ActionPayload['recordDeposit'])) as ActionReturns[K]
      case 'createPetition':
        return (await this.createPetition(payload as ActionPayload['createPetition'])) as ActionReturns[K]
      case 'castVote':
        return (await this.castVote(payload as ActionPayload['castVote'])) as ActionReturns[K]
      case 'postAnnouncement':
        return (await this.postAnnouncement(payload as ActionPayload['postAnnouncement'])) as ActionReturns[K]
      case 'issueLoan':
        return (await this.issueLoan(payload as ActionPayload['issueLoan'])) as ActionReturns[K]
      case 'repayLoan':
        return (await this.repayLoan(payload as ActionPayload['repayLoan'])) as ActionReturns[K]
      case 'recordPenalty':
        return (await this.recordPenalty(payload as ActionPayload['recordPenalty'])) as ActionReturns[K]
      case 'postMessage':
        return (await this.postMessage(payload as ActionPayload['postMessage'])) as ActionReturns[K]
      case 'runRotationLottery':
        return (await this.runRotationLottery(
          payload as ActionPayload['runRotationLottery'],
        )) as ActionReturns[K]
      case 'changeRole':
        return (await this.changeRole(payload as ActionPayload['changeRole'])) as ActionReturns[K]
      case 'updateProfile':
        return (await this.updateProfile(
          payload as ActionPayload['updateProfile'],
        )) as ActionReturns[K]
      case 'updateGroup':
        return (await this.updateGroup(payload as ActionPayload['updateGroup'])) as ActionReturns[K]
      case 'changePin':
        return (await this.changePin(payload as ActionPayload['changePin'])) as ActionReturns[K]
      case 'deleteAccount':
        return (await this.deleteAccount(
          payload as ActionPayload['deleteAccount'],
        )) as ActionReturns[K]
      case 'markAnomalyReviewed':
        return (await this.markAnomalyReviewed(
          payload as ActionPayload['markAnomalyReviewed'],
        )) as ActionReturns[K]
      default:
        return fail('errors.generic') as ActionReturns[K]
    }
  }

  private async verifyPin(p: ActionPayload['verifyPin']) {
    const state = getDb()
    const result = await requirePin(state, p.memberId, p.pin)
    saveDb(state)
    return result.ok ? { ok: true } : fail(result.errorKey)
  }

  private async createGroup(p: ActionPayload['createGroup']) {
    const state = getDb()
    const now = Date.now()
    const phone = normalizePhone(p.phone)
    // A phone may belong to several groups (R59), so creating a second group
    // is allowed — it only adds a membership, it never replaces one.

    const groupId = `g-${makeTxnId(now).toLowerCase()}`
    const memberId = `m-${makeTxnId(now).toLowerCase()}`
    const inviteCode = makeInviteCode()
    const group = {
      id: groupId,
      name: p.groupName.trim(),
      contributionAmount: Math.max(0, Math.round(p.contributionAmount)),
      memberCap: MEMBER_CAP,
      inviteCode,
      currentCycle: 1,
      currentRecipientId: memberId,
      rotationOrder: [memberId],
      vaultBalance: 0,
      status: 'active' as const,
      createdAt: now,
      createdBy: memberId,
    }
    const member = {
      id: memberId,
      groupId,
      phone,
      name: p.name.trim(),
      role: 'president' as const,
      rotationPosition: 1,
      joinedAt: now,
    }
    state.groups.push(group)
    state.members.push(member)
    state.credentials.push({
      id: memberId,
      memberId,
      groupId,
      pinHash: await demoHashPin(p.pin, makeSalt()),
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: now,
    })
    void p.preferredLanguage
    commit(state)
    demoAuth.bindSession(memberId)
    return { ok: true, groupId, inviteCode }
  }

  private async joinGroup(p: ActionPayload['joinGroup']) {
    const state = getDb()
    const now = Date.now()
    const phone = normalizePhone(p.phone)
    const group = state.groups.find(
      (g) => g.inviteCode.toUpperCase() === p.inviteCode.trim().toUpperCase(),
    )
    if (!group) return fail('errors.inviteInvalid')

    const roster = state.members.filter((m) => m.groupId === group.id)
    if (roster.length >= group.memberCap) return fail('errors.groupFull')
    if (roster.some((m) => m.phone === phone)) return fail('errors.phoneTaken')

    const memberId = `m-${makeTxnId(now).toLowerCase()}`
    const member = {
      id: memberId,
      groupId: group.id,
      phone,
      name: p.name.trim(),
      role: 'member' as const,
      rotationPosition: nextRotationPosition(state, group.id),
      joinedAt: now,
    }
    state.members.push(member)
    group.rotationOrder.push(memberId)
    state.credentials.push({
      id: memberId,
      memberId,
      groupId: group.id,
      pinHash: await demoHashPin(p.pin, makeSalt()),
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: now,
    })
    state.announcements.push({
      id: `a-${makeTxnId(now).toLowerCase()}`,
      groupId: group.id,
      type: 'announcement',
      tag: 'normal',
      title: `${member.name} joined the group`,
      body: `${member.name} is now a member of ${group.name}.`,
      authorId: memberId,
      authorName: member.name,
      authorRole: 'member',
      createdAt: now,
    })
    commit(state)
    demoAuth.bindSession(memberId)
    return { ok: true, groupId: group.id }
  }

  private async recordDeposit(p: ActionPayload['recordDeposit']) {
    const state = getDb()
    const member = memberOrThrow(state, p.memberId)
    if (p.amount <= 0) return fail('errors.generic')
    const group = state.groups.find((g) => g.id === p.groupId)
    if (!group) return fail('errors.notMember')

    // Step 2 — the client is polling a payment it already started. The provider
    // has by now accepted (or declined) it, so answer with the current state.
    if (p.paymentRef) {
      return this.pollDeposit(state, group.id, p.paymentRef)
    }

    // Step 1 — a fresh request. The money is *asked for*, not moved: no vault
    // change and no ledger entry until the provider confirms. This mirrors the
    // Firestore callable, which creates a PaymentIntentDoc and returns at once.
    const gate = await requirePin(state, p.memberId, p.pin)
    if (!gate.ok) {
      saveDb(state)
      return fail(gate.errorKey)
    }

    const now = Date.now()
    const paymentRef = `momo-${makeTxnId(now).toLowerCase()}`
    state.payments.push({
      id: paymentRef,
      groupId: group.id,
      memberId: member.id,
      memberName: member.name,
      amount: p.amount,
      phone: normalizePhone(p.momoNumber || member.phone),
      provider: 'momo',
      providerRef: paymentRef,
      status: 'requested',
      txnId: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    })
    commit(state)
    return { ok: true, status: 'requested' as const, paymentRef }
  }

  /**
   * Simulated MoMo provider. A real one is polled over the network; here the
   * sandbox simply settles a moment after the request, so the UI can exercise
   * the pending → confirmed path for real.
   */
  private pollDeposit(state: DemoDb, groupId: string, paymentRef: string) {
    const intent = state.payments.find((row) => row.id === paymentRef)
    if (!intent || intent.groupId !== groupId) return fail('errors.generic')

    // Already settled on an earlier poll.
    if (intent.status === 'confirmed') {
      return { ok: true, status: 'confirmed' as const, txnId: intent.txnId ?? undefined }
    }
    if (intent.status === 'failed') {
      return { ok: false, errorKey: intent.error ?? 'errors.generic' }
    }

    // Still on its way: the sandbox settles ~1.2s after the request.
    const SETTLE_MS = 1200
    if (Date.now() - intent.createdAt < SETTLE_MS) {
      return { ok: true, status: 'requested' as const, paymentRef }
    }

    const group = state.groups.find((g) => g.id === groupId)
    const member = state.members.find((m) => m.id === intent.memberId)
    if (!group || !member) return fail('errors.generic')

    // Confirmed: now — and only now — the vault moves and the ledger records it.
    const txnId = makeTxnId()
    group.vaultBalance += intent.amount
    pushLedger(state, {
      groupId: group.id,
      id: `l-${txnId.toLowerCase()}`,
      txnId,
      type: 'deposit',
      amount: intent.amount,
      initiatorId: member.id,
      initiatorName: member.name,
      initiatorRole: member.role,
      detail: 'Deposit via MoMo',
      pinVerified: true,
      balanceAfter: group.vaultBalance,
      relatedId: null,
    })
    intent.status = 'confirmed'
    intent.txnId = txnId
    intent.updatedAt = Date.now()
    commit(state)
    return { ok: true, status: 'confirmed' as const, txnId }
  }

  private async createPetition(p: ActionPayload['createPetition']) {
    const state = getDb()
    const member = memberOrThrow(state, p.memberId)
    const group = state.groups.find((g) => g.id === p.groupId)
    if (!group) return fail('errors.notMember')
    if (p.amount <= 0) return fail('errors.generic')
    if (p.amount > group.vaultBalance) return fail('errors.insufficientFunds')

    const gate = await requirePin(state, p.memberId, p.pin)
    if (!gate.ok) {
      saveDb(state)
      return fail(gate.errorKey)
    }

    const roster = state.members.filter((m) => m.groupId === group.id)
    const now = Date.now()
    const petitionId = `p-${makeTxnId(now).toLowerCase()}`
    const petition = {
      id: petitionId,
      groupId: group.id,
      kind: 'withdrawal' as const,
      title: p.title.trim(),
      detail: p.detail.trim(),
      amount: p.amount,
      recipientName: p.recipientName?.trim() || undefined,
      recipientPhone: p.recipientPhone ? normalizePhone(p.recipientPhone) : undefined,
      status: 'open' as const,
      createdBy: member.id,
      createdByName: member.name,
      createdByRole: member.role,
      createdAt: now,
      expiresAt: now + PETITION_WINDOW_MS,
      // The proposer is an automatic Yes.
      votes: [
        {
          memberId: member.id,
          memberName: member.name,
          role: member.role,
          choice: 'yes' as const,
          at: now,
        },
      ],
      requiredApprovals: requiredApprovals(roster.length),
      totalMembersAtCreation: roster.length,
      decidedAt: null,
      paidAt: null,
      txnId: null,
    }
    state.petitions.push(petition)
    this.settle(state, petition, member.id)
    commit(state)
    return { ok: true, petitionId, status: petition.status }
  }

  private async castVote(p: ActionPayload['castVote']) {
    const state = getDb()
    const member = memberOrThrow(state, p.memberId)
    const petition = state.petitions.find((x) => x.id === p.petitionId)
    if (!petition) return fail('errors.generic')
    if (petition.status !== 'open') return fail('errors.petitionClosed')
    if (hasVoted(petition.votes, p.memberId)) return fail('errors.alreadyVoted')

    const gate = await requirePin(state, p.memberId, p.pin)
    if (!gate.ok) {
      saveDb(state)
      return fail(gate.errorKey)
    }

    petition.votes.push({
      memberId: member.id,
      memberName: member.name,
      role: member.role,
      choice: p.choice,
      at: Date.now(),
    })
    this.settle(state, petition, member.id)
    commit(state)
    return { ok: true, status: petition.status }
  }

  /** Shared settlement: quorum → debit vault + ledger entry, in one step. */
  private settle(state: DemoDb, petition: (typeof state.petitions)[number], actorId: string) {
    const group = state.groups.find((g) => g.id === petition.groupId)
    if (!group) return
    const roster = state.members.filter((m) => m.groupId === group.id)
    const quorum = computeQuorum(roster.length, petition.votes)

    if (quorum.approved) {
      if (petition.amount > group.vaultBalance) {
        // Quorum reached but the vault cannot cover it — reject honestly
        // rather than silently leaving the petition open forever.
        petition.status = 'rejected'
        petition.decidedAt = Date.now()
        return
      }
      const actor = state.members.find((m) => m.id === actorId)
      const txnId = makeTxnId()
      group.vaultBalance -= petition.amount
      pushLedger(state, {
        groupId: group.id,
        id: `l-${txnId.toLowerCase()}`,
        txnId,
        type: 'payout',
        amount: petition.amount,
        initiatorId: actor?.id ?? petition.createdBy,
        initiatorName: actor?.name ?? petition.createdByName,
        initiatorRole: actor?.role ?? petition.createdByRole,
        detail: petition.title,
        pinVerified: true,
        balanceAfter: group.vaultBalance,
        relatedId: petition.id,
      })
      petition.status = 'paid'
      petition.decidedAt = Date.now()
      petition.paidAt = Date.now()
      petition.txnId = txnId

      if (petition.kind === 'cycle_payout') {
        group.currentCycle += 1
        const order = group.rotationOrder
        const nextIndex = (group.currentCycle - 1) % Math.max(1, order.length)
        group.currentRecipientId = order[nextIndex] ?? null
      }
      return
    }

    if (quorum.impossible) {
      petition.status = 'rejected'
      petition.decidedAt = Date.now()
    }
  }

  private async postAnnouncement(p: ActionPayload['postAnnouncement']) {
    const state = getDb()
    const member = memberOrThrow(state, p.memberId)
    if (member.role === 'member') return fail('errors.notOfficer')
    const gate = await requirePin(state, p.memberId, p.pin)
    if (!gate.ok) {
      saveDb(state)
      return fail(gate.errorKey)
    }
    const now = Date.now()
    state.announcements.push({
      id: `a-${makeTxnId(now).toLowerCase()}`,
      groupId: p.groupId,
      type: p.type,
      tag: p.tag,
      title: p.title.trim(),
      body: p.body.trim(),
      authorId: member.id,
      authorName: member.name,
      authorRole: member.role,
      createdAt: now,
      minutes: p.minutes,
      attendance: p.attendance,
    })
    commit(state)
    return { ok: true }
  }

  private async issueLoan(p: ActionPayload['issueLoan']) {
    const state = getDb()
    const officer = memberOrThrow(state, p.memberId)
    if (officer.role === 'member') return fail('errors.notOfficer')
    const group = state.groups.find((g) => g.id === p.groupId)
    if (!group) return fail('errors.notMember')
    if (p.principal <= 0) return fail('errors.generic')
    if (p.principal > group.vaultBalance) return fail('errors.insufficientFunds')
    const borrower = state.members.find((m) => m.id === p.borrowerId)
    if (!borrower) return fail('errors.notMember')

    const gate = await requirePin(state, p.memberId, p.pin)
    if (!gate.ok) {
      saveDb(state)
      return fail(gate.errorKey)
    }

    const now = Date.now()
    const txnId = makeTxnId(now)
    group.vaultBalance -= p.principal
    pushLedger(state, {
      groupId: group.id,
      id: `l-${txnId.toLowerCase()}`,
      txnId,
      type: 'loan_issue',
      amount: p.principal,
      initiatorId: officer.id,
      initiatorName: officer.name,
      initiatorRole: officer.role,
      detail: `Loan to ${borrower.name} (${p.termDays} days)`,
      pinVerified: true,
      balanceAfter: group.vaultBalance,
      relatedId: p.borrowerId,
    })
    const loanId = `ln-${txnId.toLowerCase()}`
    state.loans.push({
      id: loanId,
      groupId: group.id,
      borrowerId: borrower.id,
      borrowerName: borrower.name,
      principal: p.principal,
      interestRate: LOAN_INTEREST_RATE,
      termDays: p.termDays,
      totalDue: loanTotalDue(p.principal),
      issuedById: officer.id,
      issuedByName: officer.name,
      issuedByRole: officer.role,
      issuedAt: now,
      dueAt: now + p.termDays * 24 * 3600_000,
      status: 'active',
      repaidAt: null,
      repaidById: null,
      txnId,
    })
    commit(state)
    return { ok: true, loanId, txnId }
  }

  private async repayLoan(p: ActionPayload['repayLoan']) {
    const state = getDb()
    const actor = memberOrThrow(state, p.memberId)
    const loan = state.loans.find((l) => l.id === p.loanId)
    if (!loan || loan.status !== 'active') return fail('errors.generic')
    if (actor.groupId !== p.groupId || loan.groupId !== p.groupId) {
      return fail('errors.notMember')
    }
    // Rule 238: a borrower can repay their own loan. Officers can still record
    // a repayment on behalf of any member; ordinary members cannot.
    if (loan.borrowerId !== actor.id && actor.role === 'member') {
      return fail('errors.notOfficer')
    }
    const group = state.groups.find((g) => g.id === p.groupId)
    if (!group) return fail('errors.notMember')

    const gate = await requirePin(state, p.memberId, p.pin)
    if (!gate.ok) {
      saveDb(state)
      return fail(gate.errorKey)
    }

    const now = Date.now()
    const txnId = makeTxnId(now)
    group.vaultBalance += loan.totalDue
    pushLedger(state, {
      groupId: group.id,
      id: `l-${txnId.toLowerCase()}`,
      txnId,
      type: 'loan_repay',
      amount: loan.totalDue,
      initiatorId: actor.id,
      initiatorName: actor.name,
      initiatorRole: actor.role,
      detail: `Loan repayment from ${loan.borrowerName}`,
      pinVerified: true,
      balanceAfter: group.vaultBalance,
      relatedId: loan.id,
    })
    loan.status = 'repaid'
    loan.repaidAt = now
    loan.repaidById = actor.id
    commit(state)
    return { ok: true, txnId }
  }

  private async recordPenalty(p: ActionPayload['recordPenalty']) {
    const state = getDb()
    const officer = memberOrThrow(state, p.memberId)
    if (officer.role === 'member') return fail('errors.notOfficer')
    const target = state.members.find((m) => m.id === p.targetMemberId)
    if (!target || p.amount <= 0) return fail('errors.generic')

    const gate = await requirePin(state, p.memberId, p.pin)
    if (!gate.ok) {
      saveDb(state)
      return fail(gate.errorKey)
    }
    const group = state.groups.find((g) => g.id === p.groupId)
    if (!group) return fail('errors.notMember')

    const txnId = makeTxnId()
    group.vaultBalance += p.amount
    pushLedger(state, {
      groupId: group.id,
      id: `l-${txnId.toLowerCase()}`,
      txnId,
      type: 'penalty',
      amount: p.amount,
      initiatorId: officer.id,
      initiatorName: officer.name,
      initiatorRole: officer.role,
      detail: `Penalty — ${target.name}: ${p.reason}`,
      pinVerified: true,
      balanceAfter: group.vaultBalance,
      relatedId: target.id,
    })
    commit(state)
    return { ok: true, txnId }
  }

  private async postMessage(p: ActionPayload['postMessage']) {
    const state = getDb()
    const member = memberOrThrow(state, p.memberId)
    const text = p.text.trim()
    if (!text) return fail('errors.generic')
    const now = Date.now()
    state.chatMessages.push({
      id: `c-${makeTxnId(now).toLowerCase()}`,
      groupId: p.groupId,
      senderId: member.id,
      senderName: member.name,
      senderRole: member.role,
      text,
      createdAt: now,
    })
    commit(state)
    return { ok: true }
  }

  /** Fisher-Yates shuffle, resolved for every member in one commit. */
  private async runRotationLottery(p: ActionPayload['runRotationLottery']) {
    const state = getDb()
    const officer = memberOrThrow(state, p.memberId)
    if (officer.role === 'member') return fail('errors.notOfficer')
    const gate = await requirePin(state, p.memberId, p.pin)
    if (!gate.ok) {
      saveDb(state)
      return fail(gate.errorKey)
    }
    const group = state.groups.find((g) => g.id === p.groupId)
    if (!group) return fail('errors.notMember')

    // Only the members still waiting for a payout are shuffled. The prefix
    // of rotationOrder covering members already paid in this lap is fixed —
    // a lottery must never reshuffle people who already received the pot.
    const order = [...group.rotationOrder]
    const recipientIndex = Math.max(
      0,
      order.indexOf(group.currentRecipientId ?? ''),
    )
    const pending = order.slice(recipientIndex)
    for (let i = pending.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pending[i], pending[j]] = [pending[j], pending[i]]
    }
    group.rotationOrder = [...order.slice(0, recipientIndex), ...pending]
    group.currentRecipientId = pending[0] ?? group.currentRecipientId
    // Positions after the current recipient advance by one round each; the
    // paid prefix keeps the rounds it already had (currentCycle - index).
    for (const member of state.members) {
      const index = group.rotationOrder.indexOf(member.id)
      if (index < 0) continue
      member.rotationPosition =
        index < recipientIndex
          ? group.currentCycle - recipientIndex + index
          : group.currentCycle + (index - recipientIndex)
    }
    commit(state)
    return { ok: true }
  }

  /* --------------------------------------- account + governance actions */

  /** President-only. One President at a time; every change is audited. */
  private async changeRole(p: ActionPayload['changeRole']) {
    const state = getDb()
    const actor = state.members.find((m) => m.id === p.actorId)
    if (!actor) return fail('errors.notMember')
    const member = state.members.find((m) => m.id === p.memberId)
    if (!member || member.groupId !== actor.groupId) return fail('errors.notMember')
    if (actor.role !== 'president') return fail('errors.notOfficer')
    if (!ROLES.includes(p.newRole)) return fail('errors.generic')
    if (member.role === p.newRole) return { ok: true }
    if (p.newRole === 'president') {
      const otherPresident = state.members.find(
        (m) =>
          m.groupId === member.groupId &&
          m.id !== member.id &&
          m.role === 'president',
      )
      if (otherPresident) return fail('member.presidentExists')
    }
    if (member.role === 'president') {
      const presidents = state.members.filter(
        (m) => m.groupId === member.groupId && m.role === 'president',
      )
      if (presidents.length <= 1) return fail('member.lastPresident')
    }

    const gate = await requirePin(state, p.actorId, p.pin)
    if (!gate.ok) {
      saveDb(state)
      return fail(gate.errorKey)
    }

    const group = state.groups.find((g) => g.id === member.groupId)
    if (!group) return fail('errors.notMember')

    const previousRole = member.role
    member.role = p.newRole
    const now = Date.now()
    const txnId = makeTxnId(now)
    pushLedger(state, {
      groupId: group.id,
      id: `l-${txnId.toLowerCase()}`,
      txnId,
      type: 'role_change',
      amount: 0,
      initiatorId: actor.id,
      initiatorName: actor.name,
      initiatorRole: actor.role,
      detail: `Role changed for ${member.name}: ${previousRole} → ${p.newRole}`,
      pinVerified: true,
      balanceAfter: group.vaultBalance,
      relatedId: member.id,
    })
    commit(state)
    return { ok: true, txnId }
  }

  /** Updates a member's own name and phone. A phone change needs PIN + OTP. */
  private async updateProfile(p: ActionPayload['updateProfile']) {
    const state = getDb()
    const member = state.members.find((m) => m.id === p.memberId)
    if (!member) return fail('errors.notMember')
    const phone = normalizePhone(p.phone)
    if (!isValidRwandanPhone(phone)) return fail('auth.phoneInvalid')
    const phoneChanged = phone !== member.phone

    if (phoneChanged) {
      const duplicate = state.members.some(
        (m) => m.groupId === member.groupId && m.id !== member.id && m.phone === phone,
      )
      if (duplicate) return fail('errors.phoneTaken')
      if (!p.pin) return fail('errors.pinRequired')
      const gate = await requirePin(state, p.memberId, p.pin)
      if (!gate.ok) {
        saveDb(state)
        return fail(gate.errorKey)
      }
      // Demo-only challenge. Production must verify a server-issued OTP bound
      // to the new number before applying the change.
      if (p.otp?.trim() !== DEMO_OTP) {
        saveDb(state)
        return fail('errors.otpIncorrect')
      }
    }

    const name = p.name.trim()
    if (name) member.name = name
    member.phone = phone
    commit(state)
    return { ok: true }
  }

  /** Officers update group rules; every change is PIN-verified and audited. */
  private async updateGroup(p: ActionPayload['updateGroup']) {
    const state = getDb()
    const actor = state.members.find((m) => m.id === p.actorId)
    if (!actor) return fail('errors.notMember')
    const group = state.groups.find((g) => g.id === p.groupId)
    if (!group || actor.groupId !== group.id) return fail('errors.notMember')
    if (actor.role === 'member') return fail('errors.notOfficer')
    if (!Number.isInteger(p.monthlyContribution) || p.monthlyContribution <= 0) {
      return fail('errors.generic')
    }
    const name = p.name.trim()
    const nameChanged = name.length > 0 && name !== group.name
    const contributionChanged = p.monthlyContribution !== group.contributionAmount
    if (!nameChanged && !contributionChanged) return { ok: true }

    const gate = await requirePin(state, p.actorId, p.pin)
    if (!gate.ok) {
      saveDb(state)
      return fail(gate.errorKey)
    }

    const changes: string[] = []
    if (nameChanged) {
      group.name = name
      changes.push(`name to "${name}"`)
    }
    if (contributionChanged) {
      group.contributionAmount = p.monthlyContribution
      changes.push(`monthly contribution to ${p.monthlyContribution} RWF`)
    }
    const now = Date.now()
    const txnId = makeTxnId(now)
    pushLedger(state, {
      groupId: group.id,
      id: `l-${txnId.toLowerCase()}`,
      txnId,
      type: 'group_rule_change',
      amount: 0,
      initiatorId: actor.id,
      initiatorName: actor.name,
      initiatorRole: actor.role,
      detail: `Group rules changed: ${changes.join(', ')}`,
      pinVerified: true,
      balanceAfter: group.vaultBalance,
      relatedId: group.id,
    })
    commit(state)
    return { ok: true, txnId }
  }

  /**
   * Changes the PIN after re-verifying the current one with the existing
   * lockout-guarded check. The new PIN is hashed exactly like every other demo
   * PIN — no new hashing scheme is introduced.
   */
  private async changePin(p: ActionPayload['changePin']) {
    const state = getDb()
    const cred = state.credentials.find((c) => c.memberId === p.memberId)
    if (!cred) return fail('errors.notMember')

    const gate = await requirePin(state, p.memberId, p.currentPin)
    if (!gate.ok) {
      saveDb(state)
      return fail(gate.errorKey)
    }
    if (!PIN_RE.test(p.newPin)) return fail('security.pin.length')

    cred.pinHash = await demoHashPin(p.newPin, makeSalt())
    cred.failedAttempts = 0
    cred.lockedUntil = null
    cred.updatedAt = Date.now()
    saveDb(state)
    return { ok: true }
  }

  /**
   * Removes this device's member. Ledger entries and recorded contributions are
   * deliberately left in place — nothing historic is erased.
   */
  private async deleteAccount(p: ActionPayload['deleteAccount']) {
    const state = getDb()
    const member = state.members.find((m) => m.id === p.memberId)
    if (!member) return fail('errors.notMember')
    if (member.role === 'president') {
      const presidents = state.members.filter(
        (m) => m.groupId === member.groupId && m.role === 'president',
      )
      if (presidents.length <= 1) return fail('delete.onlyPresident')
    }
    const group = state.groups.find((g) => g.id === member.groupId)
    if (group) {
      group.rotationOrder = group.rotationOrder.filter((id) => id !== member.id)
      if (group.currentRecipientId === member.id) {
        group.currentRecipientId = group.rotationOrder[0] ?? null
      }
    }
    state.members = state.members.filter((m) => m.id !== member.id)
    state.credentials = state.credentials.filter((c) => c.memberId !== member.id)
    commit(state)
    // The membership is gone: fall back to another group of the same phone,
    // or sign out when this was the last one (R59).
    demoAuth.handleMemberRemoved(member.id)
    return { ok: true }
  }

  /** Flags an anomaly as reviewed. Idempotent. */
  private async markAnomalyReviewed(p: ActionPayload['markAnomalyReviewed']) {
    const state = getDb()
    if (!p.anomalyId) return fail('errors.generic')
    if (!state.reviewedAnomalies.includes(p.anomalyId)) {
      state.reviewedAnomalies.push(p.anomalyId)
      commit(state)
    }
    return { ok: true }
  }
}

export const demoData = new DemoData()
