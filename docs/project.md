# Terra Supply Co. · Project Brief

This file is the full project description. Use it to plan and build the project.
Lines marked **[PDF]** come from the original task. Lines marked **[Decision]** are choices made because the task is silent or unclear. Decisions can be changed, but must stay listed in the README under "Assumptions".

---

## 1. Context

| Item | Value |
|---|---|
| Type | Take-home challenge for a Senior Software Engineer / CTO role |
| Time limit | 48 hours |
| Delivery | Public GitHub repo + live URL |
| Evaluation focus **[PDF]** | "What to build, how it looks and what to prioritize is your call. Choose what matters most, do it well, and explain your choices." |
| UI focus **[PDF]** | "Usability and clarity matter more than visual effects. Skip the rocket animations." |
| Scale | Small. Scalability is not a goal. Performance should be reasonable. |

---

## 2. The problem **[PDF]**

- Humans live on every planet. One internet connects them all in real time.
- Earth produces everything. Terra Supply Co. delivers it: water, oxygen, plants, food, machines.
- Today the company runs on spreadsheets and radio calls.
- Three pains:
  1. Orders get lost.
  2. Customers do not know where their supplies are.
  3. Nobody knows which planets are profitable.
- Goal: build the software that runs Terra Supply Co.

Success = these three pains are solved:

| Pain | What solves it |
|---|---|
| Orders get lost | Every order is stored with a clear status and owner at each step |
| Customers do not know where supplies are | Full step-by-step timeline per order, with time of each step and ETA |
| Unknown profitability | Admiral dashboard: delivered quantity, cost, revenue, profit per planet and product |

---

## 3. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (latest stable, App Router), full-stack |
| Language | TypeScript, strict mode |
| Database | PostgreSQL (hosted, e.g. Neon) |
| ORM | Drizzle ORM + drizzle-kit migrations |
| Auth | Better Auth with the Drizzle adapter (`provider: "pg"`) and email + password sign-in. `role` and `planet_id` added as user `additionalFields` with `input: false`, so a user can never set their own role at sign-up. Route guard in `proxy.ts` (Next.js 16 name for `middleware.ts`) |
| Validation | Zod |
| UI | Tailwind CSS + shadcn/ui |
| Tests | Vitest |
| Hosting | Vercel |

Rules for the code:
- All money is integer cents. Never floats.
- All times stored and shown in UTC ("Earth time") **[PDF]**.
- Business logic lives in a server-side service layer. Pages, server actions and route handlers only call services.
- Every service checks the acting user's role and scope itself.

---

## 4. Domain glossary

| Term | Meaning |
|---|---|
| Planet | Delivery destination. Has `days_from_earth`, `delivery_charge_per_unit`, `fuel_cost_per_trip` **[PDF]** |
| Sector | Part of a planet **[PDF]** |
| Division | Part of a sector. This is the delivery address, e.g. Mars → Olympus Sector → Division 7 **[PDF]** |
| Earth | The only supplier. Every trip starts from Earth. Supply is unlimited **[PDF]** |
| Product | Water, oxygen, plants, food, machines. Has `price` and `making_cost`, set by the Admiral **[PDF]** |
| Unit | Quantity measure for products. "3 water + 1 food" = 4 units **[PDF]** |
| Order | One customer, one division, one or more products **[PDF]** |
| Trip | One captain, one planet, up to 20 units, one or more orders, can stop at several divisions **[PDF]** |
| Stop | **[Decision]** All orders of one trip that go to the same division |

---

## 5. Users and roles

| Role | Who | Can see | Can do | Cannot see |
|---|---|---|---|---|
| Grand Admiral **[PDF]** | Company owner | Everything | Set product price and making cost at any time. Set planet delivery charge and fuel cost **[Decision]** | Nothing hidden |
| Planet Manager **[PDF]** | Runs one planet | Only their own planet's orders and purchases | Accept orders. Reject orders with a reason **[Decision]** | Other planets. Making cost. Company profit |
| Captain **[PDF]** | Flies a ship | Accepted orders available to carry, own trips, own earnings | Create trip, add/remove orders, mark trip and delivery steps | Making cost. Company profit. Other captains' earnings |
| Customer **[PDF]** | Buys supplies | Only their own orders | Place orders, track them | Anything about other customers. Cost and profit |

