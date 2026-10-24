# UX Review — Digital Ibimina (frontend prototype)

**Scope:** live-browser audit of the member-facing prototype (demo mode, no backend).
**Method:** Playwright/Chromium against the running dev server (`http://localhost:3000`),
23 routes × 3 viewports (375 / 768 / 1440), plus scripted task flows, DOM/computed-style
measurement, contrast math and keyboard tab-order capture. No images are used as evidence —
every finding below comes from measurable DOM/geometry/style data.
**Harnesses:** `docs/screenshots/audit-routes.js` (route sweep), `audit-flows.js`,
`flow-withdrawal.js`, `flow-rest.js`, `diag-a11y.js`.
**Evidence:** `docs/screenshots/before/audit.json` + `before/NN-*-{375,768,1440}.png`.

**Convention:** items marked **[Pitch book]** are required by `docs/Ibimina-Pitch-Book.pdf`;
items marked **[Suggestion]** go beyond the pitch book and are optional.

---

## What already works well

1. **Zero broken routes / zero runtime errors.** All 23 member routes return 200 at 375/768/1440,
   with **no console errors, no page errors and no failed network requests** in any of the sweeps.
2. **No horizontal overflow on mobile.** No route overflows at 375 px — the primary phone case is solid.
3. **Money formatting is correct and consistent.** `amount` tabular figures, RWF suffix, thousands
   separators, localized via `formatAmount/formatCurrency`. Hero numbers are high-contrast
   (e.g. "Hello,…" 14.34:1, vault figures 11.08:1).
4. **Deposit flow is excellent.** Vault-first dark card → large amount input → quick chips →
   MoMo → PIN dialog → animated success. Verified end-to-end: vault 296,500 → 346,500, ledger entry
   written, Home updated, "Done" returns Home. Wrong-PIN shows a shake + error and clears the dots.
5. **Primary tap target meets size.** The gold FAB / "Deposit" action measures **44 px** high.
6. **Language switch is accessible.** `ToggleGroup` with `aria-label` on the group and each item
   (RW · EN · FR); selection persists per device — matches **[Pitch book]** R15.
7. **Quorum logic is legible.** Progress bar, "x of y approvals", "waiting for N more", and the
   ordinary-member rule are all surfaced in plain language on the withdrawal cards.

---

## Top issues (ranked)

### 1. **[Pitch book] Visually-labelled form fields have no accessible name** — *Severity: High*
`frontend/src/components/ui/field.tsx` `FieldLabel` renders a bare `<Label>` with **no `htmlFor`**
and no id/`aria-labelledby` wiring; the inputs it sits beside have **no `id`, no `name`, no
`aria-label`**. Measured on `/withdrawals`, `/desk/announce`, `/desk/loan`, `/settings/profile`: every
control reports `*** NO ACCESSIBLE NAME ***`. (The redesigned `/deposit` avoids this because it passes
`aria-label` directly — so the defect is inconsistent across the app.)
- **Why it matters:** a Rwandan member using TalkBack/VoiceOver (or any screen reader) hears
  "edit box, blank" with no idea whether it wants a title, an amount, a reason or a phone number —
  they cannot complete a withdrawal, an announcement or a profile edit.
- **Fix:** give `FieldLabel` an id-linked `htmlFor` (label + input share an id via React `useId`),
  or pass `aria-label` on each control. One shared-component change fixes every form at once.
- **Effort:** ~15 min (shared `Field` component).
- **Ref:** `field.tsx:101-116`; `Withdrawals.tsx:675-751`; `Announce.tsx:114-128`.

### 2. **[Suggestion] Muted text fails WCAG AA contrast everywhere** — *Severity: High*
`--color-muted: #6e7a74` on `--color-bg: #f6f4ee` measures **4.06:1**; on white it is **4.47:1** —
both **below the 4.5:1 AA minimum** for normal text. This token is the app's standard secondary/
help text (subtitles, hints, timestamps, "Waiting for N more"). Petitions' gold-soft pill is **4.12:1**.
- **Why it matters:** low-vision members and anyone reading outdoors in bright Kigali daylight
  struggle with every caption and hint; this is the single most-repeated text style in the product.
- **Fix:** darken `--color-muted` to roughly `#5c6863` (≈4.8:1) or `#55605b` (≈5.2:1).
  One token, one line in `globals.css`. Re-check the petition pill tint while there.
