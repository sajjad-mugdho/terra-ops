# Terra Supply Co. · Build Plan

End-to-end plan for the whole project. Decisions come from `context.md` (D1 to D27). Architecture rules come from `AGENTS.md`. Items still waiting for confirmation are listed in section 15 and marked **[Confirm]** where they appear.

---

## 1. Goal

Solve the client's three pains, for four roles, on a live URL.

| Pain | Solved by |
|---|---|
| Orders get lost | Every order has one status, one owner per step, a full timeline, and a visible waiting time |
| Customers do not know where supplies are | Tracking page with every step, UTC time and ETA, refreshing by itself |
| Nobody knows which planets are profitable | Admiral dashboard by planet × product, on frozen prices |

What the reviewer should remember: money and status are always correct, and it is proven by tests.

---

## 2. Routes

| Route | Role | Purpose |
|---|---|---|
| `/login` | Public | Email + password, plus "Log in as" demo buttons |
| `/sign-up` | Public | Customer sign-up |
| `/` | Any | Redirects to the role home, or `/login` |
| `/customer/orders` | Customer | Own orders, status filter, search, pagination |
| `/customer/orders/new` | Customer | Step 1 build order, step 2 checkout |
| `/customer/orders/[id]` | Customer | Tracking: timeline, items, amount, ETA. Auto-refresh |
| `/manager/queue` | Manager | PLACED orders of own planet. Accept / reject. Auto-refresh |
| `/manager/orders` | Manager | All orders of own planet, status filter, search |
| `/manager/orders/[id]` | Manager | Order detail and timeline. No cost or profit |
| `/manager/report` | Manager | Purchases report, date range |
| `/captain/trip` | Captain | Current trip: create, build, mark steps. Available orders auto-refresh |
| `/captain/trips` | Captain | Trip history with earnings and totals |
| `/captain/trips/[id]` | Captain | One past trip |
| `/admiral` | Admiral | Dashboard: totals, planet × product table, pipeline, date range |
| `/admiral/orders`, `/admiral/orders/[id]` | Admiral | All orders, read-only, search and filters, timeline |
| `/admiral/trips`, `/admiral/trips/[id]` | Admiral | All trips, read-only |
| `/admiral/products` | Admiral | Edit price and making cost |
| `/admiral/planets` | Admiral | Edit delivery charge and fuel cost |
| `/admiral/history` | Admiral | Settings change history |
| `/api/auth/[...all]` | Public | Better Auth handler |

Route rules:

- `proxy.ts`: no session cookie on a protected path → redirect to `/login`. Signed-in user on `/login` or `/sign-up` → role home.
- Each role segment layout calls `requireRole`. Wrong role → redirect to the user's own home.
- A record outside the user's scope → `notFound()`. Same response as a record that does not exist.

Role homes: customer `/customer/orders`, manager `/manager/queue`, captain `/captain/trip`, admiral `/admiral`.

---

## 3. Data model

Moved to `database.md`: tables, ERD, constraints, triggers, indexes and what the database does not enforce. The schema is in `src/db/schema/` and the migrations in `drizzle/`.

Short version: 9 domain tables (`planets`, `sectors`, `divisions`, `products`, `settings_changes`, `orders`, `order_items`, `order_events`, `trips`). Orders and trips have a `number` shown as `ORD-1001` and `TRP-101`. A manager's planet is `planets.manager_id`.

---

## 4. Status machines

Pure functions in `features/orders/status.ts` and `features/trips/status.ts`. No DB.

### 4.1 Order

```
PLACED ─accept─> ACCEPTED ─add to trip─> ASSIGNED ─trip loaded─> LOADED ─> LIFTED_OFF ─> LANDED ─> AT_SECTOR ─> DELIVERED
   │                 ^                       │
   └─reject─> REJECTED   └─ remove from trip / trip cancelled ─┘   (only while trip is PLANNING)
```

| Status | Set by | Customer sees |
|---|---|---|
| PLACED | Customer (checkout) | Order placed · Paid |
| ACCEPTED | Manager | Accepted by planet |
| REJECTED | Manager | Rejected: reason · Refunded |
| ASSIGNED | Captain | Assigned to a ship |
| LOADED | Captain, whole trip | Loaded on ship |
| LIFTED_OFF | Captain, whole trip | Lifted off from Earth · ETA |
| LANDED | Captain, whole trip | Landed on planet |
| AT_SECTOR | Captain, per division stop | Delivered to sector |
| DELIVERED | Captain, per division stop | Delivered to division |