**[Decision]** A manager belongs to exactly one planet. A planet may have more than one manager.
**[Decision]** A customer can order to any division on any planet.

Permission rule: hiding something in the UI is not enough. Every read and write is checked on the server.

---

## 6. Order flow **[PDF]**

1. Customer orders one or more products in units. The order goes to one division.
2. That planet's manager accepts the order.
3. Captains pick accepted orders to carry:
   - One trip goes to one planet and can deliver to several divisions there.
   - A ship carries at most 20 units.
   - An order is never split. So no order can be larger than 20 units.
4. Captain marks each step: Loaded → Lifted off → Landed on planet → Delivered to sector → Delivered to division.
   With several divisions, the captain marks each one separately after landing.
5. The customer sees every step.

### 6.1 Order status machine **[Decision, based on PDF]**

```
PLACED ──accept──> ACCEPTED ──add to trip──> ASSIGNED ──trip loaded──> LOADED
   │                   ^                         │
   └──reject──> REJECTED   └──remove from trip───┘   (only before trip is loaded)

LOADED ──trip lifted off──> LIFTED_OFF ──trip landed──> LANDED
LANDED ──stop at sector──> AT_SECTOR ──stop delivered──> DELIVERED
```

| Status | Set by | Customer label |
|---|---|---|
| PLACED | Customer | Order placed |
| ACCEPTED | Manager | Accepted by planet |
| REJECTED | Manager | Rejected (with reason) |
| ASSIGNED | Captain | Assigned to a ship |
| LOADED | Captain (whole trip) | Loaded on ship |
| LIFTED_OFF | Captain (whole trip) | Lifted off from Earth |
| LANDED | Captain (whole trip) | Landed on <planet> |
| AT_SECTOR | Captain (per division stop) | Delivered to <sector> |
| DELIVERED | Captain (per division stop) | Delivered to <division> |

Rules:
- Only the next valid step is allowed. No skipping, no going back (except ASSIGNED → ACCEPTED before loading).
- Every status change writes one row to the order timeline (`order_events`) in the same DB transaction.
- **[Decision]** "Delivered to sector" is marked per division stop, not once per sector. Simple and consistent.

### 6.2 Trip status machine **[Decision]**

```
PLANNING ──> LOADED ──> LIFTED_OFF ──> LANDED ──> COMPLETED
```

| Status | Meaning |
|---|---|
| PLANNING | Captain adds or removes orders |
| LOADED | Orders locked in. No more changes |
| LIFTED_OFF | Ship left Earth. ETA is known |
| LANDED | Ship is on the planet. Division stops can be marked |
| COMPLETED | Set automatically when every order in the trip is DELIVERED |

- **[Decision]** A captain can have only one trip that is not COMPLETED.
- **[Decision]** A trip cannot be loaded with zero orders.
- **[Decision]** Trip-level steps (Loaded, Lifted off, Landed) move every order in the trip.

---

## 7. Business rules (invariants)

| # | Rule | Source |
|---|---|---|
| R1 | An order has at least 1 product line, each line at least 1 unit | [Decision] |
| R2 | Order total units: 1 to 20 | [PDF] |
| R3 | An order goes to exactly one division | [PDF] |
| R4 | A trip goes to exactly one planet | [PDF] |
| R5 | A trip carries at most 20 units in total | [PDF] |
| R6 | An order is never split across trips | [PDF] |
| R7 | Only ACCEPTED, unassigned orders of the trip's planet can be added to a trip | [PDF + Decision] |
| R8 | An order can be in only one trip | [Decision] |
| R9 | Only the manager of the order's planet can accept or reject it | [PDF] |
| R10 | Only the trip's captain can change the trip or mark steps | [Decision] |
| R11 | Price, making cost and delivery charge are frozen on the order when it is placed | [Decision] |
| R12 | Fuel cost is frozen on the trip when it is created | [Decision] |
| R13 | Planet of an order is derived on the server from the division. Never trusted from the client | [Decision] |

