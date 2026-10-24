/**
 * PRODUCTION data + auth layer.
 *
 * Reads: one live Firestore listener per collection, each filtered to the
 * member's group — no polling, no manual refresh.
 *
 * Writes: never direct. Every state change goes through a callable Cloud
 * Function, which re-verifies the PIN server-side, re-checks the quorum with
 * the shared function, and writes the balance change *and* its ledger entry in
 * a single transaction. The client is untrusted (strategy report, item 1).
 */
import {
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  type ConfirmationResult,
} from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore'
import { httpsCallable, type HttpsCallableResult } from 'firebase/functions'
import { COLLECTIONS, normalizePhone, type GroupDoc, type Role } from '@shared/schema'
import { firebase } from './firebaseClient'
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

let confirmation: ConfirmationResult | null = null

type Listener = (state: AuthState) => void

/** Member document id is the auth uid; that is what makes rules simple. */
async function loadSession(uid: string): Promise<AuthSession | null> {
  const { db } = firebase()
  const snapshot = await getDoc(doc(db, COLLECTIONS.members, uid))
  if (!snapshot.exists()) return null
  const data = snapshot.data() as Record<string, unknown>
  return {
    uid,
    memberId: uid,
    groupId: String(data.groupId),
    role: data.role as Role,
    name: String(data.name),
    // Older member documents may still hold a 0-prefixed phone; the UI always
    // renders canonical E.164.
    phone: data.phone ? normalizePhone(String(data.phone)) : '',
  }
}

/**
 * The memberships a session can offer to the group switcher. The production
 * model still keeps one member document per uid, so this is a single entry
 * until the backend models memberships explicitly (Phase 3).
 */
function membershipsOf(session: AuthSession | null): Membership[] {
  if (!session) return []
  return [{ groupId: session.groupId, memberId: session.memberId }]
}

class FirebaseAuthLayer implements AuthLayer {
  private state: AuthState = {
    ready: false,
    uid: null,
    verifiedPhone: null,
    session: null,
    memberships: [],
    activeMemberId: null,
  }
  private listeners = new Set<Listener>()
  private recaptcha: RecaptchaVerifier | null = null
  private started = false

  /**
   * Firebase is touched on first use, never at module load — importing this
   * file must stay safe in demo mode (empty env values).
   */
  private ensureStarted() {
    if (this.started) return
    this.started = true
    const { auth } = firebase()
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
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
      const session = await loadSession(user.uid)
      this.setState({
        ready: true,
        uid: user.uid,
        verifiedPhone: user.phoneNumber ? normalizePhone(user.phoneNumber) : null,
        session,
        memberships: membershipsOf(session),
        activeMemberId: session?.memberId ?? null,
      })
    })
  }

  private setState(next: AuthState) {
    this.state = next
    for (const listener of this.listeners) listener(next)
  }

  async refresh() {
    this.ensureStarted()
    const uid = this.state.uid
    if (!uid) return
    const session = await loadSession(uid)
    this.setState({
      ...this.state,
      session,
      memberships: membershipsOf(session),
      activeMemberId: session?.memberId ?? null,
    })
  }

  getState() {
    this.ensureStarted()
    return this.state
  }

  subscribe(cb: Listener): Unsubscribe {
    this.ensureStarted()
    this.listeners.add(cb)
    cb(this.state)
    return () => this.listeners.delete(cb)
  }

  async requestOtp(phone: string) {
    this.ensureStarted()
    const { auth } = firebase()
    // Invisible reCAPTCHA guards the OTP request; a phone number alone is not
    // enough to make the SMS gateway spend money.
    this.recaptcha ??= new RecaptchaVerifier(auth, 'ibimina-recaptcha', {
      size: 'invisible',
    })
    confirmation = await signInWithPhoneNumber(auth, normalizePhone(phone), this.recaptcha)
  }

  async confirmOtp(code: string) {
    if (!confirmation) throw new Error('errors:otpExpired')
    await confirmation.confirm(code)
    confirmation = null
  }

  async signOut() {
    const { auth } = firebase()
    await firebaseSignOut(auth)
  }

  /**
   * The production model still stores one member document per uid, so there
   * is only ever one membership to switch to. Multi-group membership needs a
   * `memberships` collection on the backend (Phase 3) — until then the
   * switcher never offers a second group.
   */
  async switchGroup(groupId: string) {
    const membership = this.state.memberships.find((m) => m.groupId === groupId)
    if (!membership) throw new Error('errors:notMember')
    if (membership.memberId === this.state.activeMemberId) return
    throw Object.assign(new Error('errors:notAvailable'), {
      errorKey: 'errors.notAvailable',
    })
  }
}

