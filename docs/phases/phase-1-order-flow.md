# Phase 1 · Order flow

**Goal:** one order travels from checkout to "Delivered to division" across three logins, and every step is visible to the customer.

**Time:** ~9h, Saturday. **Depends on:** Phase 0.

This phase solves pain 1 (orders get lost) and pain 2 (customers do not know where supplies are).

---

## Slice 1.1 · Checkout

**Outcome:** a customer builds an order, reviews it, pays (simulated) and places it.

### Build

| Layer | Work |
|---|---|
| Schema | `orders`, `order_items`, `order_events`, order code sequence **[C3]**. All constraints from `plan.md` 3.1. Migration |
| Pure logic | `orders/pricing.ts`: line totals, product amount, delivery charges, customer total. `orders/status.ts`: full order status machine (`canTransition`, labels) |
| Schema (Zod) | `placeOrderSchema`: division ID, items (product ID + integer units ≥ 1), `expectedTotalCents`, `idempotencyKey` |
| Service | `placeOrder()`: one transaction. Derive planet from division. Read current prices and delivery charge. Merge duplicate lines. Check 1 to 20 units. Compare total with `expectedTotalCents`. Insert order (PLACED, PAID), items with snapshots, first event |
| Action | `placeOrderAction`: validate, call service, redirect to the tracking page |
| UI | `/customer/orders/new`. Step 1: location picker, product rows with +/− and price, live `x / 20` counter, live breakdown. Step 2: summary and "Pay & place order" |

### Acceptance criteria

- [ ] The picker goes planet → sector → division and shows the planet's days from Earth and delivery charge per unit.
- [ ] The breakdown shows product amount, delivery charges and total, and matches `(price + delivery charge) × units` per line.
- [ ] The counter shows `x / 20`. At 20 the + buttons are disabled.
- [ ] "Continue to checkout" is disabled until a division is chosen and units are 1 to 20.
- [ ] Step 2 shows the destination, each line, and the total, with a "Back" link that keeps the cart.
- [ ] After paying, the customer lands on the tracking page of the new order with status "Order placed" and "Paid".
- [ ] The order stores the price, making cost and delivery charge of that moment on each line.
- [ ] The timeline has one event: "Order placed" with the UTC time.

### Edge cases

| Case | Expected |
|---|---|
| No products, or all units 0 | `INVALID` "Add at least one product" |
| 21 or more units (sent directly to the action) | `INVALID` "An order can have at most 20 units" |
| Units negative, decimal, or text | `INVALID` |
| Same product sent in two lines | Merged into one line before the check and insert |
| Unknown product ID or division ID | `INVALID` |
| Client sends a planet ID or prices | Ignored. Server derives planet and reads prices |
| Price or delivery charge changed since the page loaded (D23) | No order. `CONFLICT` "Prices changed. Please review the new total." Page shows new prices, customer confirms again |
| Double click, or resubmit after a slow response | Same `idempotencyKey` → the existing order is returned. One order only |
| Same `idempotencyKey` used by another customer | Treated as not found for them. A new key is required. No data leaks |
| Manager, captain or admiral calls the action | `FORBIDDEN` |
| Session expired on step 2 | `UNAUTHORIZED` "Please log in again". Cart is not lost on re-login is not guaranteed, and that is acceptable |
| Product priced at $0 | Allowed. Line shows $0.00 plus delivery |
| Page refreshed on step 2 | Cart state is kept in the URL or the form, so the summary still shows |

### Tests

- Unit `pricing.ts`: single line, many lines, 20 units, zero price, the worked example from `project.md` 8.1 (3 water to Mars = $45).
- Unit `status.ts`: every valid order transition passes, every other pair fails.
- Service: happy path stores snapshots. 0, 21, empty, duplicate lines, unknown IDs. Price changed. Same key twice gives one order. Non-customer forbidden.
- DB: `total_units` outside 1 to 20 rejected. `units < 1` rejected.

---

