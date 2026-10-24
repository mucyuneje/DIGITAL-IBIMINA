# Ibimina — Implementation Plan to Full Pitch-Book Parity

Input: `docs/PITCH_BOOK_REQUIREMENTS.md` (R-numbers), `docs/GAP_ANALYSIS.md` (statuses, bugs B1–B14).
Stack (unchanged): Next.js App Router + TypeScript + Tailwind + shadcn/ui, demo services layer with a Firestore-shaped backend later. Every task below cites the files to create/edit.

Conventions for all phases:
- Derive every figure from `lib/cycle.ts` + the audit ledger — never hard-code statuses, totals or round numbers.
- Every money action keeps the invariant: **one vault change ⇔ one `auditLogs` row** (txnId, pinVerified, balanceAfter, initiator, timestamp).
- shadcn/ui only; brand SVGs in `@/components/icons`; all new copy goes through i18n keys in **all three** locales (`en`, `rw`, `fr`) — no hardcoded user-facing English.
- Verify with `npx tsc --noEmit`, `npm run lint`, `npx next build`, plus a Playwright smoke pass at 375 / 768 / 1440 px.

---

## Phase 1 — "Now": money safety & ledger correctness (ch.14 items 1–4)

Goal: nothing in the app can move money without a matching immutable ledger row; balances survive concurrency; the multi-sig and ledger screens tell the exact truth.

### P1-1 · Transactional writes in the demo data layer  *(R56, R53, B4)* — **L**
- **Goal**: eliminate the read-then-write window (`get()` → `await requirePin()` → mutate) so two interleaved actions cannot clobber each other; make the commit path the single mutation point.
- **Files**: `src/services/demo.ts`, `src/services/demoDb.ts`.
- **Behaviour**: restructure every action to (1) verify PIN *without* holding a stale snapshot, (2) re-read state immediately before mutation, (3) mutate + `pushLedger` + validate `vaultBalance >= 0`, (4) commit once. Add a per-tab mutex (promise chain) around steps 2–4. Add a `withTransaction(fn)` helper that runs read-validate-write under the mutex and is used by all five money actions.
- **Acceptance**: `vaultBalance` never negative under any interleaving; a failing validation inside the transaction writes nothing; unit-style Playwright test deposits twice concurrently → both ledger rows exist and balance = start + a + b.
- **Deps**: none. **Size**: L.

### P1-2 · Cross-tab live sync (BroadcastChannel)  *(R49, B4)* — **M**
- **Goal**: "a deposit by one member appears on every other member's screen" holds for two tabs on the same device.
- **Files**: `src/services/demoDb.ts`, `src/services/demo.ts`.
- **Behaviour**: after `saveDb`, post `{type:'commit', groupId}` on a `BroadcastChannel('ibimina.demo')`; listeners re-read + `pushSnapshot`; also listen to `window.storage` as fallback. Guard against echo loops (compare revision counter stored in the DB blob).
- **Acceptance**: tab A deposit → tab B vault, checklist and ledger update within ~1s without refresh; no update storms (channel messages ≤ 2 per commit).
- **Deps**: P1-1 (revision counter). **Size**: M.

### P1-3 · Ledger table: Initiated-by + Verified columns  *(R42)* — **S**
- **Goal**: PC table matches p.19: TXN ID · Type · Initiated by · Details · Verified (PIN ✔) · Amount — keep Balance-after and Date as extra columns.
- **Files**: `src/screens/Ledger.tsx`, locale files.
- **Behaviour**: add initiator column (avatar+name, hidden below `md` where the table scrolls), add a `PIN ✔` / `System` badge column from `pinVerified`. Column header copy per pitch.
- **Acceptance**: at 1440px all 8 columns visible without page overflow; at 375px table scrolls inside its container only; badge reads "PIN ✔" for all seeded rows.
- **Deps**: none. **Size**: S.