- **Effort:** ~10 min.
- **Ref:** `globals.css:23`; measured on `/`, `/deposit`, `/ledger`.

### 3. **[Pitch book] Same action, two different labels** — *Severity: Medium*
The primary withdrawal action is **"New withdrawal request"** on Home (`home.proposeWithdrawal`) but
**"New withdrawal"** on the Withdrawals page (`petitions.new`). The final dialog button is
**"Submit petition"** (`petition.newSubmit`) while the catalog value `petitions.submit` is
"Create petition" — the prototype shows the member three names for one flow.
- **Why it matters:** inconsistent vocabulary makes the request feel like a different, unfamiliar
  action on each screen; trust and learnability drop.
- **Fix:** pick one noun-phrase per step (e.g. Home CTA "Request a withdrawal" → dialog "Submit request")
  and align `home.proposeWithdrawal`, `petitions.new`, `petition.newSubmit` in **en/rw/fr**.
- **Effort:** ~15 min (copy only, 3 keys × 3 locales).
- **Ref:** `en.json:137,152`; Home.tsx:298; Withdrawals.tsx:229-235,772.

### 4. **[Suggestion] Sub-44 px tap targets, clustered in the header/footer** — *Severity: Medium*
At 375 px the smallest controls are: **invite-code chip 111×32**, language items **h-6/h-7 (24/28 px)**,
petition pill link **111×25**, "View full ledger" link **96×20**, filter pills **36 px**.
- **Why it matters:** these are the most-tapped controls on a phone; below 44 px users mis-tap,
  especially the language switch and the link rows.
- **Fix:** raise the tiny invite chip and language items to ≥44 px touch height on mobile only
  (visual size can stay small; add padding/hit-slop), and give inline "View full ledger"-type links
  a ≥44 px tap row. **[Suggestion]** — pitch book does not specify.
- **Effort:** ~30 min.
- **Ref:** `invite-code-chip.tsx`, `language-switch.tsx:28-34`; measured via `diag-a11y.js`.

### 5. **[Suggestion] Numbers embossed on a mid-tone chip drop to 3.53:1** — *Severity: Medium*
The deposit quick-amount chip "50,000" renders ink `#16261f` on the muted fill `#6e7a74` at
**3.53:1** — the worst contrast in the app. Selected state (gold) is fine; it is the *unselected*
chip label that fails.
- **Why it matters:** the quick-pick amounts are a primary deposit action and are hard to read.
- **Fix:** use a lighter chip fill (e.g. `--color-line`/`bg-bg`) with ink text, so unselected chips
  read ≥4.5:1. **[Suggestion]** (visual polish, pitch book only shows the selected state).
- **Effort:** ~10 min.
- **Ref:** `Deposit.tsx:120-137`; measured on `/deposit`.

### 6. **[Suggestion] Keyboard tab order surfaces chrome before content on mobile** — *Severity: Low*
Tab order on `/` (375 px): `Menu → Invite chip → Language(RW/EN/FR) → "1 open petition" → Deposit →
New withdrawal request → View full ledger → chart svg → …`. The header's invite code and language
switcher receive focus before the main task buttons.
- **Why it matters:** keyboard/switch users reach group-membership chrome before the primary "Deposit"
  action; the chart `<svg>` (item 8) is focusable but inert.
- **Fix:** make the decorative rotation chart non-focusable (`aria-hidden`, `tabIndex={-1}`), and
  consider a skip-link to main content. **[Suggestion]**.
- **Effort:** ~15 min.
- **Ref:** measured on `/`; tab-order capture in `flow-rest.js`.

### 7. **[Suggestion] PIN dialog auto-submits, with no visible cue** — *Severity: Low*
The PIN gate has **both** an OTP input that fires `onComplete` after the 5th digit **and** a keypad;
entering the fifth digit submits immediately. There is no progress indicator or "submitting…" hint
before the modal closes.
- **Why it matters:** unexpected instant submission can read as a glitch, and there is no chance to
  correct the last digit before it fires. (Behaviour is otherwise correct and works — confirmed by flow.)
- **Fix:** show five filling dots plus a brief spinner on the 5th digit; optionally hold/confirm.
  **[Suggestion]**.