## Slice 1.2 · My orders and tracking

**Outcome:** a customer sees all their orders and, for each one, every step with its time.

### Build

| Layer | Work |
|---|---|
| Service | `listMyOrders()`, `getMyOrder(id)`, both scoped by `customer_id`. DTO: code, status, payment status, destination, items with unit price and delivery charge, totals, timeline events, trip info for ETA. No making cost |
| Pure logic | `orders/eta.ts`: ETA text from status, `lifted_off_at`, `days_from_earth`, `delivered_at` |
| UI | `/customer/orders`: table with code, destination, units, total, status badge, placed time, "New order" button. `/customer/orders/[id]`: status header, progress steps, timeline, items, amount, payment status, ETA |

### Acceptance criteria

- [ ] The list shows only the customer's own orders, newest first.
- [ ] The detail page shows all 8 steps as a progress line, with done, current and upcoming states.
- [ ] Each timeline event shows its label and UTC time, marked "UTC".
- [ ] Before lift-off the ETA reads "About N days after lift-off".
- [ ] A customer with no orders sees an empty state with a "Place your first order" button.
- [ ] Amounts on this page always equal what was shown at checkout, even after prices change.

### Edge cases

| Case | Expected |
|---|---|
| Another customer's order ID in the URL | `notFound()` |
| Malformed ID in the URL | `notFound()`, not a crash |
| Order with no trip yet (PLACED, ACCEPTED) | No ship section. Text "Waiting for the planet to accept" or "Waiting for a captain" |
| Rejected order | Reason shown, "Refunded" badge, progress line replaced by the rejected state. No ETA |
| Order removed from a trip and added to another | Timeline shows all three events in order |
| Price changed after the order | Page shows the frozen prices |
| Order delivered | ETA replaced by "Delivered on <UTC time>" |

### Tests

- Unit `eta.ts`: each status, lift-off time plus days, delivered.
- Service: customer A cannot read B's order (list and detail). DTO has no cost keys.

---

## Slice 1.3 · Accept and reject

**Outcome:** a planet manager accepts or rejects incoming orders of their own planet.

### Build

| Layer | Work |
|---|---|
| Service | `listQueue()` (PLACED, own planet, oldest first), `acceptOrder(id)`, `rejectOrder(id, reason)`, `listPlanetOrders()`, `getPlanetOrder(id)`. Manager DTO: no making cost, no profit |
| Actions | `acceptOrderAction`, `rejectOrderAction` |
| UI | `/manager/queue`: card or row per order with customer name, division, items, units, total paid, placed time, Accept button, Reject button with a reason dialog. `/manager/orders` and `/manager/orders/[id]`: all planet orders with status and timeline |

### Acceptance criteria

- [ ] The queue shows only PLACED orders of the manager's planet, oldest first.
- [ ] Accept moves the order to ACCEPTED, sets `accepted_at`, adds a timeline event, and removes it from the queue.
- [ ] Reject needs a reason (3 to 300 characters), moves the order to REJECTED and payment to REFUNDED together, and adds a timeline event with the reason.
- [ ] The customer's tracking page shows the new status on the next load.
- [ ] `/manager/orders` shows every order of the planet in any status.
- [ ] No making cost or profit appears anywhere, including in the page data.

### Edge cases

| Case | Expected |
|---|---|
| Order ID of another planet | `NOT_FOUND` |
| Order already accepted or rejected (stale tab, double click) | `CONFLICT` "This order was already handled". Queue refreshes |
| Empty or too short reason | Field error. Dialog stays open with the text |
| Reason longer than 300 characters | Field error |
| Reject, then try to accept the same order | `CONFLICT`. REJECTED is final |
| Customer, captain or admiral calls accept | `FORBIDDEN` |
| Empty queue | Empty state "No orders waiting" |
| Reason contains HTML | Shown as plain text (React escapes it) |

### Tests