### P1-4 · Repay button on the ledger list  *(R43)* — **S**
- **Goal**: phone parity with p.18 — "Repay my loan" appears on the ledger screen when the signed-in member has an active loan.
- **Files**: `src/screens/Ledger.tsx`, locale files.
- **Behaviour**: if `loans` contains an active loan for `session.memberId`, render a card above the table (title, total due, due date, "Pay now" → existing `PinGateModal` → `call('repayLoan')`). Reuse the logic from `LedgerDetail.tsx:73-96`.
- **Acceptance**: borrower sees the card and can repay (PIN-gated); non-borrowers never see it; after repayment the card disappears and a `loan_repay` row appears.
- **Deps**: none. **Size**: S.

### P1-5 · Quorum settle hardening  *(R28, R23)* — **S**
- **Goal**: a petition that reaches quorum but fails the balance check must not silently sit at "open"; votes must recompute from the engine everywhere.
- **Files**: `src/services/demo.ts` (`settle`), `src/screens/Withdrawals.tsx`, `src/screens/WithdrawalDetail.tsx`.
- **Behaviour**: inside the P1-1 transaction, if quorum reached but `amount > vaultBalance`, mark petition `rejected` with reason key `petitions.settleInsufficient`; UI shows "Rejected — vault too small at quorum" instead of a stuck voting card. All tally UI keeps using `computeQuorum`.
- **Acceptance**: seed a petition for more than the vault, vote to quorum → status flips to rejected with explanation; ledger unchanged.
- **Deps**: P1-1. **Size**: S.

### P1-6 · Home: red urgent banner  *(R7)* — **S**
- **Goal**: banner is red and pulsing, only when I haven't voted on an active petition.
- **Files**: `src/screens/Home.tsx`, `src/app/globals.css` (add `pulse` keyframe if missing), locales.
- **Behaviour**: swap `border-pending bg-pending-bg` for `border-danger bg-danger-bg` + `animate-pulse` on the icon; copy `home.urgentOpen` rewritten to pitch wording ("Your vote is needed: {{title}}, {{amount}} RWF — open Multi-Sig →"); whole banner links to `/withdrawals`.
- **Acceptance**: un-voted open petition → red pulsing banner linking to the petition; after voting, banner gone; no banner when no open petitions.
- **Deps**: none. **Size**: S.

### P1-7 · Home: cycle progress inside the vault card  *(R8)* — **S**
- **Goal**: p.8 vault card = balance + "X of Y collected" + progress bar in one card.
- **Files**: `src/screens/Home.tsx`.
- **Behaviour**: move the `Progress` + collected/target text from the "Who has paid" card into the green vault card; keep the checklist card focused on members.
- **Acceptance**: vault card shows balance, cycle number, "collected of target" bar; checklist card lists members with Paid/Partial/Not paid only.
- **Deps**: none. **Size**: S.

### P1-8 · Next-payout date  *(R9)* — **S**
- **Goal**: "Round n · 15 Nov" on Home and Rotation.
- **Files**: `src/services/demo.ts` (set `nextPayoutDate` on cycle-advancing writes), `src/shared/schema.ts` (promote `nextPayoutDate?: number` on `GroupDoc`), `src/screens/Home.tsx`, `src/screens/Rotation.tsx`, seed `demoDb.ts`.
- **Behaviour**: `groups.nextPayoutDate` = end of current month at creation and after each payout (`Date` math, timezone `Africa/Kigali`); displayed via `formatDate`. If absent, hide the date gracefully.
- **Acceptance**: Home next-payout card and Rotation header show a real future date; after a payout the date advances one month.
- **Deps**: none. **Size**: S.

### P1-9 · Withdrawal card: recipient + pitch wording  *(R22, R13, R30)* — **S**
- **Goal**: petition cards show recipient like p.12; button labels match the pitch.
- **Files**: `src/screens/Withdrawals.tsx`, locales.
- **Behaviour**: add "Recipient: {{name}}" line under the detail on the card; rename `home.proposeWithdrawal` → "New withdrawal request", `petitions.new` → "+ New withdrawal" per pitch; keep search/filters.
- **Acceptance**: card shows amount, reason, recipient, proposer, tally; new copy in all three locales.
- **Deps**: none. **Size**: S.

