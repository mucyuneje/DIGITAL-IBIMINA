/**
 * The contract every data backend implements.
 *
 * There are exactly two implementations:
 *   - `firestore.ts` — the real Firebase backend (Auth + Firestore + Functions)
 *   - `demo.ts`      — in-browser demo data so the UI is fully explorable
 *                      before a Firebase project is created.
 *
 * Screens never import either of them directly; they use `useData()` /
 * `useAuth()` from the state layer.
 */
import type {
  AnnouncementDoc,
  AuditLogDoc,
  ChatMessageDoc,
  GroupDoc,
  LoanDoc,
  MemberDoc,
  PetitionDoc,
  Role,
  TxnResult,
  VoteEntry,
  Language,
  PaymentStatus,
} from '@shared/schema'

export type Unsubscribe = () => void

export type CollectionKey =
  | 'group'
  | 'members'
  | 'petitions'
  | 'announcements'
  | 'chatMessages'
  | 'loans'
  | 'auditLogs'

export interface SubscriptionHandlers {
  group: (group: GroupDoc | null) => void
  members: (rows: MemberDoc[]) => void
  petitions: (rows: PetitionDoc[]) => void
  announcements: (rows: AnnouncementDoc[]) => void
  chatMessages: (rows: ChatMessageDoc[]) => void
  loans: (rows: LoanDoc[]) => void
  auditLogs: (rows: AuditLogDoc[]) => void
  error: (key: CollectionKey, error: unknown) => void
}

/* ------------------------------------------------------------------ auth */

export interface AuthSession {
  /** Firebase auth uid (member document id). */
  uid: string
  memberId: string
  groupId: string
  role: Role
  name: string
  phone: string
}

/**
 * One group a signed-in phone belongs to (R59). The flat `members`
 * collection holds one document per group the phone is a member of, so a
 * membership is simply "this member document in that group".
 */
export interface Membership {
  groupId: string
  memberId: string
  /** Denormalised so the switcher can list groups without another read. */
  groupName?: string
}

export interface AuthState {
  /** False until the persisted session has been restored. */
  ready: boolean
  uid: string | null
  /** Phone number that passed OTP but has not joined a group yet. */
  verifiedPhone: string | null
  session: AuthSession | null
  /** Every group the signed-in phone belongs to. */
  memberships: Membership[]
  /** Member id of the membership the session is currently bound to. */
  activeMemberId: string | null
}

export interface AuthLayer {
  getState(): AuthState
  subscribe(cb: (state: AuthState) => void): Unsubscribe
  requestOtp(phone: string): Promise<void>
  confirmOtp(code: string): Promise<void>
  /** Re-reads the member document after Create/Join creates it. */
  refresh(): Promise<void>
  signOut(): Promise<void>
  /** Binds the session to another membership of the same phone (R59). */
  switchGroup(groupId: string): Promise<void>
}

/* --------------------------------------------------------------- actions */

export interface CreateGroupPayload {
  groupName: string
  contributionAmount: number
  name: string
  phone: string
  pin: string
  preferredLanguage: Language
}

export interface JoinGroupPayload {
  inviteCode: string
  name: string
  phone: string
  pin: string
  preferredLanguage: Language
}

export interface DepositPayload {
  groupId: string
  memberId: string
  amount: number
  momoNumber: string
  pin: string
  /**
   * Continues a payment that is still pending: the server polls the provider
   * with this reference and answers with the new state. Omitted for a first
   * request.
   */
  paymentRef?: string
}

export interface CreatePetitionPayload {
  groupId: string
  memberId: string
  title: string
  detail: string
  amount: number
  recipientName?: string
  recipientPhone?: string
  pin: string
}

export interface VotePayload {
  groupId: string
  memberId: string
  petitionId: string
  choice: VoteEntry['choice']
  pin: string
}

export interface AnnouncementPayload {
  groupId: string
  memberId: string
  type: AnnouncementDoc['type']
  tag: AnnouncementDoc['tag']
  title: string
  body: string
  minutes?: AnnouncementDoc['minutes']
  attendance?: AnnouncementDoc['attendance']
  pin: string
}

