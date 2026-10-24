# Agent Prompts — Ibimina Pitch-Book Parity

Three ready-to-paste prompts, one per phase. Give each to a coding agent in order. Each prompt requires the agent to re-read the pitch book and the requirements doc before touching code.

---

## Prompt 1 — Phase 1: "Now" (money safety & ledger correctness)

```
You are implementing Phase 1 of docs/IMPLEMENTATION_PLAN.md in the Next.js app at frontend/
(repo root C:\Users\mucyu\Documents\Projects\DIGITAL-IBIMINA).

BEFORE CODING, re-read these files yourself:
1. docs/Ibimina-Pitch-Book.pdf — chapters 7, 10, 11 and 14 (pages 12-13, 18-20, 23).
   Extract text with Python + PyMuPDF if needed (fitz is installed).
2. docs/PITCH_BOOK_REQUIREMENTS.md — especially R22-R28, R39-R44, R49, R53-R57.
3. docs/GAP_ANALYSIS.md — status table and bugs B1-B4, B7, B9.
4. frontend/src/services/demo.ts, demoDb.ts, frontend/src/shared/{schema,quorum,ledger}.ts,
   frontend/src/lib/cycle.ts, frontend/src/screens/{Home,Ledger,LedgerDetail,Withdrawals}.tsx.

YOUR TASKS (implement exactly these, in this order):
- P1-1 Transactional writes in the demo layer (mutex + verify-PIN-before-mutate; one commit per action).
- P1-2 BroadcastChannel cross-tab live sync with revision counter.
- P1-3 Ledger table: add "Initiated by" and "PIN ✔/System" columns (keep Balance after + Date).
- P1-4 "Repay my loan" card on the Ledger list for the signed-in borrower (PIN-gated, reuse LedgerDetail logic).
- P1-5 Settle hardening: quorum reached but vault too small → petition 'rejected' with reason key.
- P1-6 Home urgent banner → red (danger tone) + pulse, pitch wording, links to the petition.
- P1-7 Move cycle progress bar into the vault card.
- P1-8 groups.nextPayoutDate (Africa/Kigali month end) shown on Home + Rotation.
- P1-9 Withdrawal cards show recipient; align button wording with the pitch ("New withdrawal request").
- P1-10 Fix bugs B1-B4, B7, B9 (duplicate Settings card, i18next plural keys, deposit prefill race,
  dead Announce error state, dead TONE keys, font-600 no-op).
- P1-11 Restore firestore.rules/firebase.json from git history into repo root and write
  docs/SECURITY_MODEL.md (do not deploy anything).

HARD RULES:
- Keep Next.js + TypeScript + Tailwind + shadcn/ui. No new libraries. No changes to welcome screens.
- Every user-facing string goes through i18n keys in en, rw AND fr locale files.
- Never hard-code statuses, totals or round numbers — derive from lib/cycle.ts and the audit ledger.
- Money invariant: every vaultBalance change writes exactly one auditLogs row in the same commit,
  with txnId, pinVerified, balanceAfter, initiator and timestamp.
- Do not touch src/screens/welcome/**.

VERIFY before reporting done:
- cd frontend && npx tsc --noEmit && npm run lint && npx next build
- Playwright smoke (dev server on :3000): concurrent deposit test from P1-1 acceptance criteria;
  /ledger shows 8 columns at 1440px; /settings shows ONE group card; cold-load /deposit prefills
  the real contribution amount.
Report: files changed, acceptance criteria met, anything you could not finish and why.
```

---

## Prompt 2 — Phase 2: "Next" (navigation, desk, language, multi-group)