- Service: accept and reject happy paths, including both fields changing on reject. Other planet. Second accept fails. Reject then accept fails. Wrong roles.
- Service: manager DTOs have no `makingCost` or `profit` keys at any depth.
- DB: REJECTED without REFUNDED rejected. REJECTED without a reason rejected.

---

## Slice 1.4 · Build a trip

**Outcome:** a captain opens a trip to one planet, fills it with accepted orders up to 20 units, and can change their mind before loading.

### Build

| Layer | Work |
|---|---|
| Schema | `trips`, trip code sequence **[C3]**, one-open-trip index. Migration |
| Pure logic | `trips/status.ts`: trip status machine. `trips/stops.ts`: group a trip's orders into stops by division |
| Service | `getMyOpenTrip()`, `createTrip(planetId)`, `listAvailableOrders(tripId)`, `addOrderToTrip`, `removeOrderFromTrip`, `cancelTrip`. Race-safe add as in `plan.md` 7.4 |
| Actions | One per mutation |
| UI | `/captain/trip`. No open trip: planet list with days, fuel cost, count of waiting orders, "Start trip". Open trip in PLANNING: capacity bar `x / 20`, orders in the trip with Remove, available orders with Add, "Cancel trip" |

### Acceptance criteria

- [ ] A captain with no open trip sees every planet with its fuel cost and number of waiting orders.
- [ ] Starting a trip freezes the planet's fuel cost on the trip.
- [ ] Available orders are ACCEPTED, not in any trip, and for the trip's planet only.
- [ ] Each available order shows units, sector, division and its delivery charges. No product price, no making cost, no customer name **[C7]**.
- [ ] Adding an order moves it to ASSIGNED, raises the capacity bar, and adds the timeline event "Assigned to a ship".
- [ ] Orders that do not fit in the remaining space have a disabled Add button with the reason.
- [ ] Removing an order moves it back to ACCEPTED, lowers the bar, adds the event "Removed from trip", and it is available to all captains again.
- [ ] Cancel trip returns every order to ACCEPTED with an event, marks the trip CANCELLED, and shows the planet list again.

### Edge cases

| Case | Expected |
|---|---|
| Two captains add the same order at the same moment | Exactly one succeeds. The other gets `CONFLICT` "This order was just taken by another captain" and the list refreshes |
| Two adds at once that together pass 20 units | One succeeds, the other gets "Not enough space" |
| Order of another planet sent directly | `INVALID` |
| Order not ACCEPTED (PLACED, REJECTED, already ASSIGNED) | `CONFLICT` |
| Captain starts a second trip (second tab) | `CONFLICT`. Page shows the existing open trip |
| Another captain's trip ID | `NOT_FOUND` |
| Remove an order that is not in the trip | `NOT_FOUND` |
| Add or remove after the trip is LOADED | `CONFLICT` "The trip is already loaded" |
| Cancel a trip that is LOADED or later | `CONFLICT` |
| Cancel an empty trip | Allowed |
| Admiral changes fuel cost while the trip is PLANNING | The trip keeps its frozen value |
| No accepted orders for the planet | Empty state "No orders waiting for this planet" |
| Unknown planet ID on create | `INVALID` |
| Order of exactly 20 units | Fills the trip alone |

### Tests

- Unit: trip status machine, all pairs. Stop grouping.
- Service: create, add, remove, cancel happy paths with events.
- Service: two parallel `addOrderToTrip` calls for one order → one success, one conflict, final state consistent.
- Service: parallel adds never exceed 20 units.
- Service: second open trip fails. Wrong planet. Wrong captain. After-load changes fail.
- DB: `total_units` over 20 rejected. `trip_id` with status PLACED rejected.

---

## Slice 1.5 · Depart and land

**Outcome:** the captain marks Loaded, Lifted off and Landed, and the customer sees each step and a real ETA.

### Build