export interface LoanPayload {
  groupId: string
  memberId: string
  borrowerId: string
  principal: number
  termDays: 30 | 60
  pin: string
}

export interface RepayLoanPayload {
  groupId: string
  memberId: string
  loanId: string
  pin: string
}

export interface PenaltyPayload {
  groupId: string
  memberId: string
  targetMemberId: string
  amount: number
  reason: string
  pin: string
}

export interface ChatPayload {
  groupId: string
  memberId: string
  text: string
}

export interface PinPayload {
  groupId: string
  memberId: string
  pin: string
}

/**
 * Account + governance actions (security phase). Role and group-rule changes
 * write a zero-amount audit entry; profile changes do not move money. The PIN
 * gate is applied by the UI and verified again by the backend. `changePin`
 * carries its own current PIN for verification.
 */
export interface ChangeRolePayload {
  /** The President performing the change. */
  actorId: string
  memberId: string
  newRole: Role
  pin: string
}

export interface UpdateProfilePayload {
  memberId: string
  name: string
  phone: string
  /** Required when the phone number changes (rule 329). */
  pin?: string
  /** Demo verification code for the new phone; production uses a server challenge. */
  otp?: string
}

export interface UpdateGroupPayload {
  groupId: string
  /** The officer performing the change. */
  actorId: string
  name: string
  monthlyContribution: number
  pin: string
}

export interface ChangePinPayload {
  memberId: string
  currentPin: string
  newPin: string
}

export interface DeleteAccountPayload {
  memberId: string
}

export interface MarkAnomalyReviewedPayload {
  anomalyId: string
  /** The group the flag belongs to; defaults to the caller's first group. */
  groupId?: string
}

export interface ActionReturns {
  verifyPin: TxnResult
  createGroup: TxnResult & { groupId?: string; inviteCode?: string }
  joinGroup: TxnResult & { groupId?: string }
  recordDeposit: TxnResult & {
    /** `requested` = the money is still on its way, `confirmed` = credited. */
    status?: PaymentStatus
    /** Reference of a still-pending payment, to poll with. */
    paymentRef?: string
  }
  createPetition: TxnResult & { petitionId?: string; status?: PetitionDoc['status'] }
  castVote: TxnResult & { status?: PetitionDoc['status'] }
  postAnnouncement: TxnResult
  issueLoan: TxnResult & { loanId?: string }
  repayLoan: TxnResult
  recordPenalty: TxnResult
  postMessage: TxnResult
  runRotationLottery: TxnResult
  changeRole: TxnResult
  updateProfile: TxnResult
  updateGroup: TxnResult
  changePin: TxnResult
  deleteAccount: TxnResult
  markAnomalyReviewed: TxnResult
}

export type ActionName = keyof ActionReturns

export interface ActionPayload {
  verifyPin: PinPayload
  createGroup: CreateGroupPayload
  joinGroup: JoinGroupPayload
  recordDeposit: DepositPayload
  createPetition: CreatePetitionPayload
  castVote: VotePayload
  postAnnouncement: AnnouncementPayload
  issueLoan: LoanPayload
  repayLoan: RepayLoanPayload
  recordPenalty: PenaltyPayload
  postMessage: ChatPayload
  runRotationLottery: PinPayload
  changeRole: ChangeRolePayload
  updateProfile: UpdateProfilePayload
  updateGroup: UpdateGroupPayload
  changePin: ChangePinPayload
  deleteAccount: DeleteAccountPayload
  markAnomalyReviewed: MarkAnomalyReviewedPayload
}

export interface DataLayer {
  readonly mode: 'firebase' | 'demo'
  /** One live listener per collection, all filtered to the member's group. */
  subscribeGroup(groupId: string, handlers: SubscriptionHandlers): Unsubscribe
  call<K extends ActionName>(
    action: K,
    payload: ActionPayload[K],
  ): Promise<ActionReturns[K]>
}

export type { Language }
