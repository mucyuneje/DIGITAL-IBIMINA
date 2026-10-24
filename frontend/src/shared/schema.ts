/**
 * Ibimina shared data model — THE single source of truth.
 *
 * Imported by the React UI *and* by the Cloud Functions (functions/src/**).
 * Never hand-duplicate a field name on either side; if it is not in here,
 * it does not exist in the database.
 */

export const COLLECTIONS = {
  groups: 'groups',
  members: 'members',
  petitions: 'petitions',
  announcements: 'announcements',
  chatMessages: 'chatMessages',
  loans: 'loans',
  auditLogs: 'auditLogs',
  /** Server-only. Clients may never read or write this collection. */
  memberCredentials: 'memberCredentials',
  /**
   * Server-maintained index: one document per signed-in user listing the
   * groups they belong to. Readable by its owner only; written by functions.
   */
  memberships: 'memberships',
  /** Server-only. MoMo payment requests and their confirmation state. */
  paymentIntents: 'paymentIntents',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

export const READABLE_BY_CLIENT: CollectionName[] = [
  COLLECTIONS.groups,
  COLLECTIONS.members,
  COLLECTIONS.petitions,
  COLLECTIONS.announcements,
  COLLECTIONS.chatMessages,
  COLLECTIONS.loans,
  COLLECTIONS.auditLogs,
];

/* ------------------------------------------------------------------ people */

export type Role = 'president' | 'treasurer' | 'secretary' | 'member';

export const OFFICE_ROLES = ['president', 'treasurer', 'secretary'] as const;
export type OfficeRole = (typeof OFFICE_ROLES)[number];

export function isOfficer(role: Role): boolean {
  return role !== 'member';
}

/** Members per Ikimina, informally capped to match real savings groups. */
export const MEMBER_CAP = 30;
export const MIN_MEMBERS_FOR_OFFICER_QUORUM = 4;

/* ------------------------------------------------------------------ groups */

export type Language = 'rw' | 'en' | 'fr';

export interface GroupDoc {
  id: string;
  name: string;
  /** Monthly contribution in RWF — prefills the deposit form. */
  contributionAmount: number;
  memberCap: number;
  inviteCode: string;
  /** 1-based cycle counter; each cycle ends in one payout. */
  currentCycle: number;
  /** Member id of the member who receives this cycle's payout. */
  currentRecipientId: string | null;
  /** Member ids in payout order; index 0 is this cycle's slot. */
  rotationOrder: string[];
  vaultBalance: number;
  status: 'active' | 'closed';
  createdAt: number;
  createdBy: string;
}

export interface MemberDoc {
  id: string;
  /**
   * Firebase Auth uid that owns this membership. Absent in the demo store,
   * where the member id *is* the identity.
   */
  uid?: string;
  groupId: string;
  phone: string;
  name: string;
  role: Role;
  /** 1-based position in `group.rotationOrder`. */
  rotationPosition: number;
  joinedAt: number;
}

/**
 * One group a person belongs to. The backend keeps one member document per
 * (person × group) and indexes them here, so a phone can serve several
 * Ikimina at once (R59).
 */
export interface MembershipEntry {
  groupId: string;
  /** Id of the member document in `members` for this group. */
  memberId: string;
  role: Role;
  groupName?: string;
  joinedAt: number;
}

/** Server-maintained index document — one per signed-in uid. */
export interface MembershipDoc {
  id: string;
  uid: string;
  /** Every group id this uid may read. Drives the security rules. */
  groupIds: string[];
  memberships: MembershipEntry[];
  updatedAt: number;
}

/**
 * Rwanda is the only market, so the dial code is fixed in the UI and phone
 * numbers are stored once in E.164. Members type (and read) the national
 * 9-digit number after +250: 788 123 456.
 */
export const RWANDA_DIAL_CODE = '+250';

/** National significant number, without +250 or the old leading 0. */
export const RWANDA_PHONE_RE = /^(?:72|73|78|79)\d{7}$/;

/**
 * Extracts the national mobile number from anything a member might type or
 * paste: 0788…, 788…, +250 788…, 00250 788…, or a canonical +250 value.
 */
export function rwandanNationalNumber(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00250')) digits = digits.slice(5);
  else if (digits.startsWith('250') && digits.length > 9) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 9);
}

/** Canonical storage format: +250 followed by the 9 national digits. */
export function normalizePhone(raw: string): string {
  const national = rwandanNationalNumber(raw);
  return national ? `${RWANDA_DIAL_CODE}${national}` : '';
}

export function isValidRwandanPhone(raw: string): boolean {
  return RWANDA_PHONE_RE.test(rwandanNationalNumber(raw));
}

