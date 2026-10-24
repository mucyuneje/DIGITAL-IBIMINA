# Ibimina — Security Model

Status: **Phase 3 backend contract.** This document describes what the server
guarantees once the Cloud Functions in `functions/` are deployed together with
`firestore.rules`. It is deliberately short: it lists what is stored, who may
read or write it, and the invariants the code enforces.

The client is **untrusted**. Every rule below is enforced server-side (Admin
SDK inside Cloud Functions). The browser never decides whether a balance may
change, whether a quorum is met, or whether a PIN is correct.

---

## 1. Collections

| Collection | Purpose | Client read | Client write |
|---|---|---|---|
| `groups` | One document per Ikimina: name, invite code, vault balance, cycle, rotation order. | Members of that group only. | **Denied.** Functions only. |
| `members` | One document per (person × group): name, phone, role, rotation position. | Members of that group only (roster). | **Denied.** Functions only. |
| `petitions` | Withdrawal requests + the votes cast on them. | Members of that group only. | **Denied.** Functions only. |
| `announcements` | Bulletin: notices, minutes, attendance. | Members of that group only. | **Denied.** Functions only. |
| `chatMessages` | Group chat. | Members of that group only. | **Denied.** Functions only. |
| `loans` | Emergency loans issued to members. | Members of that group only. | **Denied.** Functions only. |
| `auditLogs` | The immutable ledger. One row per balance change. | Members of that group only, **read-only**. | **Denied — create only through functions, never update, never delete.** |
| `memberCredentials` | Server-only: bcrypt PIN hash, failed attempts, lockout deadline. | **Denied to every client.** | **Denied to every client.** |
| `memberships` | Server-maintained index, one document per signed-in user: the groups they belong to and the member id used in each. | The signed-in user only. | **Denied.** Functions only. |
| `paymentIntents` | Server-only: MoMo payment requests and their confirmation state. | **Denied to every client.** | **Denied to every client.** |

The seven group-scoped collections (`groups`, `members`, `petitions`,
`announcements`, `chatMessages`, `loans`, `auditLogs`) are the pitch book's
data model. `memberCredentials`, `memberships` and `paymentIntents` are
infrastructure the client never owns.

### How membership is proven

`memberships/{uid}` holds `groupIds: string[]` and one entry per group
(`groupId`, `memberId`, `role`, `groupName`). The rules prove membership with a
single read of that one document:

```
isMemberOf(groupId) == request.auth != null
                      && groupId in get(memberships/{request.auth.uid}).data.groupIds
```

Because the path of that read depends only on the caller's uid — never on the
queried document — the rule can be evaluated once per request, and a client can
only ever read the collections of groups it actually belongs to.

---

## 2. Identity, PIN and lockout

- **Authentication** is Firebase Auth with phone OTP. The OTP only proves *who*
  the phone is; it never authorises a money action.
- **Authorisation** is the 5-digit PIN, re-checked **server-side on every
  sensitive action** at the moment of the action (R46): deposit, vote, petition,
  loan issue/repay, penalty, announcement, rotation lottery, PIN change.
- The PIN is stored **only** as a bcrypt hash in `memberCredentials`. The plain
  PIN never leaves the browser, is never logged and is never written to the
  ledger — the ledger only records `pinVerified: true|false`.
- **Lockout**: five wrong attempts lock the member out. The lockout window
  starts at 30 s and doubles with every further failure (30 s, 60 s, 120 s …).
  `failedAttempts` is incremented **inside a Firestore transaction**, so
  parallel attempts cannot lose a count. A correct PIN resets the counter.
- A member who is locked out is told how many minutes remain
  (`errors.pinLocked`); the PIN itself is never echoed back.

---

## 3. Roles

`president`, `treasurer`, `secretary` are officers; `member` is an ordinary
member. Officer-only actions (issue loan, repay loan, record penalty, post
announcement, run the rotation lottery, change roles, change the group) are
refused server-side for ordinary members — the UI gate is a convenience, not
the control.

---

## 4. The seven invariants

1. **One balance change ⇔ one ledger row.** Every mutation of
   `groups.vaultBalance` and its `auditLogs` row are written in the *same*
   Firestore transaction. There is no path that moves money without a row,
   and no path that writes a row without moving money.
2. **The ledger is append-only.** `auditLogs` rows are never updated and never
   deleted — not by clients, not by the functions. A correction is a new row.
3. **`vaultBalance` equals the last ledger row's `balanceAfter`.** Each row
   stores the running balance, so the vault can always be re-derived from the
   ledger and the two can never drift.
4. **The balance never goes negative.** A debit that would overdraw the vault
   is refused inside the transaction, before anything is written.
5. **Quorum is recomputed on the server.** Votes are tallied with
   `frontend/src/shared/quorum.ts`: 75 % of **all** members (not of votes
   cast), the petition creator counts as an automatic Yes, and a group of four
   or more needs at least one approval from an ordinary member — officers
   cannot reach quorum alone.
6. **A petition pays out exactly once.** The settlement (debit + ledger row +
   `status: paid`) happens inside the vote transaction, so a quorum reached by
   two simultaneous votes still debits the vault once.
7. **Every transaction id is unique and immutable.** `txnId` (`TXN-…`) is
   generated once, inside the transaction that changes the balance.

---

## 5. MoMo deposits

A deposit is a *request*, not a movement of money:

1. `recordDeposit` verifies the caller, the PIN and the membership, then asks
   the payment provider for a payment and stores a `paymentIntents` document in
   state `requested`.
2. The vault and the ledger are touched **only** when the provider confirms
   the payment (`confirmed`), and both are written in the **same** transaction.
3. A failed payment writes nothing at all — no ledger row, no balance change.

The bundled provider is a **sandbox**: it simulates the network. Real MoMo
rails (collections API, webhook signature verification, settlement
reconciliation) are integration work and are honestly labelled as such in the
UI.

---

## 6. The demo layer mirrors these invariants client-side only

`frontend/src/services/demo.ts` is an in-browser stand-in used while no
Firebase project exists. It runs the **same** shared code
(`shared/quorum.ts`, `shared/ledger.ts`), keeps the same lockout numbers and
writes the ledger row next to the balance change — but it can only ever
enforce them against the person holding the device. It is a demonstration of
the rules, not the enforcement of them. The rules above are enforced by
`functions/` and `firestore.rules` only.
