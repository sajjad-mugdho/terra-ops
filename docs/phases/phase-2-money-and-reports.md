# Phase 2 · Money and reports

**Goal:** the Admiral sets prices and sees profit per planet and product. Managers see what their planet bought. Captains see what they earned. All three use the same counting rule.

**Time:** ~6h, Sunday morning. **Depends on:** Phase 1.

This phase solves pain 3 (nobody knows which planets are profitable).

Counting rule for every slice here (D11): money counts only when delivered. Orders by `delivered_at`, trips by `completed_at`. REJECTED and CANCELLED never count.

---

## Slice 2.1 · Product settings

**Outcome:** the Admiral changes a product's price and making cost. Old orders do not change.

### Build

| Layer | Work |
|---|---|
| Schema | `settings_changes`. Migration |
| Schema (Zod) | Price and making cost as dollar strings, converted to cents on the server |
| Service | `listProductsForAdmiral()` (with making cost and margin), `updateProduct(id, values)`: one transaction, update plus one `settings_changes` row per changed field (D19) |
| Action | `updateProductAction` |
| UI | `/admiral/products`: table with name, price, making cost, margin per unit. Inline or dialog edit. Note: "Applies to new orders only" |

### Acceptance criteria

- [ ] The Admiral sees and edits price and making cost of each of the 5 products.
- [ ] After saving, the checkout page shows the new price.
- [ ] Orders placed before the change keep their old amounts everywhere.
- [ ] One history row is written per changed field, with old value, new value, actor and time.
- [ ] There is no way to add, delete or deactivate a product (D18).

### Edge cases

| Case | Expected |
|---|---|
| Negative value | Field error |
| More than 2 decimals, or not a number | Field error |
| Empty field | Field error |
| Price lower than making cost | Saved. Warning "This product sells at a loss" on the row |
| Price of 0 | Saved |
| Save with no change | No update, no history row, message "Nothing changed" |
| Only price changed | One history row, for price |
| Two admirals' tabs save at once | Last write wins. Both changes are in the history |
| Non-admiral calls the action | `FORBIDDEN` |
| Unknown product ID | `NOT_FOUND` |
| A checkout page is open during the change | Handled by D23 in slice 1.1 |
| Very large value | Capped by validation at $1,000,000 |

### Tests

- Service: update writes the right history rows. No change writes none. Wrong role.
- Service (snapshot): place an order, change the price, read the order again → totals unchanged.

---

## Slice 2.2 · Planet settings

**Outcome:** the Admiral changes a planet's delivery charge per unit and fuel cost per trip.

### Build

| Layer | Work |
|---|---|
| Service | `listPlanetsForAdmiral()`, `updatePlanetCharges(id, values)` with history rows |
| Action | `updatePlanetChargesAction` |
| UI | `/admiral/planets`: table with planet, days from Earth, delivery charge, fuel cost, and "units needed to cover fuel". Notes: "Delivery charge applies to new orders only", "Fuel cost applies to new trips only" |

### Acceptance criteria

- [ ] Both values are editable for each of the 7 planets.
- [ ] A new order uses the new delivery charge. Existing orders keep theirs.
- [ ] A new trip uses the new fuel cost. Existing trips, including PLANNING ones, keep theirs.
- [ ] "Units needed to cover fuel" = fuel cost ÷ delivery charge, rounded up.
- [ ] Days from Earth is shown but not editable.

### Edge cases

| Case | Expected |
|---|---|
| Same validation cases as 2.1 | Same results |
| Delivery charge of 0 | Saved. "Units needed" shows "Never covers fuel" |
| Units needed is above 20 | Warning "A full ship cannot cover the fuel cost" |
| Delivery charge changed between an order being placed and assigned | Captain earns the order's frozen charge |

### Tests

- Service: history rows. Snapshot test for delivery charge on an order and fuel cost on a trip.
- Unit: units-to-cover-fuel, including zero charge and exact division.

---

## Slice 2.3 · Admiral dashboard

**Outcome:** at a glance, the Admiral sees how much of what was delivered to which planet, with cost, revenue and profit.

### Build

