# Phase 6 · Ship

**Goal:** a reviewer opens the repo and the live URL and understands, in a few minutes, what was built, why, and that it works.

**Time:** ~4h, Sunday evening. **Depends on:** all earlier phases.

No new features in this phase. Only fixes found during the walkthrough.

---

## Slice 6.1 · Final reseed and walkthrough

**Outcome:** the live site is in a clean, known state and every flow has been clicked through once.

### Steps

1. Run migrations and the seed against the live database.
2. Walk through the script below in a private window.
3. Fix what breaks. Reseed again at the end.

### Walkthrough script

| # | As | Do | Expect |
|---|---|---|---|
| 1 | Visitor | Open the live URL, press "Try the demo" | Landing page, then the login page with demo accounts |
| 2 | New customer | Sign up, place a 3-unit order to Mars | Tracking page, "Order placed", "Paid" |
| 3 | Mars manager | Accept it | Leaves the queue |
| 4 | Captain | Start a Mars trip, add the order, see expected profit | Loss warning for a small trip |
| 5 | Captain | Add more orders, load, lift off, land, deliver each stop | Trip completes |
| 6 | Customer | Open the order | All 8 steps with UTC times |
| 7 | Customer | Place a second order | — |
| 8 | Manager | Reject it with a reason | Customer sees reason and "Refunded" |
| 9 | Admiral | Open the dashboard | The delivered order is counted |
| 10 | Admiral | Change the Water price | Checkout shows the new price, dashboard past numbers unchanged, history has the row |
| 11 | Manager | Open the report | No cost or profit anywhere |
| 12 | Captain | Open earnings | The completed trip is listed |
| 13 | Customer | Paste an `/admiral` URL and another customer's order URL | Redirect home, and not found |

### Acceptance criteria

- [ ] All 13 steps pass on the live URL.
- [ ] No console errors and no failed requests during the walkthrough.
- [ ] Every page is usable at laptop width and at phone width.
- [ ] Every form can be used with the keyboard only, and every input has a label.

---

## Slice 6.2 · README

**Outcome:** the README explains the choices, as the client asked ("explain your choices").

### Sections

1. What it is, in three lines. Live link.
2. Demo users table and a 2-minute tour per role.
3. What I chose to do well, and why: correctness of money and status.
4. Architecture: folder structure, Data Access Layer, Server Actions, one request flow diagram.
5. How correctness is protected: DB constraints, transactions, conditional updates for races, snapshots, tests.
6. Key decisions and trade-offs.
7. Assumptions: every decision from `context.md`, in plain words.
8. Out of scope, and what I would build next.
9. Run locally. Run tests.

### Acceptance criteria

- [ ] A person who has not seen the project can log in as each role within one minute of opening the README.
- [ ] Every decision in `context.md` appears under Assumptions or Decisions.
- [ ] The local setup steps work on a clean clone, followed exactly as written.
- [ ] No mention of features that do not exist.

---

## Slice 6.3 · Video walkthrough **[C9]**

**Outcome:** a 3 to 5 minute screen recording linked from the README.

### Outline

| Time | Content |
|---|---|
| 0:00 | The three pains, in one sentence each |
| 0:30 | An order from checkout to delivered, across three roles |
| 2:00 | Admiral dashboard, price change, snapshot proof |
| 3:00 | Loss trip warning and waiting orders |
| 3:45 | Code: one service function, the race-safe update, the tests |
| 4:30 | What I would build next |

### Acceptance criteria

- [ ] Under 5 minutes. Recorded on the live URL.
- [ ] The link in the README opens without a login.

---

## Slice 6.4 · Submission check

### Acceptance criteria

- [ ] Repo is public. No `.env`, no secrets, no agent files in the history.
- [ ] CI is green on the last commit.
- [ ] Live URL works in a private window, on a second device.
- [ ] `context.md`: all phases marked done, final changelog entry.
- [ ] Commit history reads as a clear sequence of small steps.
- [ ] The GitHub account used for the push was confirmed.

### Edge cases

| Case | Expected |
|---|---|
| A secret was committed by mistake at any point | Rotate the secret, do not just delete the file |
| Live database was changed by testing after the last seed | Reseed as the final step |
| Neon database is asleep on first visit | First load is slower. Mentioned in the README |