| Layer | Work |
|---|---|
| Service | `markLoaded`, `markLiftedOff`, `markLanded`. Each is a conditional update on the trip status, sets the trip timestamp, moves every order of the trip, writes one event per order |
| Actions | One per step |
| UI | `/captain/trip` for LOADED, LIFTED_OFF: trip summary, orders, a single button for the next step. Customer tracking gains the ship section: trip code, lift-off time, ETA |

### Acceptance criteria

- [ ] Only the next valid button is rendered.
- [ ] "Mark as loaded" locks the trip: no add, remove or cancel after it.
- [ ] Each step moves all orders of the trip together and gives each one a timeline event.
- [ ] After lift-off the customer sees "ETA: <UTC date and time>" equal to lift-off plus the planet's days.
- [ ] After landing the customer sees "Landed on <planet>".
- [ ] The captain can mark Landed right away. There is no time gate (D6).

### Edge cases

| Case | Expected |
|---|---|
| Load an empty trip | `INVALID` "Add at least one order" |
| Skip a step (lift off before loaded, sent directly) | `CONFLICT` |
| Same button clicked twice | Second call changes nothing and returns "Already done". No duplicate events |
| Another captain's trip | `NOT_FOUND` |
| Captain lands earlier or later than the ETA | Allowed. The ETA stays an estimate. The timeline shows the real time |
| Step fails halfway | Whole transaction rolls back. Trip and orders stay in step |

### Tests

- Service: each step moves trip and all orders, with one event per order.
- Service: empty load, skipped step, double call, wrong captain.
- Service: an order's status is never ahead of or behind its trip for trip-level steps.

---

## Slice 1.6 · Deliver stops

**Outcome:** after landing, the captain delivers each division stop, and the trip completes by itself when the last order is delivered.

### Build

| Layer | Work |
|---|---|
| Service | `markStopAtSector(tripId, divisionId)`, `markStopDelivered(tripId, divisionId)`. The second sets `delivered_at` and, if no undelivered order remains, sets the trip to COMPLETED in the same transaction |
| Actions | One per step |
| UI | `/captain/trip` for LANDED: one card per stop (sector, division, orders, units) with its own next-step button. Stops in any order (D25). After the last stop: "Trip completed" summary and "Start a new trip" |

### Acceptance criteria

- [ ] Each stop has two steps in order: "Delivered to sector", then "Delivered to division".
- [ ] Stops are independent. Any stop can be worked on first.
- [ ] Marking a stop moves all orders of that division in the trip together.
- [ ] The customer's timeline ends with "Delivered to <sector>" and "Delivered to <division>".
- [ ] When the last order is delivered the trip becomes COMPLETED with `completed_at`, and the captain can start a new trip.
- [ ] End to end: one order goes checkout → accept → trip → all steps → delivered using three logins.

### Edge cases

| Case | Expected |
|---|---|
| Mark a stop before the trip has landed | `CONFLICT` |
| "Delivered to division" before "Delivered to sector" | `CONFLICT` |
| Division that is not part of the trip | `NOT_FOUND` |
| Same stop button clicked twice | "Already done". No duplicate events |
| Two divisions in the same sector | Two separate stops. Each gets its own "Delivered to sector" (project decision) |
| Trip with one stop | Completes on that stop's second step |
| Last two stops delivered at the same moment (two tabs) | Trip is completed exactly once |
| Any step after COMPLETED | `CONFLICT` |

### Tests

- Service: single-stop and multi-stop trips. Any order of stops. Auto-complete.
- Service: before landing, wrong order of steps, foreign division, double call.
- Service: full flow test from `placeOrder` to COMPLETED, asserting the exact event list.

---

## Phase gate

- [ ] On the live URL: place an order as a customer, accept it as the manager, deliver it as a captain, and see all 8 steps on the tracking page.
- [ ] On the live URL: a second order is rejected and shows the reason and "Refunded".
- [ ] A trip with orders for two divisions is delivered stop by stop.
- [ ] The two-captain race test passes in CI.
- [ ] CI green. `context.md` updated. Pushed.
