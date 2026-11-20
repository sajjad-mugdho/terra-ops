# Phase 3 · Client pains

**Goal:** make the two hidden problems visible: trips that lose money, and orders that nobody picks.

**Time:** ~1.5h, Sunday midday. **Depends on:** Phase 2.

Why this phase exists: captains choose what to carry and pay their own fuel. A small order to a far planet loses money for a captain, so nobody takes it, and it sits forever. That is "orders get lost" again, in a new form. The system cannot force captains, but it can show the problem to everyone.

---

## Slice 3.1 · Expected trip profit

**Outcome:** while building a trip, the captain sees whether it will make or lose money before loading.

### Build

| Layer | Work |
|---|---|
| Pure logic | `trips/profit.ts`: expected profit from the trip's orders and frozen fuel cost. Units still needed to break even |
| Service | `getMyOpenTrip()` DTO gains earnings, fuel cost, expected profit |
| UI | Trip builder: a summary line "Earnings $X − Fuel $Y = Expected profit $Z". Each available order shows "+$N". Planet list shows fuel cost and "needs N units to cover fuel". Warning above "Mark as loaded" when the profit is negative |

### Acceptance criteria

- [ ] The summary updates after every add and remove.
- [ ] Positive profit is shown normally, negative in red with a minus sign.
- [ ] Below break-even, the builder says "N more units to cover fuel".
- [ ] Loading a loss trip is allowed. The warning reads "This trip will lose $X".
- [ ] Numbers equal what slice 2.5 shows after the trip completes.

### Edge cases

| Case | Expected |
|---|---|
| Empty trip | Profit = −fuel cost, with the break-even hint |
| Profit exactly 0 | Shown as $0.00, no warning |
| Break-even needs more than 20 units | "A full ship cannot cover the fuel cost for this planet" |
| Delivery charge of 0 on the planet | Same message, no division by zero |
| Orders with different frozen delivery charges in one trip | Each uses its own charge |

### Tests

- Unit `profit.ts`: empty, loss, zero, profit, mixed charges, zero charge, unreachable break-even.

---

## Slice 3.2 · Waiting time

**Outcome:** everyone who can act on a waiting order sees how long it has waited.

### Build

| Layer | Work |
|---|---|
| Pure logic | `orders/waiting.ts`: waiting start (PLACED → `created_at`, ACCEPTED → `accepted_at`), duration text, overdue flag after 3 days **[C6]** |
| Service | List DTOs gain `waitingSince`. Admiral list supports "longest waiting first". `getPipeline()` gains "oldest waiting order" per waiting status |
| UI | "Waiting 2d 5h" in the manager queue, captain available orders and Admiral orders. Overdue rows are highlighted. Admiral dashboard: a "Waiting too long" card with the count of overdue orders and a link to the filtered list |

### Acceptance criteria

- [ ] PLACED orders show time since placed. ACCEPTED orders show time since accepted.
- [ ] Orders in any other status show no waiting time.
- [ ] The manager queue is sorted oldest first.
- [ ] The Admiral's card counts orders waiting longer than 3 days and links to exactly those orders.
- [ ] The seeded old small orders to far planets appear as overdue.

### Edge cases

| Case | Expected |
|---|---|
| Order removed from a trip, back to ACCEPTED | Waiting still counts from the original `accepted_at` |
| Waiting under one minute | "Just now" |
| No overdue orders | Card shows 0 with a neutral style |
| Customer view | Customers do not see waiting time. They see the status text only |

### Tests

- Unit `waiting.ts`: each status, boundaries at exactly 3 days, removed-from-trip case.
- Service: overdue count equals the filtered list length.

---

## Phase gate

- [ ] On the live URL a captain building a small trip to a far planet sees the loss before loading.
- [ ] On the live URL the Admiral sees overdue orders from the dashboard in one click.
- [ ] CI green. `context.md` updated. Pushed.