```
You are implementing Phase 2 of docs/IMPLEMENTATION_PLAN.md in the Next.js app at frontend/
(repo root C:\Users\mucyu\Documents\Projects\DIGITAL-IBIMINA). Phase 1 is already merged.

BEFORE CODING, re-read these files yourself:
1. docs/Ibimina-Pitch-Book.pdf — chapters 5, 8, 9 and 13 (pages 8-9, 14-17, 22), plus the
   phone frames on every product page (bottom tabs, header: group name, invite code, RW·EN·FR, avatar;
   PC sidebar: invite-code block + language block).
   Extract with Python + PyMuPDF if needed.
2. docs/PITCH_BOOK_REQUIREMENTS.md — especially R3, R12-R15, R20, R29, R30-R32, R35, R50, R59.
3. docs/GAP_ANALYSIS.md — visual differences section and bugs B5, B6, B8, B11, B12.
4. frontend/src/components/app-shell.tsx, frontend/src/screens/desk/**, Bulletin.tsx,
   WithdrawalDetail.tsx, welcome/Join.tsx, welcome/WelcomeLayout.tsx, i18n/**.

YOUR TASKS (implement exactly these, in this order):
- P2-1 Mobile bottom tabs = the pitch five (Home, Multi-Sig, Exec Desk for officers / Bulletin slot
  for members, Bulletin, Audit). Deposit stays a gold FAB or Home-only; Settings moves behind avatar.
- P2-2 Phone header + PC sidebar: invite-code chip (tap-to-copy, IBI-xxxxxx) and RW/EN/FR
  segmented control (new src/components/language-switch.tsx using ToggleGroup + existing setLanguage).
- P2-3 makeInviteCode() → 'IBI-' + 6 chars; seed, Join placeholder/validation, demo.ts matching.
- P2-4 Bulletin cards: colour-coded left border (urgent=red, event=blue, normal=neutral,
  minutes/attendance=green tint).
- P2-5 "Live" green-dot pill on Home + Bulletin headers (all three languages).
- P2-6 Executive Desk two-pane on lg (tool list left with gold "Selected" highlight, form right;
  phone keeps card grid; rename cards to pitch wording "Emergency loan", "Rotation lottery";
  add "Officers only · PIN required" header; sub-routes stay deep-linkable).
- P2-7 Quick loan preview card on DeskHub (Principal → 5% interest → Total due, default 100,000).
- P2-8 PinGateModal 3x4 numeric keypad (1-9, 0, backspace) alongside the OTP slots.
- P2-9 WithdrawalDetail lg two-column with voter TABLE (MEMBER/ROLE/VOTE, "Waiting" rows).
- P2-10 Multi-group membership: session holds multiple memberships + activeMemberId; group switcher
  in sidebar and settings; join adds membership without sign-out; listeners re-subscribe per group.
- P2-11 Translation completion: finish rw/fr _review TODO lists, remove placeholder legal copy,
  i18n the Welcome chips ("Shared vault / 3/4 approval / Live sync"), Join placeholder,
  "RWF" literal, localised DeleteAccount helper text, localised join announcement.
- P2-12 Persist anomaly "reviewed" state via a demo action; label Notifications as demo-only.

HARD RULES:
- Keep Next.js + shadcn/ui only. No new libraries. No welcome-screen redesign (copy/i18n fixes only).
- All three locale files stay key-parity; no hardcoded user-facing English in JSX.
- Officer gates stay: members can never reach /desk actions; Exec Desk tab for members shows Bulletin.
- Every sensitive action keeps its PinGateModal. Do not change money maths.

VERIFY before reporting done:
- cd frontend && npx tsc --noEmit && npm run lint && npx next build
- Playwright at 375px: exactly 5 bottom tabs + FAB, no horizontal overflow on any route.
- At 1440px: desk two-pane works; sidebar shows invite-code + language blocks; withdrawal detail
  shows the voter table; switching language updates the whole UI live and survives refresh.
- Join a second group via IBI- prefixed code, switch groups, confirm fully swapped data.
Report: files changed, acceptance criteria met, anything unfinished and why.
```

---

## Prompt 3 — Phase 3: "Later" (Firestore backend, rules, MoMo)

```
You are implementing Phase 3 of docs/IMPLEMENTATION_PLAN.md — the backend phase — for the Ibimina
app (repo root C:\Users\mucyu\Documents\Projects\DIGITAL-IBIMINA). The frontend in frontend/ already
implements the full UI and a demo services layer shaped like Firestore.

BEFORE CODING, re-read these files yourself:
1. docs/Ibimina-Pitch-Book.pdf — chapters 11, 12, 13 and 14 (pages 20-23). Use Python + PyMuPDF.
2. docs/PITCH_BOOK_REQUIREMENTS.md — especially R5, R45, R46, R51-R57, R62 and open questions.
3. docs/SECURITY_MODEL.md (written in Phase 1) and docs/IMPLEMENTATION_PLAN.md Phase 3.
4. frontend/src/services/{types,firestore,demo}.ts and frontend/src/shared/{schema,quorum,ledger}.ts.

YOUR TASKS (in order):
- P3-1 Cloud Functions: restore functions/ from git history, align with shared/schema.ts.
  One callable per ActionName in services/types.ts. Every money action runs a Firestore transaction
  writing vaultBalance + auditLogs together. Quorum recomputed server-side with shared/quorum.ts
  (75% of ALL members + >=1 ordinary-member approval at 4+ members; creator auto-Yes checked).
  PIN verified against memberCredentials (bcrypt) with lockout (5 attempts, exponential backoff).
- P3-2 firestore.rules: members read only their group's seven collections; writes only via functions;
  memberCredentials deny-all; auditLogs immutable (no update/delete, create only via functions).
  Ship rules unit tests (emulator). Update docs/SECURITY_MODEL.md.
- P3-3 Real phone-OTP auth wiring in services/firestore.ts (already structured for it);
  remove the demo constant OTP from config; PIN re-verified server-side on every sensitive action.
  NOTE: the login factor (OTP vs 5-digit PIN) is an open product decision (R1) — implement OTP
  auth + PIN-for-actions as the code does today, do not redesign the login screen.
- P3-4 MoMo provider adapter in functions/src/momo.ts with a sandbox implementation; Deposit screen
  gains requested/confirmed/failed states; vault + ledger update only on confirmation, in the
  same transaction; keep the honest note that deposits are recorded, network rails are integration.
- P3-5 Session hardening + ch.15 impact counters (groups active after 3 months, on-time
  contributions, quorum approvals) as Cloud Function aggregates.

HARD RULES:
- The client stays untrusted: no balance, quorum or PIN check may exist ONLY on the client.
- shared/schema.ts remains the single source of truth — update functions imports to it, never fork types.
- Demo mode must keep working when Firebase env vars are absent (mode switch already in services/index.ts).
- All new UI strings in en, rw, fr. No new UI libraries.

VERIFY before reporting done:
- Firebase emulator suite: concurrent deposits both persist; vote-to-quorum debits exactly once;
  direct client write to auditLogs/groups rejected; PIN lockout enforced server-side.
- Frontend: cd frontend && npx tsc --noEmit && npm run lint && npx next build
- Point the app at the emulator, run the Appendix B demo script end to end (create → join →
  deposit → petition+vote → loan → ledger), with a second browser tab proving live sync.
Report: functions implemented, rules coverage table, test results, anything unfinished and why.
```