### 4.2 Trip

```
PLANNING ─> LOADED ─> LIFTED_OFF ─> LANDED ─> COMPLETED
    └─cancel─> CANCELLED
```

- COMPLETED is set automatically, in the same transaction, when the last order of the trip becomes DELIVERED.
- CANCELLED only from PLANNING (D17). Orders go back to ACCEPTED, each with a timeline event. The row is kept for history and never counts in money.
- One open trip per captain (not COMPLETED, not CANCELLED).
- Stops can be delivered in any order (D25). A stop is all orders of the trip for one division.

### 4.3 Rules for every transition

- Only the next valid step. No skipping, no going back, except ASSIGNED → ACCEPTED while the trip is PLANNING.
- Each transition is a conditional `UPDATE ... WHERE status = <expected>`. Zero rows changed means someone else was first → `CONFLICT`.
- The status change and its `order_events` row are in one transaction.

---

## 5. Money

Pure functions in `features/orders/pricing.ts`. Integer cents only.

```
order_product_amount   = Σ units × unit_price
order_delivery_charges = Σ units × unit_delivery_charge
order_making_cost      = Σ units × unit_making_cost
order_customer_total   = order_product_amount + order_delivery_charges

company_revenue = Σ order_product_amount   (DELIVERED)
company_cost    = Σ order_making_cost      (DELIVERED)
company_profit  = company_revenue − company_cost

trip_earnings       = Σ order_delivery_charges of the trip's orders
trip_captain_profit = trip_earnings − trip.fuel_cost
```

| Rule | Detail |
|---|---|
| Snapshot on order | Price, making cost and delivery charge are copied to `order_items` at checkout (R11) |
| Snapshot on trip | Fuel cost is copied to the trip when it is created (R12) |
| Counting (D11) | Company and manager reports count DELIVERED orders, by `delivered_at`. Captain earnings count COMPLETED trips, by `completed_at`. Everything else on the way is "In progress". REJECTED and CANCELLED never count |
| Payment | `PAID` at checkout. `REFUNDED` on rejection. Status only (D2 to D4) |
| Display | `$12.50` format from cents, one helper in `lib/money.ts` **[Confirm currency symbol]** |

---

## 6. Permission matrix

Every row is enforced in `service.ts`, never only in the UI.

| Action | Customer | Manager | Captain | Admiral |
|---|---|---|---|---|
| Sign up | Yes (public) | Seed only | Seed only | Seed only |
| Place order | Own | No | No | No |
| Read order | Own | Own planet, no cost fields | Orders in own trips + available ACCEPTED orders | All |
| Accept / reject | No | Own planet, PLACED only | No | No |
| Create / build / cancel trip | No | No | Own | No |
| Mark trip steps | No | No | Own trip | No |
| Read trip | No | No | Own | All |
| Purchases report | No | Own planet | No | No |
| Earnings | No | No | Own | No |
| Dashboard, making cost, profit | No | No | No | Yes |
| Edit prices and charges | No | No | No | Yes |
| Settings history | No | No | No | Yes |

Captains see the product names, units, destination and delivery charges of an order (D29). Never product price, making cost, company profit or the customer name.

---

## 7. Feature specs

Each feature lists its service functions (the DAL), its Server Actions, and its edge cases.

### 7.1 `auth`

| Piece | Detail |
|---|---|
| `getCurrentUser()` | Session read wrapped in React `cache()`. Returns `{ id, name, role, planetId }` or null (`planetId` comes from `planets.manager_id`) |
| `requireUser()`, `requireRole(role)` | Throw `UNAUTHORIZED` / `FORBIDDEN`. Used at the top of every service function |
| Sign-up page | Name, email, password. Always creates a customer |
| Login page | Email + password form. Below it, demo accounts grouped by role with "Log in as" buttons |
| Demo login action | Signs in a seeded account with the shared demo password. Only works for emails in the seeded demo list |

Edge cases: customer opens `/admiral` → redirected home · expired session on an action → `UNAUTHORIZED`, form shows "Please log in again" · sign-up body containing `role` or `planetId` → ignored (already verified) · duplicate email → clear field error · signed-in user opens `/login` → role home.