Race condition to handle: two captains try to add the same order at the same time. Only one must win. The other gets a clear message: "This order was just taken by another captain."

---

## 8. Money **[PDF]**

| Item | Formula |
|---|---|
| Customer pays | (product price + delivery charge) × units |
| Delivery charge | Fixed per unit, set per planet |
| Fuel cost | Fixed per trip, set per planet |
| Captain's profit | delivery charges − fuel cost |
| Company's profit | product sales − making cost |

Detailed formulas (all from frozen snapshot values):

```
order_customer_total   = Σ units × (unit_price + unit_delivery_charge)
order_product_amount   = Σ units × unit_price
order_making_cost      = Σ units × unit_making_cost
order_delivery_charges = Σ units × unit_delivery_charge

company_revenue  = Σ order_product_amount     (DELIVERED orders only)
company_cost     = Σ order_making_cost        (DELIVERED orders only)
company_profit   = company_revenue − company_cost

trip_delivery_earnings = Σ order_delivery_charges of orders in the trip
trip_captain_profit    = trip_delivery_earnings − trip.fuel_cost
```

**[Decision]** Delivery charges belong to the captain, not to company revenue.
**[Decision]** Company numbers count DELIVERED orders only. The Admiral asked for "what was delivered".
**[Decision]** Captain earnings count COMPLETED trips. Trips in progress are shown separately as "expected".
**[Decision]** No real payment processing. The amount is calculated and shown. The order is treated as paid when placed.

### 8.1 Worked example

Mars: delivery charge $5/unit, fuel $40/trip. Water: price $10, making cost $6.

| Who | Calculation | Result |
|---|---|---|
| Customer orders 3 water | (10 + 5) × 3 | Pays $45 |
| Company | revenue 30 − cost 18 | Profit $12 |
| Captain, trip with 18 units | 18 × 5 − 40 | Profit $50 |
| Captain, trip with 5 units | 5 × 5 − 40 | Loss $15 |

### 8.2 Why snapshots matter

The Admiral can change price and cost at any time **[PDF]**. If reports read the current product price, every old report changes when the price changes. So each order line stores the price, making cost and delivery charge at the moment of ordering, and each trip stores its fuel cost. Reports read only these stored values.

---

## 9. Features

### 9.1 Must have

| # | Feature | Role | Acceptance criteria | Edge cases |
|---|---|---|---|---|
| F1 | Login and role access | All | User logs in, lands on their role home. Wrong-role routes are blocked | Customer opens `/admiral` URL. Manager with no planet. Expired session |
| F2 | Demo login | All | Login page lists seeded users with "Log in as" buttons so a reviewer can test every role fast | Works on the live URL with seeded data |
| F3 | Locations | System | Planets, sectors, divisions exist (seeded) and show in a planet → sector → division picker | Division ID that does not exist. Division from another planet |
| F4 | Product settings | Admiral | Edit price and making cost. Page says "applies to new orders only" | Negative or zero values. Price lower than cost (allowed, show warning) |
| F5 | Planet settings | Admiral | Edit delivery charge per unit and fuel cost per trip | Same as F4. Change does not affect existing orders/trips |
| F6 | Place order | Customer | Pick division, add products and units, see live unit count (x/20) and price breakdown, submit | 0 units. 21+ units. Empty order. Same product twice (merge lines). Double submit |
| F7 | Accept / reject order | Manager | Queue of PLACED orders for own planet. Accept, or reject with a reason | Order of another planet. Already accepted. Two managers click at the same time |
| F8 | Build trip | Captain | Create trip for a planet, see available ACCEPTED orders, add/remove orders, capacity bar x/20 | Wrong planet. Over 20 units. Two captains, same order. Captain already has an open trip. Load an empty trip |
| F9 | Trip steps | Captain | Buttons for Loaded, Lifted off, Landed, then per division stop: Delivered to sector, Delivered to division. Only the next valid button is shown | Skipping steps. Clicking twice. Marking a division that is not in the trip. Marking before landing |
| F10 | Order tracking | Customer | List of own orders with status. Detail page with full timeline (each step with UTC time), items, amount paid, ETA | Opening another customer's order by ID. Order with no trip yet |
| F11 | Admiral dashboard | Admiral | Totals (units delivered, revenue, cost, profit). Table by planet × product. Date range filter. Count of orders by status | Planet with no deliveries. Price changed in the middle of the period |
| F12 | Manager purchases report | Manager | Own planet: per product units, product amount, delivery charges, total paid. Date range filter. All planet orders with status filter | API response must not include making cost or profit |
| F13 | Captain earnings | Captain | Per trip: delivery earnings, fuel cost, profit. Totals. In-progress trips shown as "expected" | Loss trip (negative profit). No trips yet |