async function docsOf<T>(snapshot: QuerySnapshot<DocumentData>): Promise<T[]> {
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as T)
}

type GroupRow = GroupDoc & { id: string }

/**
 * Account + governance actions that exist in the demo store but have no Cloud
 * Function yet. They are marked unavailable until the security phase: calling
 * one never reaches Firebase, and the UI surfaces `errors.notAvailable` as a
 * toast instead of failing silently.
 */
const SECURITY_PHASE_ACTIONS: ReadonlySet<ActionName> = new Set<ActionName>([
  'changeRole',
  'updateProfile',
  'updateGroup',
  'changePin',
  'deleteAccount',
  'markAnomalyReviewed',
])

class FirebaseData implements DataLayer {
  readonly mode = 'firebase' as const

  subscribeGroup(groupId: string, handlers: SubscriptionHandlers): Unsubscribe {
    const { db } = firebase()
    const unsubscribers: Unsubscribe[] = []

    unsubscribers.push(
      onSnapshot(
        doc(db, COLLECTIONS.groups, groupId),
        (snap) => {
          const row = snap.exists()
            ? ({ id: snap.id, ...(snap.data() as object) } as unknown as GroupRow)
            : null
          handlers.group(row)
        },
        (error) => handlers.error('group', error),
      ),
    )

    const scoped = (name: string) => query(collection(db, name), where('groupId', '==', groupId))

    unsubscribers.push(
      onSnapshot(
        scoped(COLLECTIONS.members),
        async (snap) => handlers.members(await docsOf(snap)),
        (error) => handlers.error('members', error),
      ),
      onSnapshot(
        query(scoped(COLLECTIONS.petitions), orderBy('createdAt', 'desc')),
        async (snap) => handlers.petitions(await docsOf(snap)),
        (error) => handlers.error('petitions', error),
      ),
      onSnapshot(
        query(scoped(COLLECTIONS.announcements), orderBy('createdAt', 'desc')),
        async (snap) => handlers.announcements(await docsOf(snap)),
        (error) => handlers.error('announcements', error),
      ),
      onSnapshot(
        query(scoped(COLLECTIONS.chatMessages), orderBy('createdAt', 'asc')),
        async (snap) => handlers.chatMessages(await docsOf(snap)),
        (error) => handlers.error('chatMessages', error),
      ),
      onSnapshot(
        query(scoped(COLLECTIONS.loans), where('status', '==', 'active')),
        async (snap) => handlers.loans(await docsOf(snap)),
        (error) => handlers.error('loans', error),
      ),
      onSnapshot(
        query(scoped(COLLECTIONS.auditLogs), orderBy('timestamp', 'desc')),
        async (snap) => handlers.auditLogs(await docsOf(snap)),
        (error) => handlers.error('auditLogs', error),
      ),
    )

    return () => unsubscribers.forEach((u) => u())
  }

  async call<K extends ActionName>(
    action: K,
    payload: ActionPayload[K],
  ): Promise<ActionReturns[K]> {
    const { functions } = firebase()
    const fn = httpsCallable<ActionPayload[K], ActionReturns[K]>(functions, action)
    let result: HttpsCallableResult<ActionReturns[K]>
    try {
      if (SECURITY_PHASE_ACTIONS.has(action)) {
        // No Cloud Function exists for this action yet. Throw with a designed
        // error key rather than calling a function that is not deployed.
        throw Object.assign(new Error('errors:notAvailable'), {
          errorKey: 'errors.notAvailable',
        })
      }
      result = await fn(payload)
    } catch (error) {
      // Cloud Functions report failures as { errorKey }; surface them as-is so
      // the UI keeps its designed error copy instead of a stack trace.
      const details = (error as { details?: { errorKey?: string } }).details
      const own = (error as { errorKey?: string }).errorKey
      const errorKey = details?.errorKey ?? own
      if (errorKey) return { ok: false, errorKey } as ActionReturns[K]
      throw error
    }
    return result.data
  }
}

/** Lazily-created singletons — never touch Firebase at import time. */
let authLayer: FirebaseAuthLayer | null = null
let dataLayer: FirebaseData | null = null

export function getFirebaseAuth(): FirebaseAuthLayer {
  return (authLayer ??= new FirebaseAuthLayer())
}

export function getFirebaseData(): FirebaseData {
  return (dataLayer ??= new FirebaseData())
}