### 7.2 `locations`

| Piece | Detail |
|---|---|
| `listLocationTree()` | Planets → sectors → divisions, one query, any signed-in user |
| `getDivisionWithPlanet(id)` | Used by checkout to derive the planet on the server (R13) |
| Location picker | Three linked selects: planet, sector, division. Shows days from Earth and delivery charge per unit |

Edge cases: division ID that does not exist → `INVALID` · client sends a planet that does not match the division → ignored, the server derives it.

### 7.3 `orders`

**Checkout (F6, D2, D23)**

- Step 1: pick division, set units per product with +/− controls. Live counter `x / 20`. Live breakdown: product amount, delivery charges, total.
- Step 2: summary and "Pay & place order".
- Action `placeOrder({ divisionId, items, expectedTotalCents, idempotencyKey })`.
- Service, in one transaction: validate → read current prices and the planet's delivery charge → compute total → if it differs from `expectedTotalCents`, throw `CONFLICT` with the new prices → insert order (PAID, PLACED), items with snapshots, first event.
- After success: redirect to the tracking page.

Edge cases: 0 units or empty order → `INVALID` · more than 20 units → `INVALID` (UI also blocks at 20) · same product twice → lines merged before insert · negative or decimal units → `INVALID` · unknown product or division → `INVALID` · price changed since the page loaded → blocked, new prices shown, customer confirms again · double click or resubmit → same `idempotencyKey` returns the existing order, no second order · non-customer calls the action → `FORBIDDEN`.

**Accept / reject (F7)**

- `acceptOrder(orderId)`: `UPDATE ... WHERE id AND planet_id = myPlanet AND status = 'PLACED'`. Sets `accepted_at`.
- `rejectOrder(orderId, reason)`: same guard. Reason required, 3 to 300 characters. Sets REJECTED and REFUNDED together.

Edge cases: order of another planet → `NOT_FOUND` · already accepted or rejected (stale tab, double click) → `CONFLICT` "This order was already handled" · empty reason → field error.

**Tracking (F10)**

- `listMyOrders({ page, status, q })`, `getMyOrder(id)` scoped by `customer_id`.
- Detail page: status, timeline (every event with UTC time), items, amounts, payment status, ETA.
- ETA (D6): before lift-off "About N days after lift-off". After lift-off `lifted_off_at + days_from_earth`, shown in UTC. After delivery, the real delivery time.

Edge cases: another customer's order ID → `notFound()` · order with no trip yet → no ship section, text "Waiting for a captain" · rejected order → reason and "Refunded" · landed later than the ETA → the ETA line stays as an estimate, the timeline shows real times.

**Staff views**

- Manager: `listPlanetOrders`, `getPlanetOrder`. DTO has no making cost and no profit.
- Admiral: `listAllOrders`, `getAnyOrder`. Read-only (D22).

### 7.4 `trips`

| Function | Rule |
|---|---|
| `createTrip(planetId)` | Captain has no open trip. Copies the planet's fuel cost. A second open trip hits the unique index → `CONFLICT` |
| `listAvailableOrders(tripId)` | ACCEPTED, no trip, same planet as the trip. Shows products with units, division, delivery charges, waiting time |
| `addOrderToTrip(tripId, orderId)` | One transaction. 1) `UPDATE trips SET total_units = total_units + n WHERE id AND captain_id = me AND status = 'PLANNING' AND total_units + n <= 20`. 2) `UPDATE orders SET trip_id, status = 'ASSIGNED' WHERE id AND planet_id = tripPlanet AND status = 'ACCEPTED' AND trip_id IS NULL`. 3) event. Zero rows in step 2 → roll back |
| `removeOrderFromTrip(tripId, orderId)` | Trip PLANNING only. Order back to ACCEPTED, units subtracted, event "Removed from trip" |
| `cancelTrip(tripId)` | PLANNING only. All orders back to ACCEPTED with events. Trip CANCELLED |
| `markLoaded` / `markLiftedOff` / `markLanded` | Conditional update on trip status. Moves every order of the trip. One event per order. `markLoaded` needs at least 1 order |
| `markStopAtSector(tripId, divisionId)` | Trip LANDED. Orders of that stop LANDED → AT_SECTOR |
| `markStopDelivered(tripId, divisionId)` | Orders of that stop AT_SECTOR → DELIVERED, sets `delivered_at`. If no undelivered order remains, trip → COMPLETED |