| Layer | Work |
|---|---|
| Service | `reports/service.ts`: `getCompanyTotals(range)`, `getPlanetProfitSummary(range)`, `getPlanetProductTable(range)`, `getPipeline()`. SQL `SUM` and `GROUP BY` on snapshot columns |
| Pure logic | `reports/range.ts`: parse and validate a date range, default last 30 days **[C5]** |
| UI | `/admiral`: date range filter in the URL. Four totals: units delivered, revenue, making cost, profit. "Profit by planet" summary: one row per planet with units, revenue, cost, profit, sorted by profit (D32). Table grouped by planet with product rows and a planet subtotal. Pipeline: order count per status |

### Acceptance criteria

- [ ] Totals and the table count only DELIVERED orders with `delivered_at` inside the range.
- [ ] Revenue = product amount only. Delivery charges are not company revenue.
- [ ] "Profit by planet" lists all 7 planets, highest profit first. The most and least profitable planet can be read without scrolling.
- [ ] The planet × product table lists planets in the same order as the summary.
- [ ] Each planet shows a subtotal equal to its summary row. The grand total equals the sum of subtotals.
- [ ] Every planet appears, even with zero deliveries.
- [ ] The pipeline shows the current count for all 9 statuses and ignores the date range.
- [ ] Changing a price today does not change any number for past deliveries.
- [ ] The range is in the URL, so the page can be shared and refreshed.

### Edge cases

| Case | Expected |
|---|---|
| Planet with no deliveries | Row of zeros, at the bottom of the summary |
| Two planets with equal profit | Ordered by name, so the order is stable |
| A planet with negative profit | Shown last, in red |
| No deliveries at all in the range | Zeros and an empty-state note |
| Start date after end date | Field error. Previous result stays |
| Invalid date in the URL | Falls back to the default range |
| Order delivered at 23:59:59 UTC on the end date | Included. The end date is inclusive |
| Price changed in the middle of the range | Each order uses its own frozen price |
| Product sold at a loss | Negative profit, shown in red with a minus |
| Rejected or in-transit orders | Not in totals. Visible only in the pipeline |
| Non-admiral opens `/admiral` | Redirect home. Service throws `FORBIDDEN` |

### Tests

- Service: seed a small known set, assert exact totals and each table cell.
- Service: summary order (profit descending, ties by name) and summary rows equal table subtotals.
- Service: range boundaries. Rejected and in-transit excluded. Zero planet present.
- Service: change a price, totals unchanged.
- Unit: range parsing.

---

## Slice 2.4 · Manager purchases report

**Outcome:** a manager sees what their planet bought: quantities, product amounts, delivery charges. No profit. Delivered and on-the-way purchases are shown side by side (D31).

### Build

| Layer | Work |
|---|---|
| Service | `getPlanetPurchases(range)`, `getPlanetInProgress()`, both scoped to the manager's planet. Selects only allowed columns |
| UI | `/manager/report`: date range. Table per product: units, product amount, delivery charges, total paid, with a total row. Second table "In progress" with the same columns, for orders accepted but not yet delivered |

### Acceptance criteria

- [ ] Only the manager's own planet is included.
- [ ] Per product: units, product amount, delivery charges, total paid. Total paid = the two amounts added.
- [ ] The manager's total for a range equals the Admiral's revenue plus delivery charges for that planet and range.
- [ ] "In progress" covers ACCEPTED to AT_SECTOR, with the same four columns per product and a total row. PLACED and REJECTED are not included.
- [ ] "In progress" ignores the date range. It shows the present.
- [ ] An order moves from the "In progress" table to the "Delivered" table when it is delivered, and is never in both.
- [ ] Making cost and profit do not exist in the response data at all.

### Edge cases

| Case | Expected |
|---|---|
| No deliveries in range | Zeros and an empty-state note |
| A product never bought | Row of zeros in both tables |
| Nothing on the way | "In progress" shows zeros and a short note |
| A planet ID added to the URL or request | Ignored. The planet always comes from the session |
| Same range cases as 2.3 | Same results |

### Tests

- Service: exact numbers on a known set. Two planets' data never mix.
- Service: the returned object has no cost or profit key at any depth.
- Service: manager total matches the admiral's numbers for the same planet and range.

---

## Slice 2.5 · Captain earnings

**Outcome:** a captain sees earnings, fuel cost and profit for each trip and in total.

### Build

