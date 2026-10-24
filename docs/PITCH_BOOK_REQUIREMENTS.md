# Ibimina — Pitch Book Requirements & Design Tokens

Source of truth: `docs/Ibimina-Pitch-Book.pdf` (27 pages, "Firebase Edition · Product, Technology & Roadmap").
All page numbers below refer to the printed page number in the PDF footer (which equals the PDF page index).

Extraction method: text via PyMuPDF; colours sampled programmatically from the PDF's vector fills and text spans on every rendered page (the review environment cannot display images directly, so hex values below are measured from the file, not eyeballed).

> Note: the pitch book's numbers (1,240,000 RWF vault, 25,000/200,000 cycle, 8 members, IBI-482913) are explicitly illustrative (p.1, p.24). The app must support any number of members, contribution amounts and balances.

---

## 1. Design language (sampled from the mockup pages)

### 1.1 Colour palette (measured hex)

| Token | Hex | Where it appears in the PDF |
|---|---|---|
| Gold / primary | `#F1B705` | Numbered callout markers, primary buttons ("Deposit via MoMo", "Log in", "Approve"), badge fills, brand accents (p.1, 6, 8, 12, 14, 18) |
| Ink (primary text) | `#16241D` | Headings and body text on every page |
| Deep green | `#0A5D3A` / `#0B5D3B` | Green buttons/links, "Approve"-adjacent accents, hover `#0B6A3F` (p.7, 12, 19) |
| Green tints (surfaces) | `#D6EFE0`, `#E2F1EA`, `#D3EADC`, `#BFE3D0` | Cover phone-panel background, sidebar tint blocks, soft chips, progress tracks (p.1, 7, 9, 13) |
| Canvas / page bg | `#F4F7F5` | App background behind cards |
| Card surface | `#FFFFFF` | All cards, dialogs |
| Muted surface | `#EDF1EE` | Secondary panels, table zebra, vote rows (p.13, 19) |
| Borders | `#DEE6E0`, `#C4CDC6` | Card and divider borders |
| Muted text | `#5D6B63`, `#8A978F`, `#4A5750` | Secondary labels, captions, table headers |
| Success green | `#12865A` | "Paid" badges, live dot, progress fill |
| Danger red | `#D54545`, light `#FADADA` / `#FBE9E9` | Urgent banner (p.8), Urgent badge (p.16), Rejected status |
| Amber badge | text `#8A6400` / `#9A7300`, bg `#FFEFC2` / `#FFF6D5` | "Voting" status badge (p.12), highlighted "Selected" tool card (p.15) |
| Info blue | `#2D85DE`, bg `#DCEBFA` | "Event" bulletin badge (p.16), informational chips |
| Phone bezel | `#10161A` / `#15231D` | Dark phone frame around every phone mockup |

### 1.2 Typography
- The PDF is set in DejaVu Sans (Bold for headings/numbers, Regular for body). Treat as "a clean humanist sans, bold weights for figures".
- Vault balance and money figures are the largest numbers on screen (cover: 50pt bold equivalent).
- Small caps / uppercase tracking used for table headers (`TXN ID`, `TYPE`, `INITIATED BY`, p.19) and eyebrow labels.

### 1.3 Components
- **Cards**: white, ~12–16px radius, thin border, generous padding. Section labels above content in muted uppercase or semibold.
- **Badges**: `Paid` (green), `Voting` (amber on `#FFEFC2`), `Urgent` (red on `#FADADA`), `Minutes` (neutral grey), `Event` (blue on `#DCEBFA`) — p.12, 16, 18.
- **Buttons**: primary = gold `#F1B705` with dark text, full-width on phone; secondary = white/outlined. Approve (gold) and Reject (outlined) sit side by side (p.12).
- **Progress bars**: approval tally and cycle progress are thin rounded bars; fill green when satisfied, amber while short (p.8, 12).
- **Urgent red banner**: full-width, red-tinted, pulsing, only on Home when the member has not voted on an active petition (p.8).
- **Numbered gold callout markers**: gold circles with white numerals ①②③… beside every mockup, keyed to the numbered explanation text (every product page).
- **"Live" pill**: small green dot + "Live" label at the top-right of Home and Bulletin (PC mockups, p.9, 17).
- **PIN keypad**: on the PC deposit flow the PIN dialog shows a 3×4 numeric pad (1–9, 0, ⌫) (p.11).
- **Navigation rules**: phone = five bottom tabs; PC = left sidebar. Phone header carries group name, invite code, RW·EN·FR switcher and the member's avatar initials (p.8–19 mockup frames).
  - Bottom tabs: **Home ⌂ · Multi-Sig ✔ · Exec Desk ★ · Bulletin ✉ · Audit ≡** (p.1, 8, 12, 14, 16, 18).
  - PC sidebar: brand "Ibimina", group name, the same five items, then an **Invite code** block (`IBI-482913`) and a **Language** block (`RW · EN · FR`) (p.9, 13, 17, 19).
- **Phone frame vs page**: phone mockups sit in a dark bezel; PC mockups in a browser chrome with `🔒 app.ibimina.rw`.

---