UI: capacity bar `x / 20`. Only the next valid button is rendered. Stops are listed per division with their own two buttons.

Edge cases: order of another planet → `INVALID` · order would exceed 20 units → `CONFLICT` "Not enough space" · two captains add the same order → one wins, the other gets "This order was just taken by another captain" · captain already has an open trip → `CONFLICT`, the page shows the open trip instead · load an empty trip → `INVALID` · skip a step → `CONFLICT` · click twice → second click changes zero rows, shown as "Already done" · mark a division that is not in the trip → `NOT_FOUND` · mark a stop before landing → `CONFLICT` · another captain's trip ID → `NOT_FOUND` · order rejected or removed while the list was open → add fails cleanly, list refreshes · fuel cost changed while PLANNING → the trip keeps its frozen value.

### 7.5 `settings`

- `updateProduct(id, { priceCents, makingCostCents })` and `updatePlanetCharges(id, { deliveryChargeCents, fuelCostCents })`.
- Each writes one `settings_changes` row per changed field, in the same transaction (D19). No row if nothing changed.
- Inputs are typed as dollars in the form and converted to cents on the server.
- The page says "Applies to new orders only" and "Applies to new trips only".
- History page (Phase 5): who, what, old → new, when. Newest first, paginated.

Edge cases: negative value → field error · more than 2 decimals or not a number → field error · price lower than making cost → allowed, with a warning "This product sells at a loss" · two edits at once → last write wins, both are in the history · existing orders and trips never change.

### 7.6 `reports`

All SQL aggregates on snapshot columns.

| Report | Query |
|---|---|
| Admiral totals | Units, revenue, cost, profit of DELIVERED orders in the date range |
| Admiral profit by planet (D32) | `GROUP BY planet`: units, revenue, cost, profit. Sorted by profit, highest first. Shown at the top |
| Admiral planet × product | `GROUP BY planet, product`. Planets in the same order as the summary. Planets with no deliveries still show, with zeros (left join) |
| Admiral pipeline | Order count per status. Not affected by the date range |
| Manager purchases | Own planet, `GROUP BY product`: units, product amount, delivery charges, total paid. DELIVERED in range. A second "In progress" table with the same columns for ACCEPTED to AT_SECTOR (D31) |
| Captain earnings | Per trip: earnings, fuel, profit. Totals over COMPLETED trips. Open trip shown as "Expected" |

Date range: by `delivered_at` (orders) or `completed_at` (trips), UTC days. Default: last 30 days **[Confirm]**.

Edge cases: planet with no deliveries → zero row · price changed mid-period → old orders keep old numbers (snapshot) · loss trip → negative profit in red with a minus sign · no trips yet → empty state · manager DTO contains no cost or profit keys (tested on the returned object) · start date after end date → field error.

### 7.7 Phase 3 to 5 additions

| Feature | Detail |
|---|---|
| Expected trip profit | In the trip builder: earnings so far − fuel = expected profit, updating as orders are added. Each available order shows its delivery charges. Warning above the Load button when the profit is negative. Loading is still allowed |
| Waiting time | "Waiting 2d 5h": since `created_at` for PLACED, since `accepted_at` for ACCEPTED. Shown in the manager queue, captain available list and Admiral orders. Admiral list can sort by longest waiting. Highlight after 3 days **[Confirm]** |
| Auto-refresh (D24) | One small Client Component that calls `router.refresh()` every 10 seconds while the tab is visible. Used on customer tracking, manager queue and captain available orders |
| Pagination + search | 20 rows per page. State in the URL: `?page=&q=&status=`. Search by order number, plus customer name for staff. Offset pagination, with a total count |
| Settings history page | See 7.5 |

---

## 8. Shared code

| File | Holds |
|---|---|
| `lib/errors.ts` | `AppError` with codes `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INVALID` |
| `lib/action-result.ts` | `ActionResult` type and a helper that turns `AppError` and Zod errors into it |
| `lib/money.ts` | Cents ↔ display, dollars input → cents |
| `lib/dates.ts` | UTC formatting, duration ("2d 5h"), add days |
| `components/` | App shell with role nav, status badge, money text, data table, pagination, empty state, auto-refresh |

---

## 9. Phases