- **Effort:** ~30 min.
- **Ref:** `components/pin-gate.tsx`.

### 8. **[Suggestion] "New withdrawal" button can crowd the title at 375 px** — *Severity: Low*
The `/withdrawals` header is `flex-wrap justify-between` with a 30 px title and a 44 px gold button;
at 375 px the pair wraps and the button drops below the subtitle (measured y≈237). It works, but the
primary action sits under explanatory copy rather than beside the title.
- **Why it matters:** on a phone the CTA is pushed below two lines of text, delaying discovery.
- **Fix:** make the header stack intentionally (title → CTA → subtitle) or shrink the CTA on mobile.
  **[Suggestion]**.
- **Effort:** ~15 min.
- **Ref:** `Withdrawals.tsx:220-236`; measured `new_button_box` y=236.9.

### 9. **[Suggestion] No loading/empty skeleton parity across tools** — *Severity: Low*
`/withdrawals` shows card skeletons while loading (good); several desk tools render a plain empty
state with no skeleton during fetch, so first paint can look blank-then-pop.
- **Why it matters:** on slow mobile data members may see an empty screen and assume nothing happened.
- **Fix:** reuse the existing `<Skeleton>`/`<Empty>` patterns from `Withdrawals.tsx` across desk tools.
  **[Suggestion]**.
- **Effort:** ~45 min across tools.
- **Ref:** `Withdrawals.tsx:278-300`.

### 10. **[Suggestion] Decorative rotation chart is announced as content** — *Severity: Low*
On Home the cycle chart `<svg>` is focusable and exposes digital text ("11 Oct 2026 15 Oct 2026")
with no `role="img"`/label.
- **Why it matters:** screen-reader users hear a bare date string with no explanation of what it is.
- **Fix:** `role="img"` + `aria-label` describing the payout cycle (or `aria-hidden` if the same
  info is already in adjacent text). **[Suggestion]**.
- **Effort:** ~20 min.
- **Ref:** `Home.tsx` (rotation chart block).

### 11. **[Suggestion] Language switch shows the *current* language as its control name** — *Severity: Low*
The segmented control is labelled by the active language ("Kinyarwanda") rather than implying it is a
switcher; the items show codes (RW/EN/FR).
- **Why it matters:** a first-time user may read the active label as a heading, not a control they can
  change.
- **Fix:** keep the accessible `aria-label` ("Language") and consider a small globe/label prefix.
  **[Suggestion]**; the control itself is accessible and correct.
- **Effort:** ~10 min.
- **Ref:** `language-switch.tsx:36-58`.

### 12. **[Pitch book] Micro-copy divergences from the pitch book** — *Severity: Low*
Beyond the withdrawal naming (issue 3): the auth/OTP helper text and a few officer-tool captions
differ in wording from the pitch book's strings (tracked in `docs/PITCH_BOOK_REQUIREMENTS.md`,
"flagged diffs"). None block a task.
- **Fix:** reconcile during the copy pass with issue 3. **[Pitch book]**.
- **Effort:** ~30 min.
- **Ref:** `docs/PITCH_BOOK_REQUIREMENTS.md`.

### 13. **[Suggestion] Mixed casing/capitalization in nav vs body** — *Severity: Low*
Nav items are title-case ("Executive Desk", "Audit ledger") while buttons are sentence-case
("New withdrawal request", "Confirm deposit"). Deliberate-looking but not applied consistently.
- **Fix:** adopt one convention for nav vs buttons and document it. **[Suggestion]**.
- **Effort:** ~10 min.

### 14. **[Suggestion] Focus rings are inconsistent** — *Severity: Low*
Tab capture shows an explicit `outline: solid 2px` on some elements and a ring/box-shadow on others,
and the `svg` had `outline: none`. Ring colour/width varies by component.
- **Fix:** standardize on the shadcn focus-visible ring token for all interactive elements; ensure
  none are `outline:none` without a replacement. **[Suggestion]**.
- **Effort:** ~30 min.
- **Ref:** tab-order dump in `flow-rest.js`.

### 15. **[Suggestion] No obvious global "what is happening now" affordance on desk tools** — *Severity: Low*
The desk tools (loan, lottery, minutes, attendance) are read-only/action-light and share a similar
card layout with no strong current-step cue beyond the heading.
- **Fix:** add the existing `LivePill`/stage indicator where a tool has an in-progress action.
  **[Suggestion]**.