## 2. Numbered requirements

Status legend used later: Done / Partial / Missing / Contradicts.

### Chapter 4 — Welcome (p.6–7)
- **R1** Login = phone number + 5-digit PIN; tabs (or equivalent entry points) switch to Create and Join. (p.6)
- **R2** Create asks group name, monthly contribution (RWF), your name, phone, PIN; the creator becomes President and receives an invite code to share. (p.6–7)
- **R3** Join looks up the invite code, assigns the next rotation position, adds the person as a Member. (p.7)
- **R4** Language switches between Kinyarwanda, English, French at any time; the choice is remembered on the device. (p.6)
- **R5** Phone format validated for 078 / 079 / 072 / 073; the PIN is stored only as a SHA-256 hash, never in plain text; login compares the hash. (p.7, p.20)
- **R6** PC welcome: brand panel alongside the same three flows. (p.7)

### Chapter 5 — Home (p.8–9)
- **R7** Urgent banner appears **only** when there is an active petition the member has not voted on; it pulses red and links to it. (p.8, p.9 "Behind the screen")
- **R8** Vault card: group balance plus this cycle's collected-vs-target progress bar. (p.8)
- **R9** Next-payout card: recipient, round number, payout date. (p.8)
- **R10** Cycle checklist: per-member Paid/Pending status so nobody chases the treasurer. (p.8) — the app's Paid/Partial/Not-paid is an allowed extension.
- **R11** PC adds a savings-growth chart (pitch draws it with plain SVG; using the existing shadcn/recharts stack is the correct translation). (p.9)
- **R12** "Live" indicator on Home (and Bulletin). (p.9, 17)
- **R13** Two primary actions: "Deposit via MoMo" and "New withdrawal request". (p.8–9)
- **R14** Phone header: group name, invite code, RW·EN·FR switcher, member avatar. (p.8 mockup frame)
- **R15** PC sidebar: invite-code block and language block below the nav. (p.9)