A phase is done when: tests pass, CI is green, it runs on the live URL, `context.md` is updated, and it is committed and pushed.

### Phase 0 · Foundation (Saturday morning, ~4h)

1. `.gitignore`: add `.agents/`, `.claude/`, `.zcode/`, `skills-lock.json` (D20). First commit.
2. Shared code from section 8. Install `server-only`, alias it in `vitest.config.ts`.
3. Schema: done for every table (`database.md`). Migrations `0001_domain` and `0002_triggers`.
4. `auth` feature: session helpers, `proxy.ts`, role layouts, login, sign-up, demo login.
5. App shell with role navigation. `loading.tsx`, `error.tsx`, `not-found.tsx`.
6. Seed v1: planets, sectors, divisions, products, users.
7. Test database setup (section 10). CI workflow (section 12).
8. First deploy: user creates the Neon and Vercel projects (D26), migrate, seed, check every demo login on the live URL.

Done when: each of the 4 roles can log in on the live URL and lands on its own empty home. A wrong-role URL is blocked.

### Phase 1 · Order flow (Saturday, ~9h)

1. Schema: orders, order_items, trips, order_events. Migration.
2. Pure logic and unit tests: `status.ts` (both machines), `pricing.ts`.
3. `orders`: checkout, customer list, tracking with ETA.
4. `orders`: manager queue, accept, reject, planet orders.
5. `trips`: create, available orders, add, remove, cancel, load, lift off, land, stops, auto-complete.
6. Service tests: permissions, capacity, the two-captain race, idempotent checkout, price-changed checkout.

Done when: on the live URL one order goes from checkout to DELIVERED across three logins, and a second order is rejected and shows "Refunded".

### Phase 2 · Money and reports (Sunday morning, ~6h)

1. Schema: settings_changes. Migration.
2. `settings`: product and planet edit pages, history rows written.
3. `reports`: Admiral dashboard, manager purchases, captain earnings.
4. Admiral read-only orders and trips.
5. Seed v2: full history (section 11).
6. Tests: every formula, the worked example, snapshots, manager DTO has no cost keys, report totals equal the seeded expectations.

Done when: the dashboard numbers on the live URL match numbers computed by hand from the seed, and changing a price does not change them.

### Phase 3 · Client pains (Sunday midday, ~1.5h)

Expected trip profit. Waiting time.

### Phase 4 · Usability (Sunday afternoon, ~2.5h)

Auto-refresh on three pages. Pagination and search on every list.

### Phase 5 · History (Sunday afternoon, ~1h)

Settings history page.

### Phase 6 · Ship (Sunday evening, ~4h)

1. Final reseed of the live database. Click through every role on the live URL.
2. README (section 13).
3. Video walkthrough, 3 to 5 minutes **[Confirm]**.
4. Final check: CI green, repo public, live URL works in a private window.

If time runs short, the order to drop is: Phase 5, then Phase 4 search, then the video. Phases 0 to 3 are never dropped. Nothing is dropped without asking.

---

## 10. Test plan

| Layer | Tool | Database | Covers |
|---|---|---|---|
| Pure logic | Vitest | None | Every valid and invalid transition of both machines. Every money formula. The worked example from `project.md` 8.1. Money and date helpers |
| Services | Vitest | Real Postgres, database `terra_ops_test` (D21) | Permissions, scoping, races, snapshots, constraints, reports |

Test database setup: a global setup creates `terra_ops_test` if missing and runs migrations. Tables are truncated before each test file. Test files run one at a time. Services take the acting user from a session helper that tests replace with a fake user.

Must-have service tests:

- Customer cannot read another customer's order.
- Manager cannot read, accept or reject an order of another planet.
- Manager report and order DTOs contain no cost or profit keys.
- Captain cannot touch another captain's trip.
- Two captains add the same order at the same time (two parallel calls): exactly one succeeds.
- Adding orders at the same time never passes 20 units.
- A captain cannot open a second trip.
- Checkout: 0, 21, empty, duplicate product, price changed, same idempotency key twice.
- Accept an order twice: the second call fails with `CONFLICT`.
- Cancel trip returns its orders to ACCEPTED and frees them for other captains.
- Last stop delivered completes the trip.
- Price change after an order: order totals and reports stay the same.
- Rejected and cancelled never appear in money reports.
- Seed check: every planet has exactly one manager.