### 9.2 Nice to have (only if time is left)

| Feature | Value |
|---|---|
| Live expected profit while building a trip | Captain sees if the trip will lose money before loading |
| Waiting time on orders | Shows orders that no captain picks (small orders to far planets are unprofitable for captains) |
| Settings change history | Who changed which price, from what to what, when |
| Auto-refresh of order status | Customer sees new steps without reloading |
| Pagination and search on lists | Usability with more data |

### 9.3 Out of scope **[Decision]**

Real payments, refunds, order cancellation, notifications (email/SMS), inventory (supply is unlimited **[PDF]**), route optimization, multi-currency, time zones other than UTC **[PDF]**, animations **[PDF]**, horizontal scaling.

---

## 10. ETA **[PDF + Decision]**

- Each planet is a fixed number of days from Earth **[PDF]**.
- Before lift-off: show "About N days after lift-off".
- After lift-off: ETA = `lifted_off_at + days_from_earth` days, shown in UTC.

---

## 11. Data model (PostgreSQL)

| Table | Key columns | Notes |
|---|---|---|
| `planets` | id, name, days_from_earth, delivery_charge_cents, fuel_cost_cents | |
| `sectors` | id, planet_id FK, name | |
| `divisions` | id, sector_id FK, name | |
| `products` | id, name, price_cents, making_cost_cents, is_active | |
| `user`, `session`, `account`, `verification` | Better Auth core tables, generated by the Better Auth CLI as a Drizzle schema | Password hash lives in `account`, managed by Better Auth |
| `user` extra fields | role, planet_id FK null | Added via `additionalFields`, `input: false`. planet_id required only for managers |
| `orders` | id, code, customer_id FK, planet_id FK, division_id FK, status, total_units, trip_id FK null, reject_reason, created_at, updated_at | planet_id stored for fast scoping |
| `order_items` | id, order_id FK, product_id FK, units, unit_price_cents, unit_making_cost_cents, unit_delivery_charge_cents | Snapshot values |
| `trips` | id, code, captain_id FK, planet_id FK, status, total_units, fuel_cost_cents, created_at, loaded_at, lifted_off_at, landed_at, completed_at | fuel_cost snapshot |
| `order_events` | id, order_id FK, status, actor_id FK, note, occurred_at | Append-only timeline |
| `settings_changes` | id, actor_id, entity, entity_id, field, old_value, new_value, changed_at | Nice to have |

DB-level protection (the database itself blocks bad data):

| Constraint | Protects |
|---|---|
| `CHECK (orders.total_units BETWEEN 1 AND 20)` | R2 |
| `CHECK (order_items.units >= 1)` | R1 |
| `CHECK (trips.total_units BETWEEN 0 AND 20)` | R5 |
| `CHECK (price_cents >= 0)` etc. on all money columns | Valid money |
| Partial unique index on `trips(captain_id) WHERE status <> 'COMPLETED'` | One open trip per captain |
| Foreign keys everywhere | No broken links |