### P1-10 · Fix known bugs B1–B4, B7, B9  *(quality gate for Phase 1)* — **M**
- **Files**: `settings/SettingsHub.tsx` (delete duplicate group card `:138-166`), `i18n/index.ts` (drop `_plural` keys, use i18next v4 `_one/_other` in all locales; fix `Home.tsx:147`), `screens/Deposit.tsx` (prefill effect keyed on `group?.contributionAmount`), `desk/Announce.tsx` (wire real error state or delete), `Withdrawals.tsx` (delete dead TONE keys), `app-shell.tsx:174` (`font-600` → `font-500`).
- **Acceptance**: one group card on /settings; "2 open petitions" pluralises correctly in EN/RW/FR; cold /deposit load prefills the true contribution; lint clean.
- **Deps**: none. **Size**: M.

### P1-11 · Prepare security-rules contract (no deploy yet)  *(R54, R56 groundwork)* — **M**
- **Goal**: a reviewed `firestore.rules` + callable-function contract restored from git history and updated to the current `schema.ts`, ready for the backend phase.
- **Files**: restore `firestore.rules`, `firestore.indexes.json`, `firebase.json` from git history into repo root; add `docs/SECURITY_MODEL.md` describing: membership check, quorum enforcement server-side, `memberCredentials` deny-all, ledger immutability (no update/delete).
- **Acceptance**: rules file compiles with `firebase emulators` config present; every collection in `COLLECTIONS` has an explicit allow/deny rule; document lists each callable function and its server-side checks.
- **Deps**: P1-1 (transaction semantics documented). **Size**: M.

**Phase 1 exit**: R56 (demo), R42, R43, R7, R8, R9, R22, R28 hardened, B1–B4 fixed; `tsc`/lint/build green; Playwright money-path suite passes.

---

## Phase 2 — "Now/Next": daily-use polish, navigation, language, multi-group

Goal: the app *looks and navigates* like the pitch book on phone and PC, and daily use is smooth (sessions already persist; multi-group and translations land here).

### P2-1 · Mobile bottom tabs — the pitch five  *(R14, navigation)* — **M**
- **Goal**: phone bottom bar = Home · Multi-Sig · Exec Desk (officers) / Bulletin · Bulletin · Audit, per p.1/8.
- **Files**: `src/components/app-shell.tsx`, locales.
- **Behaviour**: replace `mobileNav` (`app-shell.tsx:104-110`) with Home `/`, Multi-Sig `/withdrawals`, Exec Desk `/desk` (officers) or Bulletin `/bulletin` (members — pitch shows Exec Desk for all but your gate is officer-only; members get Bulletin in that slot), Bulletin `/bulletin`, Audit `/ledger`. Move Deposit to a raised gold FAB **above** the tab bar (already the pattern, `:282-283`) or into Home only; move Settings behind the avatar (top bar). Keep the officer gate: members tapping Exec Desk land on Bulletin, never /403.
- **Acceptance**: at 375px exactly five tappable tabs + FAB; every tab target reachable; officer vs member tab sets differ only in the Exec Desk slot; no overflow.
- **Deps**: none. **Size**: M.

### P2-2 · Phone header + PC sidebar: invite code & language  *(R14, R15)* — **M**
- **Goal**: pitch frames show invite code and RW·EN·FR in the phone header and sidebar blocks.
- **Files**: `src/components/app-shell.tsx`, new small component `src/components/language-switch.tsx`, locales.
- **Behaviour**: mobile header adds a compact invite-code chip (`IBI-…`, tap-to-copy, from `group.inviteCode`) and a compact RW/EN/FR segmented control (`ToggleGroup`, persists via existing `setLanguage`). Desktop sidebar adds two bordered blocks under the nav: "Invite code {{code}}" (copy button) and "Language" with the same segmented control.
- **Acceptance**: both blocks render with real group data; switching language updates the UI instantly and survives refresh; copy affordance shows a toast.
- **Deps**: none. **Size**: M.

### P2-3 · Invite codes get the `IBI-` prefix  *(R3)* — **S**
- **Goal**: codes look like the pitch's `IBI-482913`.
- **Files**: `src/shared/ledger.ts` (`makeInviteCode` → `IBI-` + 6 digits/chars), `src/services/demoDb.ts` (seed `IBI-482913` or a generated equivalent), `src/screens/welcome/Join.tsx` (placeholder `IBI-000000`, max length 10, strip prefix before compare), `demo.ts:463-465` (match with/without prefix).
- **Acceptance**: create a group → code shown as `IBI-XXXXXX`; join works with and without typing the prefix; seeded group uses the new format.
- **Deps**: none. **Size**: S.

