# Ibimina Frontend — Gap Analysis

Audit date: 2026-10-21. Code audited at `frontend/` (working tree). Evidence citations are `file:line`.
Pitch references are chapter/page in `docs/Ibimina-Pitch-Book.pdf` (see `docs/PITCH_BOOK_REQUIREMENTS.md` for R-numbers).

Status legend: **Done** = parity in code · **Partial** = exists but deviates · **Missing** = not implemented · **Contradicts** = conflicts with the pitch book (flagged for your decision).

---

## 1. Requirements table

| # | Requirement | Pitch ref | Status | Evidence | What to change |
|---|---|---|---|---|---|
| R1 | Login = phone + 5-digit PIN, tabs to Create/Join | ch4 p.6 | **Contradicts** | `screens/welcome/Login.tsx:22,136-139` (6-digit OTP; PIN never used at login) | Flagged — needs your decision (pitch: PIN login; app: OTP login). Entry routes exist (`/welcome/login|create|join`). |
| R2 | Create: name, contribution, name/phone/PIN → President + invite code | ch4 p.6-7 | Done | `welcome/Create.tsx:184-247`; `services/demo.ts:438` (`role:'president'`), `:418,456` code issued | — |
| R3 | Join via invite code, next rotation position | ch4 p.7 | Partial | `demo.ts:463-465,479,483`; code format `shared/ledger.ts:23-25` = 6 random chars, **no `IBI-` prefix**; seed code `'KIMINA'` (`demoDb.ts:165`) | Generate/display codes as `IBI-xxxxxx`; update seed + Join placeholder. |
| R4 | RW/EN/FR switch anytime, remembered on device | ch4 p.6 | Done | `i18n/index.ts:15,44-55` (localStorage `ibimina.language`, live `changeLanguage`) | — |
| R5 | Phone 078/079/072/073; SHA-256 PIN hash, never plain | ch4 p.7, ch11 p.20 | Partial | Phone: `shared/schema.ts:83-93`, enforced `demo.ts:163-164`. Hash: salted SHA-256 `demoDb.ts:97-126`; but login compares OTP not PIN hash (`demo.ts:172`) | Resolves with R1 decision. Hashing itself is correct. |
| R6 | PC welcome brand panel + same three flows | ch4 p.7 | Done | `welcome/WelcomeLayout.tsx:25-27,49-67` (dark-green aside, tagline, chips) | Chips are hardcoded English (see Bugs). |
| R7 | Urgent banner only when I haven't voted on an active petition | ch5 p.8 | Partial | Condition correct: `Home.tsx:76-86`; but style is **amber/ochre**, not red: `Home.tsx:153-160` uses `--color-pending` (`globals.css:26-27`), not `--color-danger` | Use danger tone + pulse; copy "Your vote is needed: …". |
| R8 | Vault card with cycle progress bar | ch5 p.8 | Partial | Balance `Home.tsx:178-183`; progress bar lives in a *different* card ("Who has paid", `Home.tsx:378-386`) | Move the collected/target bar + text into the vault card. |
| R9 | Next payout: recipient, round, **date** | ch5 p.8 | Partial | `Home.tsx:187-206` — recipient + round only, no date | Add payout date (needs `nextPayoutDate` derivation — open question 4). |
| R10 | Cycle checklist Paid/Pending per member | ch5 p.8 | Done | `Home.tsx:389-419` + `lib/cycle.ts:48-57` (Paid/Partial/Not paid — richer, allowed) | — |
| R11 | PC savings-growth chart | ch5 p.9 | Done | `Home.tsx:6,443-491` — recharts AreaChart via shadcn Chart (kept stack per your instruction; pitch's plain-SVG is illustrative) | — |
| R12 | "Live" indicator on Home/Bulletin | ch5 p.9, ch9 p.17 | **Missing** | No "Live" pill anywhere in `src` | Add green-dot "Live" pill to Home + Bulletin headers. |
| R13 | Actions: "Deposit via MoMo" / "New withdrawal request" | ch5 p.8-9 | Partial | `Home.tsx:236-252`; labels are "Deposit" / "Propose withdrawal" (`en.json:128-129`) | Align i18n wording to pitch. |
| R14 | Phone header: group name, invite code, RW·EN·FR, avatar | ch5 p.8 mockup | **Missing** | `Home.tsx:134-151` = greeting + member count only; `app-shell.tsx:212-261` mobile header = group name + cycle + avatar (no code, no language) | Add invite-code + language switcher to the mobile header (or header area). |
| R15 | PC sidebar: invite-code block + language block | ch5 p.9 | **Missing** | `app-shell.tsx:117-209` — no invite-code or language UI | Add both blocks under the sidebar nav. |
| R16 | Deposit amount prefilled + editable | ch6 p.10 | Done | `Deposit.tsx:34-36,122-149` (fixes mount-race — see Bugs #9) | — |
| R17 | MoMo number field | ch6 p.10 | Done | `Deposit.tsx:151-167` | — |
| R18 | "Vault after deposit" summary | ch6 p.10 | Done | `Deposit.tsx:171-197` | — |
| R19 | PIN choke-point before anything is recorded | ch6 p.10 | Done | `Deposit.tsx:211-227` + `demo.ts:511-524` (PIN verified before any write) | — |
| R20 | PC PIN prompt = centred dialog (keypad in mockup) | ch6 p.11 | Partial | `components/pin-gate.tsx:96-121` is a centred `Dialog` but uses 5-slot OTP input, no 3×4 keypad | Optional: add numeric keypad mode to PinGate (Suggestion, mockup-level detail). |
| R21 | Honest note: deposit recorded, MoMo network later | ch6 p.10, ch14 | Done | Demo-mode note in sidebar (`app-shell.tsx:200-207`); deposit writes local ledger only | — |
| R22 | Petition shows amount, reason, recipient before votes | ch7 p.12 | Partial | Cards: `Withdrawals.tsx:410-447` (title, detail, amount — **recipient only on detail** `WithdrawalDetail.tsx:166-187`) | Show recipient on the petition card. |
| R23 | Live approvals tally vs 75% | ch7 p.12 | Done | `Withdrawals.tsx:91-125,449-463`; engine `shared/quorum.ts:20-23` (`Math.ceil(n*0.75)`) | — |
| R24 | ≥1 ordinary Member approval when ≥4 members | ch7 p.12 | Done | `quorum.ts:26-28,69-72`; UI `Withdrawals.tsx:499-503`, `WithdrawalDetail.tsx:205-232` | — |
| R25 | Approve/Reject open PIN first | ch7 p.12 | Done | `Withdrawals.tsx:330-380,527-549`; `WithdrawalDetail.tsx:294-333` — no vote path bypasses `PinGateModal` | — |
| R26 | Petition history | ch7 p.12 | Done | Status filter tabs incl. Approved/Rejected/Paid: `Withdrawals.tsx:153-160` | — |
| R27 | Creator auto-Yes at creation | ch7 p.13 | Done | `demo.ts:576-585` ("The proposer is an automatic Yes") | — |
| R28 | Quorum → vault debited + payout ledger + live status | ch7 p.13 | Done | `demo.ts:625-668` (`settle`: debit `:635`, `payout` ledger `:636-649`, status `:650-653`) | — |
| R29 | PC: petition detail + voter table side by side | ch7 p.13 | Partial | Voter list exists on detail (`WithdrawalDetail.tsx:265-292`) but single-column; no side-by-side layout | Two-column layout on `lg` for the detail page. |
| R30 | Five desk tools, all PIN-gated | ch8 p.14 | Partial | All five exist and PIN-gated: Announce `Announce.tsx:153-159`, Minutes `:132-138`, Loan `Loan.tsx:267-276`, Lottery `Lottery.tsx:185-192`, Attendance `:168-174`. Wording: cards say "Loan"/"Lottery" not "Emergency loan"/"Rotation lottery" (`en.json:571-575`) | Align card titles/subtitles to pitch wording. |
| R31 | Phone quick-loan preview (100k → 5% → 105k) | ch8 p.14 | **Missing** | No quick-preview on `DeskHub.tsx` (grep: no 105000/quickLoan) | Add interactive preview card on DeskHub (phone; harmless on PC). |
| R32 | PC desk: tool list left + form right (two-pane) | ch8 p.15 | **Missing** | `DeskHub.tsx:63` = card grid `md:grid-cols-2 xl:grid-cols-3`; sub-tools are separate routes | Restructure `/desk` into two-pane master/detail on `lg`. |
| R33 | Lottery atomic; minutes/attendance appear in Bulletin | ch8 p.15 | Partial | Lottery shuffles only pending suffix, one commit (`demo.ts:862-887`) — atomic **in-memory only**; minutes/attendance post announcements (`types.ts:132`, `Minutes.tsx`, `Attendance.tsx`) and appear in Bulletin feed | Real atomicity arrives with backend phase (R56). |
| R34 | Loan records principal, interest, total due, term, authoriser | ch8 p.15 | Done | `LoanDoc` `shared/schema.ts:200-219`; write `demo.ts:718-731` | — |
| R35 | Colour-coded announcement cards + author/role | ch9 p.16 | Partial | Author/role: `Bulletin.tsx:251-259`. Colour = small badge only (`Bulletin.tsx:28-39,177-186`); **no left border on card** | Add priority left-border (red/blue/green-tint) to cards. |
| R36 | Minutes as structured records | ch9 p.16 | Done | `Bulletin.tsx:198-207` (agenda/resolutions/actions, expandable) | — |
| R37 | Chat live, append-only, sender name+role | ch9 p.16 | Done | `Bulletin.tsx:280-391`; append-only label `:318`; no edit/delete action exists (`types.ts:210-231`) | — |
| R38 | PC feed + chat side by side | ch9 p.17 | Done | `Bulletin.tsx:109` `lg:grid-cols-[1.5fr_1fr]` | — |
| R39 | Ledger read-only, newest first, TXN ID + timestamp | ch10 p.18 | Done | `Ledger.tsx:93-110` (Read-only badge + immutable notes); sorted newest-first in data layer | — |
| R40 | Types: MoMo, cash, payout, loan, repayment, penalty | ch10 p.18-19 | Partial | All six exist in `AuditEntryType` (`schema.ts:229-235`); `cash_entry` has **no action** that can produce it (no desk tool) | Decide scope (open question 3). Deposit type badge shows "Deposit" not "MoMo" — wording only. |
| R41 | Filter tabs All/Deposits/Payouts/Loans/Penalties | ch10 p.18-19 | Done | `Ledger.tsx:52-54,113-125` | — |
| R42 | Table: TXN ID, Type, **Initiated by**, Details, **Verified (PIN ✔)**, Amount | ch10 p.19 | Partial | Columns now: TXN, Type, Detail, Amount, Balance after, Date (`Ledger.tsx:187-195`). "Initiated by" exists only as filter (`:137-160`); "PIN verified" only on detail (`LedgerDetail.tsx:115-119`) | Add Initiated-by + Verified columns (keep Balance-after as an app extension). |
| R43 | "Repay my loan" from ledger with PIN | ch10 p.18 | Done | `LedgerDetail.tsx:73-96,164-195` (on the loan's ledger entry, PIN-gated) | Consider also surfacing on the Ledger list when the viewer has an active loan (pitch phone mockup shows the button on the list screen). |
| R44 | Loans/repayments write ledger lines | ch10 p.19, ch14 #4 | Done | Issue `demo.ts:718-731`, repay `:774-787` — both write full audit rows with `balanceAfter` | — |
| R45 | PIN hashed, server-only in production | ch11 p.20 | Done | Demo: salted SHA-256 (`demoDb.ts:97-126`); prod model: `MemberCredentialDoc` `schema.ts:271-280` + `COLLECTIONS.memberCredentials` denied to clients (`:17-18`) | Backend phase must ship the rules. |
| R46 | PIN re-checked for every sensitive action | ch11 p.20, ch8 p.14 | Done | Deposit/vote/petition/loan/repay/penalty/announce/minutes/attendance/lottery all await `requirePin` (`demo.ts:514,552,606,674,709,765,802,854` + minutes/attendance via announce action) | — |
| R47 | Officers can't reach quorum alone; votes visible | ch11 p.20 | Done | `quorum.ts:69-72`; voter visibility `Withdrawals.tsx:465-492`, `WithdrawalDetail.tsx:265-292` | — |
| R48 | Read-only timestamped ledger | ch11 p.20 | Done | No edit/delete actions exist for `auditLogs` (`types.ts:210-231`) | — |
| R49 | Live updates without refresh | ch12-13 p.21-22 | Partial | In-process listeners (`demo.ts:249-287,335-346`) push snapshots; **no cross-tab sync** (no storage event/BroadcastChannel) | Add BroadcastChannel/storage-event sync in demo phase; real listeners already stubbed in `firestore.ts:171`. |
| R50 | Three languages saved on device | ch12 p.21 | Done | `i18n/index.ts:15,41-45` | — |
| R51 | Seven collections with the listed fields | ch13 p.22 | Done | `shared/schema.ts:9-263` — all seven + extras (`balanceAfter`, `relatedId`, `kind`, `memberCredentials`) | — |
| R52 | Phone unique across groups; flat collections | ch13 p.22 | Partial | Flat collections + `groupId` everywhere (`schema.ts:9-19`); demo login searches all members (`demo.ts` auth flow), but multi-group membership unsupported (one session group) | Resolves with R59. |
| R53 | Atomic writes; one atomic batch for lottery | ch13 p.22 | Partial | Single in-memory `commit()` per action (`demo.ts:251-260`) — atomic for one tab only; read-then-write across `await requirePin` (`demo.ts:511-525`) | Transactions in backend phase (R56); tighten demo ordering (verify PIN before read-modify-write). |
| R54 | Security rules + server-side enforcement | ch14 #1 Now | **Missing** | `services/firestore.ts:1-60` defines the intended architecture (callable functions, client untrusted) but `functions/` and `firestore.rules` are **not in the working tree** (deleted in cleanup; recoverable from git history) | Backend phase: restore + ship rules. |
| R55 | PIN attempt limiting/lockout | ch14 #2 Now | Done | 5 attempts, exponential 30s lockout: `demoDb.ts:130-137`, enforced `demo.ts:300-312` | Server-side mirror in backend phase. |
| R56 | Transactions for balance updates | ch14 #3 Now | **Missing** | Plain read-then-write: `demo.ts:251-255,511-540`; `saveDb` whole-object overwrite (`demoDb.ts:73-79`) | Backend: Firestore transactions. Demo: re-read + validate inside one sync block. |
| R57 | Ledger entry for every balance change | ch14 #4 Now | Done | All 5 vault mutations pair with `pushLedger`: deposit `:525-539`, payout `:635-649`, loan issue `:717-731`, repay `:773-787`, penalty `:811-825` | — |
| R58 | Persist session across refresh | ch14 #5 Next | Done | localStorage `ibimina.session` stores member id only (`config.ts:46`, `demo.ts:71-97,132-137`) | — |
| R59 | Membership in several groups | ch14 #6 Next | **Missing** | One `groupId` per session (`demo.ts:132-137`); join replaces/extends single membership | Backend + UI phase (group switcher). |
| R60 | Email: use or remove | ch14 #7 Next | Done | Email is not collected anywhere in Create/Join/Profile — nothing unused ships | — |
| R61 | Unify login styling with the app | ch14 #8 Next | Done | `welcome/WelcomeLayout.tsx` already uses the same design tokens (`globals.css`) and shadcn components; no separate visual identity | Per your instruction, no welcome redesign planned. |
| R62 | Real MoMo provider integration | ch14 #9 Later | **Missing** | Deposits are recorded only (`demo.ts:511-540`); no provider calls | Later phase — plan only. |

### Parity count
- **Done: 30** (R2, R4, R6, R10, R11, R16, R17, R18, R19, R21, R23, R24, R25, R26, R27, R28, R34, R36, R37, R38, R39, R41, R43, R44, R45, R46, R47, R48, R50, R51, R55, R57, R58, R60, R61 — 35 incl. sub-items; see table)
- **Partial: 14** (R3, R5, R7, R8, R9, R13, R20, R22, R29, R30, R33, R35, R40, R42, R49, R52, R53)
- **Missing: 8** (R12, R14, R15, R31, R32, R54, R56, R59, R62)
- **Contradicts: 1** (R1 login factor)
- **Flagged (approved deviations, not gaps):** palette (your brand), recharts chart, three-state checklist, extra app pages (Members, Rotation, Help, Settings, ledger/balance-after column, penalty desk tool, anomaly detector, CSV export).

---

## 2. Visual differences, screen by screen

### Navigation (all screens)
1. **Bottom tabs wrong five.** Pitch: Home · Multi-Sig · Exec Desk · Bulletin · Audit (p.1/8/12). App: Home · Withdrawals · **Deposit (gold FAB)** · Audit ledger · **Settings** (`app-shell.tsx:104-110,271-297`). Bulletin and Exec Desk are absent from the phone tab bar; Exec Desk is reachable only via a small officer icon in the mobile top bar (`app-shell.tsx:236-245`).
2. **PC sidebar missing invite-code + language blocks** (pitch p.9): `app-shell.tsx:117-209` has nav + footer only.
3. **Mobile header** (pitch frame: group name, invite code, RW·EN·FR, avatar): app shows group name + cycle, officer icon, avatar (`app-shell.tsx:212-261`) — no invite code, no language switcher.
4. App sidebar correctly adds Members/Rotation/Help (extensions — keep). Demo-mode note is an app addition (keep).

### Welcome (ch4)
5. Login uses OTP, not the 5-digit PIN the pitch shows ("0788 123 456 / ●●●●●" p.6) — the one hard contradiction (R1).
6. PC brand-panel chips are hardcoded English "75% multi-sign / 1 member vote required" (`WelcomeLayout.tsx:64,67`) vs pitch's "Shared vault / 3/4 approval / Live sync" (p.7).
7. Separate routes instead of tabs — acceptable equivalent; no change needed.

### Home (ch5)
8. Urgent banner is ochre/amber (`Home.tsx:153-160`), pitch is a **pulsing red** banner (p.8).
9. Cycle progress bar sits in the "Who has paid" card, not the vault card (p.8 shows one vault card with the bar).
10. Next-payout card lacks the payout date ("Round 5 · 30 Oct" p.8).
11. No "Live" pill (p.9).
12. No invite code/language/avatar header block on phone (p.8 frame).
13. Button wording: "Deposit"/"Propose withdrawal" vs "Deposit via MoMo"/"New withdrawal request" (p.8).
14. Chart: recharts instead of hand-drawn SVG (approved stack choice; visually equivalent).

### Deposit (ch6)
15. PIN entry is a 5-slot OTP field (`Deposit.tsx:211-227`, `pin-gate.tsx:103-121`); pitch PC mockup shows a 3×4 keypad dialog (p.11). Centred-dialog behaviour is otherwise matched via `PinGateModal`.

### Multi-Sig (ch7)
16. Petition list cards omit the recipient (p.12 shows "Recipient: Samuel N." on the card).
17. PC detail is single-column; pitch shows petition + voter table side by side (p.13). Voter "Waiting" rows exist (parity kept).
18. Wording: "Propose a withdrawal" vs "+ New petition" (minor).

### Executive Desk (ch8)
19. Phone hub lacks the "Quick loan preview" card (p.14).
20. PC hub is a card grid; pitch is two-pane tool list + form (p.15). Sub-tools match functionally.
21. Card titles "Loan"/"Lottery" vs pitch "Emergency loan"/"Rotation lottery" (p.14); sub-copy otherwise matches.
22. Pitch hub header "Officers only · PIN required" copy absent (gate itself works: `DeskHub.tsx:52`).

### Bulletin (ch9)
23. Cards have no colour-coded **left border** by priority — only a small badge (p.16 shows full-height left accent bars in red/blue/green).
24. Phone pitch shows announcements + chat stacked in one feed with tabs-less flow and a persistent composer; app uses an explicit Feed/Chat toggle on phone (`Bulletin.tsx:93-107`) — equivalent, slightly different pattern.

### Audit ledger (ch10)
25. Missing "Initiated by" and "PIN ✔" columns (p.19); app adds "Balance after" + "Date and time" (extensions — keep).
26. "Repay my loan" button appears on the loan's **detail** page; pitch phone mockup shows it on the ledger **list** (p.18).
27. Type badge says "Deposit" where the pitch says "MoMo" (p.19) — wording.

### Anything that looks broken (not in the PDF)
See section 3 — duplicate Settings card, plural-key bug, dead notification toggles, deposit prefill race, no-op `font-600` weight, placeholder legal copy, rw/fr untranslated keys, join announcement hardcoded English, fragile name-substring payout matching, Anomaly reviewed-state lost on unmount, penalty form mislabelled "Borrower".

---

## 3. Bugs and inconsistencies (found during code audit)

| # | Severity | Issue | Evidence |
|---|---|---|---|
| B1 | High (UX) | **SettingsHub renders the identical Group summary card twice** (name/contribution/invite-code rows duplicated). | `settings/SettingsHub.tsx:108-136` and `:138-166` |
| B2 | Medium | **Plural key broken**: `home.openPetitions_plural` uses i18next v3 `_plural` suffix but i18next v26 runs without `compatibilityJSON` — badge always shows singular. | `en.json:134` etc.; `Home.tsx:147`; `i18n/index.ts:31-46` |
| B3 | Medium | **Deposit prefill race**: amount state initialised once at mount from `group`; a cold direct load of `/deposit` before data arrives leaves the hardcoded `'50000'` forever. | `Deposit.tsx:34-36`; `app/(app)/layout.tsx:9-11` |
| B4 | Medium | **No cross-tab live sync** in demo mode (pitch: "every other member's screen refreshes", p.11): two tabs clobber each other via whole-blob `saveDb`, listeners are in-process only. | `demo.ts:249-287`; `demoDb.ts:73-79` |
| B5 | Medium | **rw/fr locales carry untranslated English** for ~15 keys (`status.paid`, `error403.reason`, `maintenance.*`, `notFound.*`, `rotation.round` duplicate key, `help.a2/a8`, …); TODO review arrays acknowledge this. | `rw.json:754` `_review`, spot-checks |
| B6 | Low | **Placeholder legal/support copy shipped**: "[SUPPORT NUMBER TO BE ADDED]", "[STATUS PAGE TO BE ADDED]", "[TO BE ADDED BY OWNER]", "DRAFT for demonstration…". | `en.json:409,411,449,681,746` |
| B7 | Low | **Dead code**: Announce error state can never render (only ever set to `null`); Withdrawals `TONE.pending/gold/neutral/green` unused. | `desk/Announce.tsx:39,141`; `Withdrawals.tsx:56-63` |
| B8 | Low | **Misleading labels**: penalty member-select says "Borrower" (`Loan.tsx:351`); Home quick-actions description reuses the welcome trust copy (`Home.tsx:232` + `en.json` `welcome.trust`); Join invite placeholder is raw `"KIMINA"` (`Join.tsx:128`); Welcome chips + `DeleteAccount` 'DELETE' phrase + "RWF" literal hardcoded English. | cited files |
| B9 | Low | **No-op CSS weight**: `font-600` used but only 500/700/800 tokens defined. | `app-shell.tsx:174`; `globals.css:31-34` |
| B10 | Low | **Fragile payout-history match**: MemberDetail finds payouts by `log.detail.toLowerCase().includes(nameLower)` — breaks on partial name matches. | `MemberDetail.tsx:50-56` |
| B11 | Low | **Anomaly "reviewed" state not persisted** — resets on unmount; Notifications toggles persist to localStorage but nothing reads them (mock). | `Anomaly.tsx:30`; `Notifications.tsx:10,52` |
| B12 | Low | **Join writes a hardcoded English announcement** ("X joined the group") regardless of language. | `demo.ts:498-499` |
| B13 | Info | Demo OTP is a constant `123456` and shown in the UI — fine for demo, must die in backend phase. | `config.ts:44`; `Login.tsx:148-152` |
| B14 | Info | `functions/` + `firestore.rules` were removed from the working tree in the recent cleanup (still in git history). The Firestore layer (`firestore.ts`) is a client stub awaiting them. | git status `D`; `firestore.ts:1-60` |

---

## 4. Consistency check of the app's extra pages (beyond the pitch book)

- **Members / MemberDetail / Rotation / Help / Settings**: consistent with pitch rules (quorum figures via `lib/cycle.ts`, statuses from ledger, officer gates). Keep.
- **Rotation screen**: correctly shows pending rounds only, current recipient highlighted (`Rotation.tsx:63-161`) — consistent with ch8 atomic-lottery semantics.
- **WithdrawalDetail / LedgerDetail**: read-only, immutable notes, PIN gates — consistent.
- **Penalty tool (desk/Loan.tsx)**: ledger type exists in the pitch table (p.19 "Penalty") though no desk tool is shown — app extension, consistent, keep.
- **Anomaly detector, CSV export, notifications, delete-account**: app extensions beyond the pitch book; CSV export columns match ledger fields (`ExportLedger.tsx:14`). Keep; label as extensions in pitch materials.