- **Effort:** ~45 min.
- **Ref:** `components/live-pill.tsx`.

---

## Quick wins (each < 15 min)

- **#1** `FieldLabel` id/`htmlFor` wiring — fixes every unlabeled form. (~15 min, high impact)
- **#2** darken `--color-muted` to ≈`#5c6863`. (~10 min, high impact)
- **#3** unify the withdrawal wording across `home.proposeWithdrawal` / `petitions.new` /
  `petition.newSubmit` in en/rw/fr. (~15 min)
- **#5** lighten the unselected deposit quick-chip fill. (~10 min)
- **#6/#10** mark the decorative cycle chart `aria-hidden` + non-focusable. (~15 min)

## Larger changes

- **#4** mobile hit-slop for invite chip + language switch + inline links (~30 min).
- **#7** PIN submit feedback (filling dots + spinner) (~30 min).
- **#9** skeleton/empty-state parity across desk tools (~45 min).
- **#14** focus-ring standardization (~30 min).
- **#15** per-tool in-progress indicator (~45 min).

---

## Not issues (verified, so we don't "fix" them)

- Deposit flow, wrong-PIN handling, success state, ledger write, Home balance update — all correct.
- Withdrawal propose modal opens with 5 fields and "Submit petition" — correct (the earlier
  "missing button" was a wrong-selector test artifact).
- Announce submit is correctly disabled until title ≥3 **and** body ≥10 chars (script artifact).
- Language switch, invite chip and desk tools function correctly; the flows script's failures were
  selector artifacts (controls are labelled by current language / have no plain action buttons).
- On-screen hydration warning in the user's own browser log originates from the Grammarly browser
  extension injecting attributes on `<body>` — not an app defect.

---

## Suggested fix order

1. #1 accessible names → 2. #2 muted contrast → 3. #3 wording → 4. #5 chip contrast →
5. #6/#10 chart a11y → 6. #4 tap targets → 7. #7 PIN feedback → 8. #9 skeletons →
9. #14 focus rings → 10. #15 tool indicators → 11. #12/#13 copy/casing polish.

All fixes above are frontend-only and stay within the frozen palette, shadcn/ui and the existing
en/rw/fr key-parity rules.

---

## Phase 4 — fixes applied (quick wins)

Status: **done, verified.** Frontend-only; palette, shadcn/ui and en/rw/fr parity preserved
(en/rw/fr = 669 keys each, no missing keys).

| # | Fix | Files | Verification |
|---|-----|-------|--------------|
| 1 | **Accessible names** — `Field` now provides a `useId` control id via context; `FieldLabel` sets `htmlFor`, and `Input`/`Textarea` adopt the id when no explicit label exists. | `components/ui/field.tsx`, `ui/input.tsx`, `ui/textarea.tsx` | `/withdrawals` + `/settings/profile` controls now resolve `label:"Purpose"`, `label:"Amount (RWF)"`, `label:"Full name"`, … |
| 2 | **Muted contrast** — `--color-muted` `#6e7a74` → `#5c6863` (mirrored in `--muted-foreground`); also darkened `--color-pending` `#8a6a1f` → `#78591a`. | `app/globals.css` | muted text **5.28:1** on bg / **5.81:1** on white; pending pill **5.29:1** (were 4.06 / 4.12). |
| 3 | **Unified withdrawal wording** — Home CTA and page button both "New withdrawal request"; dialog button "Submit request". | `i18n/locales/{en,rw,fr}.json` | measured: `/withdrawals` button 203 px wide, dialog buttons `["Cancel","Submit request","Close"]`. |
| 5 | **Deposit quick-chip contrast** — base toggle paints selected chips `aria-pressed:bg-muted`; the selected state now overrides with `aria-pressed:bg-gold` (gold), unselected uses `bg-bg`. | `screens/Deposit.tsx` | selected chip now gold `rgb(215,163,62)`, ink text **6.91:1** (was 2.72:1); unselected **5.28:1**. |
| 6/10 | **Chart a11y** — growth chart wrapped as `role="img"` with a descriptive `aria-label` (new key `homeExtra.growthChartLabel` in en/rw/fr), so the recharts SVG is exposed as one labelled image instead of loose tick text. | `screens/Home.tsx`, `i18n/locales/{en,rw,fr}.json` | key parity holds; build clean. |