### Chapter 6 — Deposit (p.10–11)
- **R16** Amount pre-filled with the monthly contribution, editable for part or extra payments. (p.10)
- **R17** MoMo number field (the number the contribution comes from). (p.10)
- **R18** Summary shows "Vault after deposit". (p.10)
- **R19** PIN confirmation is the single choke-point; nothing is recorded until the PIN is correct. (p.10)
- **R20** PC: the PIN prompt is a centred dialog above the dashboard (mockup shows a 3×4 keypad). (p.11)
- **R21** Honest note (product truth, not UI): a deposit is *recorded* after PIN confirmation; a live request to the MoMo network is a planned integration. (p.10, ch.14 #9)

### Chapter 7 — Multi-sig withdrawals (p.12–13)
- **R22** Every petition shows amount, reason and recipient to all members before anyone votes. (p.12)
- **R23** Live approvals tally: progress bar against the 75% rule (8 members → 6 approvals). (p.12)
- **R24** Member safeguard: once the group has 4+ people, at least one approving vote must come from an ordinary Member. (p.12, p.20)
- **R25** Approve/Reject open the PIN prompt first — votes cannot be cast by accident. (p.12)
- **R26** History of past petitions (approved/rejected) visible. (p.12)
- **R27** The creator's own Yes vote is counted when the petition is created. (p.13)
- **R28** When quorum is met: vault debited, payout written to the ledger, status changes live for everyone. (p.13)
- **R29** PC: petition detail and a voter table (member / role / vote, incl. "Waiting") side by side. (p.13)

### Chapter 8 — Executive Desk (p.14–15)
- **R30** Five tools, every one PIN-gated: **Announce** (urgent / normal / event notices), **Minutes** (agenda, resolutions, actions), **Emergency loan** (30 / 60 days · 5% interest, auto-calculated), **Rotation lottery** (re-shuffle payout order), **Attendance** (record who came). (p.14)
- **R31** Phone: "Quick loan preview" card — Principal 100,000 → Interest 5% 5,000 → Total due 105,000 (illustrative instant calculator). (p.14)
- **R32** PC: tool list on the left, roomy form on the right (two-pane). (p.15)
- **R33** Lottery updates every member's turn and the group's recipient in one atomic batch; minutes and attendance are stored as special announcements so they appear in the Bulletin feed automatically. (p.15)
- **R34** Issuing a loan records principal, interest, total due, term and who authorised it. (p.15)

### Chapter 9 — Bulletin & chat (p.16–17)
- **R35** Announcements colour-coded by priority with author name and role visible. (p.16)
- **R36** Meeting minutes as structured records (agenda / resolutions / next actions). (p.16)
- **R37** Group chat: live thread, messages appended, never edited or deleted; sender name + role recorded. (p.16)
- **R38** PC: feed and chat side by side. (p.17)

### Chapter 10 — Audit ledger & loans (p.18–19)
- **R39** Ledger is read-only for everyone, newest first, every entry has a TXN ID and timestamp. (p.18)
- **R40** Entry types: MoMo (deposit), cash, payout, loan, repayment, penalty. (p.18–19)
- **R41** Filter tabs: All / Deposits / Payouts / Loans / Penalties. (p.18–19)
- **R42** PC table columns: **TXN ID · TYPE · INITIATED BY · DETAILS · VERIFIED (PIN ✔) · AMOUNT (RWF)**. (p.19)
- **R43** "Repay my loan" action from the ledger with PIN confirmation; vault credited. (p.18)
- **R44** Known gap closed as a "Now" item: loan issuance and repayment must write ledger lines. (p.19, ch.14 #4)

### Chapter 11 — Trust & security (p.20)
- **R45** Identity = phone + 5-digit PIN, stored only as SHA-256 hash. (p.20)
- **R46** Every sensitive action re-checks the PIN at the moment of action: voting, depositing, petitions, loans, announcements, repayments (ch.8 adds lottery, minutes, attendance). (p.20, p.14)
- **R47** Group consent: officers cannot reach quorum alone; voter names, roles and decisions are visible on the petition. (p.20)
- **R48** Disputed history answered by a read-only, timestamped ledger. (p.20)

### Chapter 12–13 — Architecture & data (p.21–22)
- **R49** Live updates without refresh — listeners per collection, filtered to the member's group. (p.21–22) [Stack in the pitch (React/Vite/Context) is illustrative; the rule is "live, not eventually".]
- **R50** Three languages, choice saved on the device. (p.21)
- **R51** Seven collections, each document tagged with its group:
  - `groups`: name, invite code, vault balance, cycle round, target payout, monthly contribution, current recipient, next payout date
  - `members`: name, phone, role, hashed PIN, cycle status, total saved, rotation order
  - `petitions`: title, reason, amount, recipient, status, votes, required ratio
  - `announcements`: title, content, author, priority, timestamp; also minutes and attendance
  - `chatMessages`: sender, role, message, timestamp
  - `loans`: borrower, principal, interest, total due, term, status, authoriser
  - `auditLogs`: TXN ID, type, amount, initiator, details, timestamp, PIN verified (p.22)
- **R52** Phone numbers must be unique across all groups (flat collections with `groupId` make the database-wide search straightforward). (p.22)
- **R53** Writes: new documents, partial updates, and one atomic batch for the rotation lottery. (p.22)

### Chapter 14 — Production readiness (p.23) — "Now" items are required fixes
- **R54** (#1, Now) No Firestore security rules shipped; client-side PIN checks can be bypassed → write and test security rules; enforce group membership and quorum on the server.
- **R55** (#2, Now) No PIN attempt limiting (100,000 combinations) → lockout and delay after repeated failures; move verification server-side.
- **R56** (#3, Now) Deposit and payout update the balance by read-then-write → use transactions so simultaneous deposits cannot overwrite each other.
- **R57** (#4, Now) Loans and repayments missing from the ledger → write a ledger entry for every balance change.
- **R58** (#5, Next) Refresh logs you out → persist a secure session.
- **R59** (#6, Next) One phone number can belong to one group only → allow membership in several groups per person.
- **R60** (#7, Next) Email collected but unused → use it for recovery/receipts, or remove the field.
- **R61** (#8, Next) Login screen styling differs from the rest of the app → unify the visual identity, with light and dark themes.
- **R62** (#9, Later) MoMo deposits are recorded, not requested from the network → integrate a MoMo payment provider.

---

## 3. Flagged differences (PDF vs your instructions — no change without approval)

1. **Login factor**: the pitch book logs in with **phone + 5-digit PIN** (R1, R5, p.6/20); your app logs in with **phone + 6-digit OTP** (demo code `123456`) and uses the PIN only for transactions. This is a direct contradiction — flagged, not planned.
2. **Visual identity**: your approved palette (gold `#D7A33E`, green `#1B4332`, warm bg `#F6F4EE`) deliberately differs from the sampled pitch hexes (`#F1B705`, `#0A5D3A`, `#F4F7F5`). Treated as an approved brand decision, not a gap.
3. **Welcome screens**: per your instruction, no changes are planned except where the pitch book contradicts them (item 1 is the only such case).

## 4. Open questions

1. **Chart library**: p.9 says the savings chart is "drawn with plain SVG, so there is no charting library to maintain". Your app uses recharts (already in the stack). Recommendation: keep recharts (your instruction: keep the stack); confirm this is acceptable.
2. **"Pending" vs "Partial"**: p.8 shows a binary Paid/Pending checklist; your three-state Paid/Partial/Not-paid is strictly richer. Confirm we keep three states (recommended).
3. **Cash entries**: R40 lists a "cash" ledger type, but no pitch-book screen shows how a cash entry is recorded (no desk tool). Your schema has `cash_entry` with no action behind it. Should this become an officer desk tool, or stay out of scope?
4. **Next payout date**: R9 shows "Round 5 · 30 Oct" but the pitch never says where the date comes from (no cycle-end-date field in the data model, p.22). Propose: derive from `nextPayoutDate` on `groups` (field listed in R51 but never populated). Confirm.
5. **Bottom-tab Settings**: your mobile bottom bar currently includes a Settings tab; the pitch's five tabs have no Settings (phone settings live behind the avatar). Decision needed on which five tabs to ship (see GAP_ANALYSIS).