Race-safe "add order to trip" (one transaction):
1. `UPDATE trips SET total_units = total_units + :n WHERE id = :trip AND captain_id = :me AND status = 'PLANNING' AND total_units + :n <= 20` → 0 rows means full or not allowed.
2. `UPDATE orders SET trip_id = :trip, status = 'ASSIGNED' WHERE id = :order AND planet_id = :tripPlanet AND status = 'ACCEPTED' AND trip_id IS NULL` → 0 rows means taken by someone else, roll back.
3. Insert the `order_events` row.

Indexes:
- `orders (planet_id, status)`
- `orders (customer_id, created_at)`
- `orders (trip_id)`
- `orders (status, updated_at)` for dashboard date filters
- `order_events (order_id, occurred_at)`
- `trips (captain_id, status)`

---

## 12. Reports

| Report | Role | Group by | Columns | Filter |
|---|---|---|---|---|
| Company dashboard | Admiral | planet × product | units delivered, revenue, making cost, profit | date range on delivered time, planet |
| Pipeline | Admiral | status | order count | none |
| Planet purchases | Manager | product (own planet) | units, product amount, delivery charges, total paid | date range |
| Captain earnings | Captain | trip | delivery earnings, fuel cost, profit, status | none |

All reports use SQL aggregates (`SUM`, `GROUP BY`) on snapshot columns. Never load all rows into JS to add them up.

---

## 13. Performance and caching

| Topic | Approach |
|---|---|
| Aggregation | In the database with `GROUP BY` |
| N+1 queries | Load lists with joins or batched queries |
| Lists | Paginate |
| Reference data (products, planets, sectors, divisions) | Can be cached. Invalidate when the Admiral edits settings |
| Order status, timeline | No cache. Customer must see the latest step |
| Available orders for captains | No cache. Stale data causes double picks |
| Dashboard | No cache or very short. Wrong profit is worse than slow profit |
| Next.js cache | After every mutation, revalidate the affected paths/tags so pages do not show old data |
| Redis | Not used. Not needed at this size. Mention as a future step |
| DB connections | Use the pooled connection string on serverless hosting |

Principle: for money and status, correct data beats fast data.

---

## 14. Security

- Every service function checks: is the user logged in, is the role allowed, is the record in their scope (own planet, own order, own trip).
- IDs in URLs are never trusted. Fetch by ID **and** scope, e.g. `WHERE id = :id AND planet_id = :myPlanet`.
- Manager-facing queries select only allowed columns. Cost and profit fields are not in the response at all.
- All input validated with Zod on the server.
- Passwords and sessions handled by Better Auth. No public sign-up for Admiral, Manager or Captain roles; those users come from the seed only.
- Role checks read the role from the server-side session (`auth.api.getSession`), never from client input.
- Secrets only in environment variables. `.env.example` committed, `.env` not.

---

## 15. Seed data

| Data | Content |
|---|---|
| Planets | Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune with different days, delivery charges and fuel costs |
| Sectors / divisions | 2 sectors per planet, 2-3 divisions per sector (include Mars → Olympus Sector → Division 7) |
| Products | Water, Oxygen, Plants, Food, Machines |
| Users | 1 Admiral, managers for at least 3 planets, 3 captains, 4 customers. Simple shared demo password |
| History | About 30 orders in every status, several completed trips (including one loss trip), and one product whose price changed after some deliveries so the dashboard proves snapshots work |

Seed command resets and reseeds. It must work on the live database.

---

## 16. Testing focus

| Area | What to test |
|---|---|
| Money | All formulas in section 8, including the worked example |
| Status machines | Every valid move works, every invalid move fails |
| Order validation | 0 units, 21 units, empty order |
| Trip rules | Capacity, wrong planet, one open trip per captain, two captains same order |
| Permissions | Manager cannot read or act on another planet. Customer cannot read another customer's order. Manager report has no cost/profit fields |
| Snapshots | Change a price after an order; old order totals stay the same |

---

## 17. Deliverables

| Item | Content |
|---|---|
| GitHub repo | Public. Clean commit history |
| Live URL | Seeded, working for every role |
| README | What it does · live link · demo users · how to run locally · architecture · key decisions and trade-offs · assumptions (all [Decision] items) · out of scope · what I would build next · how to run tests |
| Optional | Short video walkthrough (3-5 min) |