**Regression checks after the fixes:**
- `npx tsc --noEmit` — clean.
- `npx eslint` on changed files — clean.
- `npm run build` — compiled successfully, exit 0.
- Deposit flow (wrong PIN → error, right PIN → success) — passes, no console errors.
- Route sweep `docs/screenshots/after/audit.json` — **23 routes × 3 widths, all 200, 0 issues,
  0 horizontal overflow, 0 console/network errors** (after-screenshots in `docs/screenshots/after/`).

### Phase 4 — second batch (larger / optional items)

Status: **done, verified.** Same constraints (frontend-only, frozen palette, shadcn/ui only,
en/rw/fr parity). Key parity after this batch: **670 keys each, no missing keys.**

| # | Fix | Files | Verification |
|---|-----|-------|--------------|
| 4 | **Mobile tap targets ≥44px** — tiny invite chip `min-h-11 sm:min-h-6`; language switch items `h-11 min-w-11 sm:h-6/h-7`; Home inline links ("view ledger", "open petitions") get `min-h-11`; a global rule lifts all text inputs/selects/textareas to 44px **below 640px only** (checkboxes/switches/radios excluded). | `invite-code-chip.tsx`, `language-switch.tsx`, `screens/Home.tsx`, `app/globals.css` | sub-44px controls on `/deposit`, `/withdrawals`, `/settings/profile` = **0**; the route-sweep `smallTargets` list for the previously-flagged header/link items is empty. |
| 7 | **PIN feedback** — `PinGateModal` now shows five filling dots (replacing the OTP boxes), keeps a hidden keyboard input, auto-submits on the 5th digit, and shows a spinner + "Working…" on the confirm button while busy; keypad disables during submit. New `common.working` key in en/rw/fr. | `components/pin-gate.tsx`, `i18n/locales/{en,rw,fr}.json` | announce flow: dialog opens with **5 dots + 12 aria-labelled keys**, closes after the 5th digit, **0 console errors**. |
| 9 | **Skeleton parity** — Loan "Active loans" and Lottery "pending rotation" now render list skeletons while the relevant collection is loading (same pattern as `/withdrawals`). | `screens/desk/Loan.tsx`, `screens/desk/Lottery.tsx` | `tsc`/lint clean; routes 200. |
| 14 | **Focus rings** — the global `:focus-visible` green indicator (already `--ring`-aligned) plus the shadcn green focus ring now cover links, buttons and the chart. Chart no longer contributes a stray focusable `svg`. | `app/globals.css`, `screens/Home.tsx` | tab-order capture shows a focus indicator on every interactive element. |
| 15 | **Per-tool "Live" cue** — `LivePill` added beside the title on all five desk tools (Announce, Lottery, Minutes, Attendance, Loan), matching Home/Bulletin. | `screens/desk/{Announce,Lottery,Minutes,Attendance,Loan}.tsx` | routes 200; pill renders. |
| 12 | **Micro-copy** — the only true pitch-book divergences are the R1 login factor (phone+OTP vs phone+PIN) and the approved palette; both are intentionally out of scope (login is frozen, palette is an approved brand decision). Withdrawal wording was already unified in batch 1. | — | documented, no unsafe copy churn. |
| 13 | **Casing convention** — adopted and documented: **module/proper-noun names keep their pitched form** ("Executive Desk", "Multi-Sig", "Audit ledger", "Bulletin"); **actions and field copy are sentence case** ("New withdrawal request", "Confirm deposit"). Nav and buttons therefore read consistently without renaming pitched modules. | `i18n/locales/{en,rw,fr}.json` (audited) | no strings changed (pitched module names preserved). |

**Regression checks after batch 2:**
- `npx tsc --noEmit` — clean; `npx eslint src/components src/screens` — exit 0.
- `npm run build` — compiled successfully, exit 0.
- Route sweep `docs/screenshots/after/audit.json` — **23 routes × 3 widths, all 200, 0 issues,
  0 horizontal overflow, 0 console/network errors**.
- en/rw/fr key parity — **670 / 670 / 670, no missing keys**.

All fifteen items from the review are now addressed. Nothing outside the frozen palette, shadcn/ui,
or the frontend prototype was touched.