/** Friendly grouped national form used inside the +250 input. */
export function formatRwandanNational(raw: string): string {
  const national = rwandanNationalNumber(raw);
  if (national.length <= 3) return national;
  if (national.length <= 6) return `${national.slice(0, 3)} ${national.slice(3)}`;
  return `${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}

/** Full display form: +250 788 123 456. */
export function formatRwandanPhone(raw: string): string {
  const national = rwandanNationalNumber(raw);
  return national ? `${RWANDA_DIAL_CODE} ${formatRwandanNational(national)}` : '';
}

/**
 * Privacy-safe display for ordinary members: the prefix and last three digits
 * stay visible so a member can still recognise their own number.
 */
export function maskRwandanPhone(raw: string): string {
  const national = rwandanNationalNumber(raw);
  if (!national) return '';
  if (!RWANDA_PHONE_RE.test(national)) return `${RWANDA_DIAL_CODE} ••• •••`;
  return `${RWANDA_DIAL_CODE} ${national.slice(0, 2)}• ••• ${national.slice(-3)}`;
}

export const PIN_LENGTH = 5;
export const PIN_RE = /^\d{5}$/;

/* -------------------------------------------------------------- petitions */

export type PetitionStatus = 'open' | 'approved' | 'rejected' | 'expired' | 'paid';

/**
 * `cycle_payout` is the round's scheduled payout to the member whose turn it
 * is; settling it advances the cycle and moves the vault to the next member.
 * `withdrawal` is any other group-approved spend and leaves the rotation alone.
 */
export type PetitionKind = 'withdrawal' | 'cycle_payout';

export interface VoteEntry {
  memberId: string;
  memberName: string;
  role: Role;
  choice: 'yes' | 'no';
  at: number;
}

export interface PetitionDoc {
  id: string;
  groupId: string;
  kind: PetitionKind;
  title: string;
  detail: string;
  amount: number;
  recipientName?: string;
  recipientPhone?: string;
  status: PetitionStatus;
  createdBy: string;
  createdByName: string;
  createdByRole: Role;
  createdAt: number;
  expiresAt: number;
  votes: VoteEntry[];
  /** Snapshot of `requiredApprovals(totalMembers)` at creation time. */
  requiredApprovals: number;
  /** Snapshot of the roster size when the petition was opened. */
  totalMembersAtCreation: number;
  decidedAt: number | null;
  paidAt: number | null;
  /** Ledger TXN id written when the payout was executed. */
  txnId: string | null;
}

export const PETITION_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

/* --------------------------------------------------- bulletin (one feed) */

export type BulletinType = 'announcement' | 'minutes' | 'attendance';
export type BulletinTag = 'urgent' | 'normal' | 'event';

export interface MinutesBlock {
  meetingDate: number;
  agenda: string[];
  resolutions: string[];
  nextActions: string[];
}

export interface AttendanceEntry {
  memberId: string;
  name: string;
  present: boolean;
}

export interface AttendanceBlock {
  meetingDate: number;
  entries: AttendanceEntry[];
  presentCount: number;
}

export interface AnnouncementDoc {
  id: string;
  groupId: string;
  type: BulletinType;
  tag: BulletinTag;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  createdAt: number;
  minutes?: MinutesBlock;
  attendance?: AttendanceBlock;
}

/* -------------------------------------------------------------------- chat */

export interface ChatMessageDoc {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  text: string;
  createdAt: number;
}

/* ------------------------------------------------------------------ loans */

export type LoanStatus = 'active' | 'repaid';

export interface LoanDoc {
  id: string;
  groupId: string;
  borrowerId: string;
  borrowerName: string;
  principal: number;
  /** 5% for the pilot — see STRATEGY note in functions/src/loans.ts. */
  interestRate: number;
  termDays: 30 | 60;
  totalDue: number;
  issuedById: string;
  issuedByName: string;
  issuedByRole: Role;
  issuedAt: number;
  dueAt: number;
  status: LoanStatus;
  repaidAt: number | null;
  repaidById: string | null;
  txnId: string | null;
}

export const LOAN_INTEREST_RATE = 0.05;

export function loanTotalDue(principal: number, interestRate = LOAN_INTEREST_RATE): number {
  return Math.round(principal * (1 + interestRate));
}

/* ---------------------------------------------------------- audit ledger */

export type AuditEntryType =
  | 'deposit'
  | 'payout'
  | 'loan_issue'
  | 'loan_repay'
  | 'penalty'
  | 'cash_entry'
  | 'role_change'
  | 'group_rule_change';

export const AUDIT_ENTRY_TYPES: AuditEntryType[] = [
  'deposit',
  'payout',
  'loan_issue',
  'loan_repay',
  'penalty',
  'cash_entry',
  'role_change',
  'group_rule_change',
];

export interface AuditLogDoc {
  id: string;
  groupId: string;
  txnId: string;
  type: AuditEntryType;
  amount: number;
  initiatorId: string;
  initiatorName: string;
  initiatorRole: Role;
  detail: string;
  timestamp: number;
  /** True when the action was confirmed with the member's 5-digit PIN. */
  pinVerified: boolean;
  /** Vault balance immediately after this entry, in RWF. */
  balanceAfter: number;
  /** Optional pointer to the petition / loan / deposit that caused it. */
  relatedId: string | null;
}

/* ------------------------------------------------- server-only credentials */

/**
 * Held only in Firestore, readable solely by the Admin SDK inside Cloud
 * Functions. Security rules deny *all* client access to this collection.
 */
export interface MemberCredentialDoc {
  id: string;
  memberId: string;
  groupId: string;
  /** Salted hash (bcrypt). Never a plain PIN, never logged, never shipped. */
  pinHash: string;
  failedAttempts: number;
  lockedUntil: number | null;
  updatedAt: number;
}

/* ------------------------------------------------------------- MoMo payments */

/**
 * A deposit is a *request* first and a movement of money second. The vault and
 * the ledger are only touched once the provider confirms the payment.
 */
export type PaymentStatus = 'requested' | 'confirmed' | 'failed';

/**
 * Server-only record of one payment request. Clients never read this
 * collection — they learn the state from the callable's answer.
 */
export interface PaymentIntentDoc {
  id: string;
  groupId: string;
  memberId: string;
  memberName: string;
  amount: number;
  /** The MoMo number the money is sent from. */
  phone: string;
  provider: 'momo';
  /** Provider-side reference — the sandbox generates it, the rails return it. */
  providerRef: string;
  status: PaymentStatus;
  /** Set when the payment was confirmed — the ledger transaction id. */
  txnId: string | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

/* --------------------------------------------------------------- helpers */

export interface TxnResult {
  ok: boolean;
  txnId?: string;
  error?: string;
  /** i18n key, e.g. `errors.pinIncorrect`. */
  errorKey?: string;
}