| Layer | Work |
|---|---|
| Service | `listMyTrips()`, `getMyTrip(id)`, `getMyEarnings()`. Earnings = sum of the frozen delivery charges of the trip's orders. Profit = earnings − frozen fuel cost |
| UI | `/captain/trips`: totals over COMPLETED trips (trips, units, earnings, fuel, profit). Table of trips with planet, status, units, earnings, fuel, profit, dates. The open trip is shown separately as "Expected". `/captain/trips/[id]`: one trip with its orders and stops |

### Acceptance criteria

- [ ] Totals count COMPLETED trips only.
- [ ] The open trip appears above the table as "Expected" and is not in the totals.
- [ ] CANCELLED trips are listed with their status and count as zero.
- [ ] A loss trip shows negative profit in red with a minus sign.
- [ ] The captain never sees product prices, making cost or company profit.

### Edge cases

| Case | Expected |
|---|---|
| No trips yet | Empty state with a link to start a trip |
| Loss trip (5 units to Mars: 5 × $5 − $40) | Profit −$15.00 |
| Another captain's trip ID | `notFound()` |
| Fuel cost changed after the trip was created | Trip shows its frozen fuel cost |
| Trip landed with some stops delivered | Still "Expected" until COMPLETED |

### Tests

- Service: worked examples from `project.md` 8.1 (18 units → +$50, 5 units → −$15).
- Service: totals ignore open and cancelled trips. Captain isolation.

---

## Slice 2.6 · Admiral orders and trips

**Outcome:** the Admiral can look at any order and any trip, read-only (D22).

### Build

| Layer | Work |
|---|---|
| Service | `listAllOrders()`, `getAnyOrder(id)` (with cost and profit per order), `listAllTrips()`, `getAnyTrip(id)` |
| UI | `/admiral/orders`, `/admiral/orders/[id]`, `/admiral/trips`, `/admiral/trips/[id]`. Status and planet filters. Order detail shows the timeline, items with price and making cost, and profit |

### Acceptance criteria

- [ ] Every order of every planet and customer is listed with planet, customer, units, status and total.
- [ ] Order detail shows the full timeline and who did each step.
- [ ] Every trip is listed with captain, planet, status, units, earnings, fuel and profit.
- [ ] There are no action buttons. The Admiral cannot accept, reject, assign or mark steps.

### Edge cases

| Case | Expected |
|---|---|
| Non-admiral calls these services | `FORBIDDEN` |
| Unknown ID | `notFound()` |
| Admiral sends a request to a manager or captain action | `FORBIDDEN` |

### Tests

- Service: admiral reads across planets and captains. Other roles forbidden. Admiral cannot run manager or captain mutations.

---

## Slice 2.7 · Seed history

**Outcome:** the live demo has realistic data in every state, so each report and screen has something to show on first login.

### Build

Extend the seed (details in `plan.md` section 11):

- About 30 orders covering all 9 statuses, spread over the last 30 days.
- Several COMPLETED trips, including one loss trip. One CANCELLED trip. One open trip in PLANNING and one in LANDED.
- One rejected order with a reason.
- A few old ACCEPTED small orders to far planets that nobody picked.
- One product whose price changed after some deliveries, with its history row.
- Seeded rows are written with consistent events, so every order has a full, valid timeline.

### Acceptance criteria

- [ ] Every status badge can be seen somewhere without creating data.
- [ ] Dashboard totals equal numbers computed by hand from the seed file. The expected numbers are written in the seed as constants and checked by a test.
- [ ] Every seeded order passes the DB constraints and has an event for each status it went through.
- [ ] Each captain has trip history. At least one manager has a non-empty queue.
- [ ] The seed runs in under a minute on the live database.

### Edge cases

| Case | Expected |
|---|---|
| Seed run twice | Same result. No duplicates |
| Seed run while users are logged in | Their sessions are wiped. They log in again |
| Seeded timestamps in the future | Not allowed. All are in the past |
| Sequences after seeding | Order and trip codes continue above the seeded ones |

### Tests

- Seed test: counts per status, one manager per planet, dashboard totals equal the constants, no order without events.

---

## Phase gate

- [ ] On the live URL the dashboard matches the hand-computed numbers.
- [ ] Changing a price on the live URL changes checkout but not the dashboard.
- [ ] A manager's report shows no cost or profit, also when inspecting the page data.
- [ ] A captain sees a loss trip in red.
- [ ] CI green. `context.md` updated. Pushed.