### P2-4 · Bulletin cards: colour-coded left border  *(R35)* — **S**
- **Goal**: p.16 look — urgent red / event blue / normal-neutral left accent on announcement cards; minutes/attendance get a green-tint accent.
- **Files**: `src/screens/Bulletin.tsx`, `src/components/ui/card.tsx` (no change needed — use classes).
- **Behaviour**: `border-l-4` with `border-l-danger` / `border-l-info` / `border-l-line` / `border-l-green` per `typeTone`; keep existing badges.
- **Acceptance**: each priority visibly distinct; minutes/attendance cards styled consistently; no layout shift.
- **Deps**: none. **Size**: S.

### P2-5 · "Live" pill  *(R12)* — **S**
- **Goal**: green-dot "Live" pill on Home and Bulletin headers, per p.9/17.
- **Files**: `src/screens/Home.tsx`, `src/screens/Bulletin.tsx`, locales (`home.live`, `bulletin.live`).
- **Behaviour**: `<Badge variant="outline" className="gap-1.5"><span className="size-1.5 rounded-full bg-success animate-pulse"/>{t('home.live')}</Badge>` at the header right; demo note nearby already explains local mode.
- **Acceptance**: pill visible on both screens at all breakpoints; translates in all three languages.
- **Deps**: none. **Size**: S.

### P2-6 · Executive Desk two-pane  *(R32, R30 wording)* — **L**
- **Goal**: PC desk = tool list left, active tool form right (p.15); phone keeps the card grid. Tool titles per pitch.
- **Files**: new `src/app/(app)/desk/layout.tsx` or restructure `src/screens/desk/DeskHub.tsx`; keep sub-routes working on phone via the same components.
- **Behaviour**: on `lg`, `/desk` renders a master list (five tools, "Selected" gold highlight like p.15) and the selected tool inline; sub-routes remain deep-linkable (list highlights current). On phone, existing grid + routes. Rename cards: "Emergency loan", "Rotation lottery" + pitch subtitles ("30 / 60 days · 5% interest", "Re-shuffle payout order", …) and add the "Officers only · PIN required" header line.
- **Acceptance**: at 1080p selecting a tool swaps the right pane without navigation loss; deep links still work; phone unchanged apart from wording; officer gate intact.
- **Deps**: none. **Size**: L.

### P2-7 · Quick loan preview  *(R31)* — **S**
- **Goal**: instant Principal → Interest 5% → Total due calculator on the desk (phone mockup card; show on all sizes).
- **Files**: `src/screens/desk/DeskHub.tsx`, locales.
- **Behaviour**: read-only-until-typed three-row card using `loanTotalDue` (`shared/schema.ts:223`); default principal 100,000 → 5,000 → 105,000; links to the loan tool.
- **Acceptance**: typing a principal updates interest/total live; numbers match the loan form's maths exactly.
- **Deps**: none. **Size**: S.

### P2-8 · PIN keypad component  *(R20, Suggestion-level pitch detail)* — **M**
- **Goal**: `PinGateModal` gains a 3×4 keypad (1–9, 0, ⌫) matching p.11, while keeping the OTP-slot input for keyboard users.
- **Files**: `src/components/pin-gate.tsx` (new `PinKeypad` internal), locales.
- **Behaviour**: keypad buttons fill slots; auto-submit on 5th digit (existing behaviour `pin-gate.tsx:111`); digits accessible via keyboard.
- **Acceptance**: deposit/vote/loan PIN dialogs show the keypad at all breakpoints; flow unchanged otherwise; a11y labels present.
- **Deps**: none. **Size**: M.

