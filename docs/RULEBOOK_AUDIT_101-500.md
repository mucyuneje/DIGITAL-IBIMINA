# Ibimina Rulebook 101-500 - Approval Checklist

This is the row-level companion to the section audit. It uses the exact 101-500 rule text and the current codebase as evidence.

## How to use

1. Open `RULEBOOK_AUDIT_101-500.csv` in Excel or Google Sheets.
2. Filter by `Priority` (`P0`, `P1`, `P2`, `P3`, `Hold - audit only`, `Hold - suggestion`).
3. Put `Approve`, `Reject`, or `Defer` in the `Approval` column.
4. Do not approve section A changes without a separate decision: rules 101-120 are audit-only.

## Snapshot

| Status | Count |
|---|---:|
| Applied | 140 |
| Partial | 102 |
| Not applied | 135 |
| Suggestion | 23 |
| **Total** | **400** |

This refines the earlier section-level summary. The counts now include the P0a fixes (238, 329, 427, 429) plus the partial improvements to 274, 275 and 330. Use this CSV as the approval record.

## Section counts

| Section | Applied | Partial | Not applied | Suggestion |
|---|---:|---:|---:|---:|
| A - Welcome, onboarding and sign-in (audit only) | 8 | 4 | 8 | 0 |
| B - Home dashboard | 6 | 8 | 6 | 0 |
| C - Deposit flow | 12 | 2 | 5 | 1 |
| D - Withdrawals and multi-signature voting | 12 | 6 | 5 | 2 |
| E - Executive Desk | 3 | 5 | 2 | 0 |
| F - Announcements | 3 | 0 | 5 | 2 |
| G - Minutes | 2 | 2 | 4 | 2 |
| H - Attendance | 5 | 1 | 3 | 1 |
| I - Loans | 7 | 4 | 8 | 1 |
| J - Penalties | 2 | 2 | 3 | 1 |
| K - Rotation and lottery | 7 | 1 | 5 | 2 |
| L - Members and roles | 7 | 6 | 3 | 1 |
| M - Bulletin and group chat | 6 | 4 | 8 | 2 |
| N - Audit ledger | 3 | 5 | 10 | 2 |
| O - Settings, profile and security | 5 | 6 | 2 | 2 |
| P - Help | 2 | 2 | 4 | 0 |
| Q - App shell, sidebar and navigation | 10 | 0 | 1 | 1 |
| R - Design system and shadcn/ui | 4 | 12 | 3 | 1 |
| S - Data display | 7 | 4 | 4 | 0 |
| T - Notifications | 2 | 5 | 2 | 1 |
| U - Live data, offline and sync | 0 | 4 | 6 | 0 |
| V - Security and privacy UX | 9 | 3 | 3 | 0 |
| W - Trust, ethics and disputes | 4 | 4 | 1 | 1 |
| X - Accessibility, extended | 4 | 4 | 2 | 0 |
| Y - Localization, extended | 6 | 2 | 2 | 0 |
| Z - Performance and engineering | 4 | 5 | 6 | 0 |
| AA - Testing and quality | 0 | 0 | 10 | 0 |
| BB - Analytics and research | 0 | 0 | 8 | 0 |
| CC - Release and governance | 0 | 1 | 6 | 0 |

## P0 shortlist

These are the correctness/security blockers I recommend deciding before any broad polish work:

- **Rule 174** - Recipient name and MoMo number are visible to all voters before they vote.  
  *Gap:* Recipient name is visible; MoMo is masked for ordinary members, conflicting with rule 174.  
  *Action:* Decide: keep phone masking or show recipient phone to all voters.
- **Rule 238** - The borrower sees "Repay my loan" only on their own loan.  
  *Status:* Fixed in P0a. The borrower or an officer can repay; unrelated members are rejected.  
  *Action:* Done; verified as `demo-m4` end-to-end.
- **Rule 329** - Changing the phone number requires a PIN and verification.  
  *Status:* Fixed in P0a for the demo. A 6-digit code (demo `123456`) and the 5-digit PIN are both required.  
  *Action:* Replace the demo OTP with a server-issued challenge in P0b.