No browser end-to-end tests. The flows are checked by hand on the live URL at the end of each phase.

---

## 11. Seed

`npm run db:seed` wipes and reseeds. It works on local and on the live database, and asks for a `--yes` flag so it never runs by accident. Users are created through Better Auth so passwords are hashed properly.

**Proposed values [Confirm all numbers]**

| Planet | Days from Earth | Delivery charge / unit | Fuel cost / trip |
|---|---|---|---|
| Mercury | 3 | $4 | $30 |
| Venus | 2 | $3 | $25 |
| Mars | 4 | $5 | $40 |
| Jupiter | 12 | $9 | $110 |
| Saturn | 18 | $12 | $160 |
| Uranus | 30 | $16 | $240 |
| Neptune | 40 | $20 | $320 |

| Product | Price | Making cost |
|---|---|---|
| Water | $10 | $6 |
| Oxygen | $14 | $8 |
| Plants | $18 | $11 |
| Food | $12 | $7 |
| Machines | $60 | $42 |

- Earth is not in the planets table. It is the origin of every trip, never a destination (D30).
- Locations: 2 sectors per planet, 2 to 3 divisions per sector. Includes Mars → Olympus Sector → Division 7.
- Users: 1 Admiral, 7 managers (one per planet), 3 captains, 4 customers. One shared demo password **[Confirm value]**. Emails like `admiral@terra.demo`, `manager.mars@terra.demo` **[Confirm]**.
- History: about 30 orders covering every status · several COMPLETED trips including one loss trip · one CANCELLED trip · one open trip in each of PLANNING and LANDED · one rejected order · a few old ACCEPTED small orders to far planets that nobody picked (shows waiting time) · one product whose price changed after some deliveries, with its history row (proves snapshots).
- Seeded timestamps are spread over the last 30 days so date filters have something to show.

---

## 12. CI and deploy

**CI (D21):** one GitHub Actions workflow on every push and pull request. Postgres 17 service container. Steps: install, migrate the test database, `typecheck`, `lint`, `test`, `build`. Env vars are dummy values.

**Deploy (D26):** the user creates the Neon project and the Vercel project.

1. Neon: create project, copy the **pooled** connection string.
2. Vercel: import the GitHub repo. Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (the production URL).
3. Migrations: run `npm run db:migrate` against Neon from the local machine before each deploy that changes the schema **[Confirm: or run migrations in the Vercel build step]**.
4. Seed: `npm run db:seed -- --yes` against Neon.

**Git:** small commits per finished piece, plain messages, no AI trailers. Before every push: the four checks locally, `context.md` updated, GitHub account confirmed. After every push: check the CI result.

---

## 13. README outline (Phase 6)

What it does · live link · demo users · 2-minute tour per role · how to run locally · architecture (structure, DAL, Server Actions, request flow) · key decisions and trade-offs · assumptions (every decision from `context.md`) · how correctness is protected (constraints, transactions, tests) · out of scope · what I would build next (staff management, order cancellation, real payments, notifications, Redis, route planning) · how to run tests.

---

## 14. Risks

| Risk | Handling |
|---|---|
| 18 features in one weekend | Strict phase order. Each phase ends deployed. Drop order is fixed in section 9 |
| Deploy problems found late | First deploy is in Phase 0 |
| Next.js 16.4 API differences | Read the installed docs before each new API (AGENTS.md rule 1) |
| Race tests are flaky | Real Postgres, real parallel calls, assertions on final state only |
| Neon connection limits on serverless | Pooled connection string, one small pool |
| Reviewer breaks the demo data | Seed has plenty of orders in every status. Reseed by command (D20) |

---

## 15. Waiting for confirmation

| # | Item | Proposed |
|---|---|---|
| C1 | Seed numbers for planets and products | Tables in section 11 |
| C2 | Demo password and email pattern | `terra-demo-2026`, `role.planet@terra.demo` |
| C3 | Order and trip codes | `ORD-1001`, `TRP-101` |
| C4 | Currency symbol | `$` |
| C5 | Default report date range | Last 30 days |
| C6 | Waiting-time highlight | After 3 days |
| C7 | Captain sees customer name | Settled: no (D29) |
| C8 | Where migrations run for production | From the local machine, by command |
| C9 | Video walkthrough | Yes, 3 to 5 minutes |
| C10 | Page size | 20 rows |