### P2-9 · Withdrawal detail two-column (voter table)  *(R29)* — **S**
- **Goal**: PC shows petition summary + voter table side by side (p.13).
- **Files**: `src/screens/WithdrawalDetail.tsx`.
- **Behaviour**: wrap summary/actions and the voter list in `grid lg:grid-cols-[1.4fr_1fr] gap-6`; voter rows in a shadcn `Table` on `lg` (MEMBER / ROLE / VOTE headers, "Waiting" for non-voters), stacked cards on phone.
- **Acceptance**: at 1440px both panes visible; phone unchanged; votes update live.
- **Deps**: none. **Size**: S.

### P2-10 · Multi-group membership  *(R59, R52)* — **L**
- **Goal**: one phone number can belong to several groups; the session picks one and can switch.
- **Files**: `src/services/demo.ts` (session = `{memberIds:[…], activeMemberId}`; `joinGroup` appends instead of replacing; `switchGroup` action), `src/lib/session.ts`, `src/state/AuthContext.tsx`, `src/state/DataContext.tsx`, new `src/components/group-switcher.tsx`, `src/screens/settings/SettingsHub.tsx` (switcher row), locales, seed.
- **Behaviour**: Login lists the person's groups (by phone across the flat `members` collection); after login the active group defaults to the most recent; sidebar/header switcher changes `activeMemberId` and re-subscribes all listeners to the new `groupId`; invite join flow can add a second membership without signing out.
- **Acceptance**: join a second group with a new invite code → switcher lists both; data (vault, ledger, bulletin) fully swaps per group; ledger entries keep correct `groupId`; refresh restores the active group.
- **Deps**: P1-1, P1-2. **Size**: L.

### P2-11 · Translation & copy completion  *(B5, B6, B8, B12)* — **M**
- **Goal**: no untranslated English in `rw`/`fr`, no placeholders, no hardcoded JSX strings.
- **Files**: `src/i18n/locales/{rw,fr,en}.json` (finish `_review` lists: `status.*`, `error403.reason`, `maintenance.*`, `notFound.*`, `rotation.round` duplicate, `help.a2/a8`, `bulletin.readonly`, `member.lastPresident`, `delete.onlyPresident`…), `welcome/WelcomeLayout.tsx:64,67` (i18n chips "Shared vault / 3/4 approval / Live sync"), `welcome/Join.tsx:128`, `welcome/Create.tsx:203` (`common.rwsign`), `settings/DeleteAccount.tsx:17` (localised confirm phrase or keep 'DELETE' but explain in localised helper text), `services/demo.ts:498-499` (join announcement via i18n key stored on the doc + client-side `t`), legal keys (`en.json:409,411,449,681,746`) replaced with real copy or removed from nav.
- **Acceptance**: grep shows no raw user-facing English literals in the cited files; all three locales have equal leaf-key counts; a Kinyarwanda walkthrough of Home/Withdrawals/Desk/Bulletin/Ledger shows zero English strings.
- **Deps**: none (parallel-safe). **Size**: M.

### P2-12 · Anomaly reviewed-state + notifications truth  *(B11)* — **S**
- **Goal**: either persist "reviewed" marks or remove the illusion; mark notifications as demo-only.
- **Files**: `src/services/types.ts` + `demo.ts` (new `markAnomalyReviewed` action storing `reviewedBy/reviewedAt` on the related audit log — no ledger impact), `src/screens/settings/Anomaly.tsx`, `src/screens/settings/Notifications.tsx` (add helper text "Demo only — no push channel configured").
- **Acceptance**: reviewed marks survive refresh and other devices (via P1-2 sync); notifications page states its demo status in all languages.
- **Deps**: P1-1. **Size**: S.

**Phase 2 exit**: R12, R14, R15, R20, R29, R31, R32, R59, B5/B6/B8/B9/B11/B12 closed; visual parity pass at 375/768/1440 against every pitch mockup page.

---

## Phase 3 — "Later": backend, security, MoMo rails

Goal: the same UI drives Firestore with server-enforced rules; real MoMo collection/payout.

### P3-1 · Cloud Functions + transactions  *(R54, R56)* — **L**
- **Files**: restore `functions/` from git history; align with `src/shared/schema.ts`; one callable per `ActionName` in `src/services/types.ts`; every money action = Firestore transaction writing `groups.vaultBalance` + `auditLogs` together; quorum recomputed server-side with `shared/quorum.ts`; PIN verified against `memberCredentials` (bcrypt) with attempt limiting mirrored from `demoDb.ts:130-137`.
- **Acceptance**: emulator test suite: concurrent deposits both land; vote→quorum debits vault exactly once; client-supplied balance writes are rejected by rules.
- **Deps**: P1-11, P2-10. **Size**: L.