- **Rule 330** - Group settings (officers only): name, monthly contribution, cycle length, interest rate, penalty rules. Each change asks for a PIN and writes a ledger or bulletin entry.  
  *Status:* Partial in P0a. Name/contribution are officer-only, PIN-verified and audited; cycle/interest/penalty rules and member notification are still missing.  
  *Action:* Add the remaining rule fields and a bulletin/notification.
- **Rule 417** - Store PINs with a salted, slow hash on the server (for example argon2 or bcrypt), not plain SHA-256 in the browser.  
  *Gap:* Demo uses browser WebCrypto SHA-256 + salt; no server bcrypt/argon2 or functions.  
  *Action:* Move PIN hashing to server-side bcrypt/argon2.
- **Rule 426** - Hiding a button is not security. Enforce every rule on the server (Firestore rules).  
  *Gap:* No firestore.rules/functions in the repo; hiding buttons is the only guard.  
  *Action:* Add Firestore rules and Cloud Functions enforcement.
- **Rule 427** - Write an audit entry for role changes and group-rule changes.  
  *Status:* Fixed in P0a. Zero-amount `role_change` and `group_rule_change` entries record the actor, PIN verification and vault balance.  
  *Action:* Done; verified both paths end-to-end.
- **Rule 429** - Set secure headers (CSP, frame protection) in Next.js.  
  *Status:* Fixed in P0a. CSP, frame protection, nosniff, Referrer-Policy, Permissions-Policy, COOP, production HSTS and `poweredByHeader: false` are set.  
  *Action:* Done; verified with `curl` against the running app.
- **Rule 476** - Write end-to-end tests (Playwright) for deposit, vote, loan, lottery and announcement.  
  *Gap:* No Playwright E2E tests.  
  *Action:* Add Playwright E2E for deposit/vote/loan/lottery/announcement.
- **Rule 477** - Unit-test quorum, ordinary-member rule, interest and balance rules.  
  *Gap:* No unit tests for quorum/interest/balance.  
  *Action:* Add unit tests for quorum/ordinary-member/interest/balance.
- **Rule 480** - Test edge groups: 1 member, 3 members (no ordinary-member rule), 100 members.  
  *Gap:* No 1/3/100-member edge tests.  
  *Action:* Add edge-group tests (1/3/100).
- **Rule 481** - Test zero balance, very large numbers and very long names.  
  *Gap:* No zero/large/long-name tests.  
  *Action:* Add zero/large/long-name tests.

## Suggested P0 sequencing

- **P0a - complete:** 238 (member repayment), 329 (phone-change PIN + demo verification), 427 (role/rule audit entries), 429 (security headers).
- **P0b - remaining backend/test infrastructure:** 417 (server PIN hashing), 426 (Firestore rules/functions), 476, 477, 480, 481 (tests).
- **Decision needed:** 174 (keep masking or show recipient phone to all voters).
- **Partial:** 330 (name/contribution are now PIN-verified and audited; cycle/interest/penalty rules and notifications remain).

## Built suggestions that need a governance decision

- **Rule 315** - Offer CSV or PDF export for the treasurer. *(Suggestion)*  
  *Status:* Suggestion  
  *Gap:* CSV export is implemented in Settings > Export, but the rule is a suggestion; confirm approval or remove.  
  *Action:* Confirm approval or remove CSV export (suggestion).
- **Rule 360** - Add a command palette or global search for power users. *(Suggestion)*  
  *Status:* Suggestion  
  *Gap:* Command palette is implemented in the app shell, but the rule is a suggestion; confirm approval or remove.  
  *Action:* Confirm approval or remove command palette (suggestion).

## Approval note

P0a (238, 329, 427, 429) is applied and verified. Rule 330 is partially applied; rules 274 and 275 were tightened as part of the role-change work. The `Approval` column is still blank for your sign-off, and rule 174 still needs a product decision: keep recipient-phone masking or show the recipient phone/MoMo to all voters.