### P3-2 · Firestore security rules  *(R54)* — **M**
- **Files**: `firestore.rules` (restore + rewrite), `docs/SECURITY_MODEL.md`.
- **Behaviour**: members read own group's seven collections; writes only via functions; `memberCredentials` deny-all for clients; `auditLogs` create-only via functions, no update/delete ever; group membership validated by `members/{uid}.groupId`.
- **Acceptance**: rules unit tests green; attempted direct client write to `auditLogs`/`groups` fails.
- **Deps**: P3-1. **Size**: M.

### P3-3 · Firebase Auth (phone OTP) + hashed PIN server-side  *(R1, R5 — pending your login decision)* — **M**
- **Files**: `src/services/firestore.ts` (already structured for this, `:1-60`), `functions/src/auth.ts`, Login screen (only if you approve switching the login factor).
- **Behaviour**: phone OTP for authentication (as today's demo OTP flow, but real); 5-digit PIN re-verified server-side on every sensitive action; demo constant OTP removed (`config.ts:44`).
- **Acceptance**: plain PIN never leaves the server hash path; lockout after 5 failures enforced server-side.
- **Deps**: P3-1, your decision on R1. **Size**: M.

### P3-4 · MoMo provider integration  *(R62, R21)* — **L**
- **Files**: `functions/src/momo.ts` (provider adapter interface + sandbox impl), `src/screens/Deposit.tsx` (status states: requested → confirmed → failed, with retry), ledger entries only on confirmation, plus a payout path for approved petitions if the provider supports collections.
- **Behaviour**: deposit creates a payment intent; webhook/confirmation flips it; vault + ledger update in the same transaction; UI shows pending state honestly ("Requested from MoMo network").
- **Acceptance**: sandbox flow completes end-to-end; failed payments write nothing; ledger rows carry the provider reference in `detail`.
- **Deps**: P3-1. **Size**: L.

### P3-5 · Session hardening + impact metrics hooks  *(R58 completion, ch.15)* — **S**
- **Files**: `src/lib/session.ts` (store active membership server-verifiable), `functions/src/metrics.ts` (count groups active after 3 months, contributions on time, quorum approvals — the ch.15 measures), read-only dashboard later.
- **Deps**: P3-1. **Size**: S.

**Phase 3 exit**: R54, R62 closed; R1 resolved per decision; pitch-book "Now → Next → Later" roadmap fully executed.

---

## Shared types & data model (for `shared/`)

The repo is currently flat with only `frontend/`; the model already lives at `frontend/src/shared/schema.ts` and is the single source of truth. When the monorepo re-adds a root `shared/` folder, **move** `schema.ts`, `quorum.ts`, `ledger.ts` there unchanged and repoint `tsconfig` paths. The seven collections, normalised to the pitch book (ch.13 p.22) plus the fields the product already needs:

```ts
// shared/types.ts — seven collections + credentials (client-inaccessible)

export type Language = 'rw' | 'en' | 'fr'
export type Role = 'president' | 'treasurer' | 'secretary' | 'member'

export interface GroupDoc {
  id: string
  name: string
  inviteCode: string              // 'IBI-482913' format
  vaultBalance: number            // RWF, never negative
  currentCycle: number            // cycle round
  contributionAmount: number      // monthly target per member
  targetPayout: number            // = contributionAmount * memberCount (derived but snapshotted)
  currentRecipientId: string | null
  rotationOrder: string[]         // member ids in payout order
  nextPayoutDate: number | null   // epoch ms, Africa/Kigali month end
  memberCap: number
  status: 'active' | 'closed'
  createdAt: number
  createdBy: string
}

export interface MemberDoc {
  id: string
  groupId: string
  phone: string                   // unique per person across groups (R52)
  name: string
  role: Role
  hashedPin: string               // demo: salted SHA-256; prod: server-only (see MemberCredentialDoc)
  cycleStatus?: 'paid' | 'partial' | 'unpaid'  // DERIVED from ledger — never stored in prod
  totalSaved: number              // lifetime deposits sum (derived in prod)
  rotationPosition: number        // 1-based in rotationOrder
  joinedAt: number
  joinedVia: 'create' | 'invite'
}

export interface PetitionDoc {
  id: string
  groupId: string
  kind: 'withdrawal' | 'cycle_payout'
  title: string
  reason: string                  // pitch: "reason"
  amount: number
  recipientName: string | null
  recipientPhone: string | null
  status: 'open' | 'approved' | 'rejected' | 'expired' | 'paid'
  votes: VoteEntry[]              // {memberId, memberName, role, choice:'yes'|'no', at}
  requiredRatio: number           // 0.75 snapshot
  requiredApprovals: number       // ceil(0.75 * totalMembersAtCreation)
  totalMembersAtCreation: number
  createdBy: string               // creator's vote is auto-counted Yes (R27)
  createdAt: number
  expiresAt: number
  decidedAt: number | null
  paidAt: number | null
  txnId: string | null
}

export type BulletinType = 'announcement' | 'minutes' | 'attendance'
export type BulletinTag = 'urgent' | 'normal' | 'event'

export interface AnnouncementDoc {
  id: string
  groupId: string
  type: BulletinType               // minutes & attendance are special announcements (R33)
  tag: BulletinTag
  title: string
  content: string                 // pitch field name
  authorId: string
  authorName: string
  authorRole: Role
  timestamp: number                // pitch field name (createdAt kept as alias if needed)
  minutes?: { meetingDate: number; agenda: string[]; resolutions: string[]; nextActions: string[] }
  attendance?: { meetingDate: number; entries: {memberId: string; name: string; present: boolean}[]; presentCount: number }
}

export interface ChatMessageDoc {
  id: string
  groupId: string
  senderId: string
  senderName: string
  senderRole: Role
  message: string                  // pitch field name (text kept as alias)
  timestamp: number
}

export interface LoanDoc {
  id: string
  groupId: string
  borrowerId: string
  borrowerName: string
  principal: number
  interest: number                 // amount, = principal * 0.05
  interestRate: number             // 0.05
  totalDue: number                 // principal + interest
  termDays: 30 | 60
  status: 'active' | 'repaid'
  authorisedById: string           // pitch: "authoriser"
  authorisedByName: string
  authorisedByRole: Role
  issuedAt: number
  dueAt: number
  repaidAt: number | null
  txnId: string | null             // issue entry; repay entry linked via relatedId
}

export interface AuditLogDoc {
  id: string
  groupId: string
  txnId: string                    // 'TXN-…' unique, immutable
  type: 'deposit' | 'cash_entry' | 'payout' | 'loan_issue' | 'loan_repay' | 'penalty'
  amount: number                   // signed semantics by type (see ledger UI)
  initiatorId: string
  initiatorName: string
  initiatorRole: Role
  details: string                  // pitch field name
  timestamp: number
  pinVerified: boolean             // pitch: "PIN ✔"
  balanceAfter: number             // running vault balance — invariant aid
  relatedId: string | null         // petition / loan / deposit reference
}

/** Server-only. Deny-all to clients. Never in the demo DB. */
export interface MemberCredentialDoc {
  id: string
  memberId: string
  groupId: string
  pinHash: string                  // bcrypt in prod; salted SHA-256 in demo
  failedAttempts: number
  lockedUntil: number | null
  updatedAt: number
}
```

Invariants enforced in code (not types): `balanceAfter` monotonic per ledger order; `vaultBalance === last(auditLogs).balanceAfter`; `requiredApprovals = ceil(totalMembers * 0.75)`; loans write exactly two ledger rows over their life; the lottery rewrites only the unfixed suffix of `rotationOrder` in one batch.

---

## Suggestion box (beyond the pitch book — not planned unless you ask)

- Keyboard-shortcut palette for officers (cmd-k → desk tools).
- Offline queue for deposits (record intent locally, sync when online).
- Printable meeting-minutes PDF export.
- Rotation screen countdown ("pays out in N days") using `nextPayoutDate`.
