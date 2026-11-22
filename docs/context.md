# Context

Source of truth for every locked decision. Updated at the end of every phase and in every push.

## How to use this file

- Read it before starting any work.
- Where it differs from `project.md`, this file wins.
- A new decision is added here before or together with the code that depends on it.
- Every push: update **Phase status** and add a **Changelog** entry.

## Docs map

Everything about this project is reachable from here. Start with the question, open the file.

| I need to know… | Open |
|---|---|
| What the client asked for | `requremt-by-client.md` (never edited) |
| What was decided, and what is still open | `context.md` (this file) |
| Whether every client requirement is covered, and the known gaps | `traceability.md` |
| How the system is shaped and why, trade-offs | `hld.md` |
| How one feature works: files, data, actions, functions, flow | `lld/01-auth.md` to `lld/06-reports.md` |
| The full list of Server Actions, service functions, route handlers, pages, URL parameters | `lld/README.md` |
| Shared helpers, errors, components, guard chain | `lld/00-shared.md` |
| Tables, ERD, constraints, indexes, what the database guards | `database.md` |
| Status machines | `plan.md` §4, diagrams in `hld.md` §7 |
| Money formulas and the counting rule | `plan.md` §5, `lld/06-reports.md` |
| Who may do what | `plan.md` §6 |
| Seed data, CI, deploy steps | `plan.md` §11, §12 |
| What to build next, in which order | `phases/README.md` |
| Acceptance criteria, edge cases and tests of a slice | `phases/phase-N-*.md` |
| The first brief and early decisions | `project.md` (background only) |
| Coding and architecture rules, GitHub account rule | `../AGENTS.md` (local, not committed) |

| File | Owner | Role |
|---|---|---|
| `requremt-by-client.md` | Client | Requirements |
| `project.md` | Us | Original brief |
| `context.md` | Us | Decisions and this map. Wins on conflict |
| `traceability.md` | Us | Requirement → where it is covered |
| `hld.md` | Us | High-level design |
| `lld/` | Us | Low-level design per feature, API lists |
| `database.md` | Us | Database design and ERD |
| `plan.md` | Us | Reference: rules, seed, deploy. Its data model moved to `database.md` |
| `phases/` | Us | Work order: 29 vertical slices |

If two docs disagree: `context.md` wins, then `lld/`, then `phases/`, then `plan.md`, then `project.md`.

## Constraints

- Solo, one weekend (Saturday + Sunday). Submit Sunday night.
- Delivery: public GitHub repo and a live URL on Vercel.
- Small scale. For money and status, correct data beats fast data.

## Stack (locked)

| Layer | Choice |
|---|---|
| Framework | Next.js 16.4, App Router, Turbopack |
| Language | TypeScript, strict |
| UI | Tailwind CSS 4, shadcn/ui |
| Database | PostgreSQL 17. Local: Docker. Live: Neon (pooled connection string) |
| ORM | Drizzle ORM, drizzle-kit migrations |
| Auth | Better Auth, email + password, Drizzle adapter |
| Validation | Zod 4 |
| Tests | Vitest |
| Hosting | Vercel. Code on GitHub |

### Setup choices

| Choice | Why |
|---|---|
| npm | pnpm is not available for the active Node version. npm is also Vercel's default |
| shadcn preset `base-nova` (Base UI) | shadcn's current default |
| `cacheComponents` off | Every page is per-user and must be fresh. With it on, every session read needs a `<Suspense>` boundary or the build fails. No benefit here |
| `pg` (node-postgres) driver | Supports real transactions, needed for race-safe trip building. Works with Neon's pooled URL |
| `"type": "module"` | Removes ESM warnings from Vitest and the Better Auth CLI |
| Node >= 24 | Matches the Vercel runtime |
| Local Postgres on port 5434 | Avoids clashing with other local databases |
| Env validated with Zod in `src/env.ts` | A missing or wrong env var fails at startup, not mid-request |

## Locked decisions

| # | Topic | Decision |
|---|---|---|
| D1 | Scope | All 13 must-haves (F1 to F13) and all 5 nice-to-haves. Built phase by phase, not all at once |
| D2 | Checkout | Normal checkout page: order summary, then "Pay & place order". Simulated payment, no payment gateway |
| D3 | Payment timing | The order is paid at checkout |
| D4 | Rejection | Money returns automatically. Customer sees "Refunded". No refund system, only a status |
| D5 | Who gets what | Product amount goes to the company. Delivery charge goes to the captain |
| D6 | Time | Captains mark every step manually. No time gate. ETA = `lifted_off_at + days_from_earth`, shown as an estimate only |
| D7 | Managers | Exactly one manager per planet, mandatory. 7 planets, 7 managers. Enforced in the database |
| D8 | Sign-up | Customers sign up publicly with email + password. New accounts are always `customer` (`input: false`) |
| D9 | Staff accounts | Admiral, 7 managers and 4 captains come from the seed only. No staff management UI. Listed as "what I would build next" |
| D10 | RBAC | Every read and write is checked on the server: session, role, scope |
| D11 | Reports | One rule for every report: money counts only when delivered. Orders on the way show as "In progress". Rejected orders never count |
| D12 | Nice-to-haves | Expected trip profit while building a trip, order waiting time, auto-refresh of order status, pagination + search, settings change history |
| D13 | Docs workflow | This file is updated at the end of every phase and in every push |
| D14 | Architecture | Feature-based structure (`src/features/<area>`) with a Data Access Layer (`service.ts` per feature), thin Server Actions, and pure domain logic in its own files. Follows the Next.js 16.4 docs. Full rules in `AGENTS.md` |
| D15 | Mutations | Every mutation is a Server Action. Route handlers only for Better Auth and external callers |
| D16 | Next.js best practices | Mandatory on every change: Server Components by default, read the installed Next.js docs before using an API, rules listed in `AGENTS.md` |
| D17 | Trip cancel | A captain can cancel a trip only while it is PLANNING. Its orders go back to ACCEPTED. The trip row stays as CANCELLED and never counts in money |
| D18 | Products | Fixed 5 products from the seed. The Admiral only edits price and making cost. No add, no deactivate |
| D19 | Settings history | History rows are written in Phase 2 together with the settings edit. The history page is Phase 5 |
| D20 | Agent files and demo reset | `AGENTS.md`, `CLAUDE.md` and skill folders are not committed. Demo data is reset only by the seed command, no reset button |
| D21 | Tests and CI | Service tests run on a real Postgres database `terra_ops_test`. GitHub Actions runs typecheck, lint, test, build on every push |
| D22 | Admiral visibility | Besides the dashboard, the Admiral gets read-only lists of all orders and all trips, with detail pages |
| D23 | Price change at checkout | If prices changed since the page loaded, the order is blocked, new prices are shown, and the customer confirms again |
| D24 | Auto-refresh | Every 10 seconds on three pages: customer tracking, manager queue, captain available orders |
| D25 | Stop order | A captain delivers the division stops of a trip in any order |
| D26 | Hosting | The user creates the Neon and Vercel projects and sets the env vars |
| D27 | Phase plan | Final. Phases 0 to 6 as in `plan.md` |
| D28 | GitHub account | Commits and pushes use only the personal account `sajjad-mugdho`. Before every push: run `gh auth status`, ask the user to confirm, switch if needed. Rule in `AGENTS.md` |
| D29 | Captain sees products | A captain sees the product names and units of an order (for example "3 Water, 1 Food"). Never prices, never making cost, never the customer name |
| D30 | Earth | Earth is only the origin of every trip. It is not a delivery destination. Destinations are the 7 other planets |
| D31 | Manager report | Two tables with the same columns per product (units, product amount, delivery charges, total paid): "Delivered" in the date range, and "In progress". D11 is unchanged |
| D32 | Profit by planet | The Admiral dashboard starts with a "Profit by planet" summary sorted by profit. The planet × product table lists planets in the same order |
| D33 | Database design | As in `database.md`. Manager on `planets.manager_id` (no planet column on `user`). `number` identity instead of text codes. Composite foreign keys for planet agreement. Triggers make history append-only and check each trip at commit (units, status agreement, completion). Role behind a foreign key is not checked by the database: seed only |
| D34 | Seed values and demo accounts | Confirmed C1, C2, C4: the planet and product numbers in `plan.md` §11, password `terra-demo-2026`, emails `admiral@`, `manager.<planet>@`, `captain1..3@`, `customer1..4@terra.demo`, currency `$` |
| D35 | Seed and test folders | `src/seed/` holds the seed (it needs the demo list from `features/auth`, so it cannot live in `db/`). `src/test/` holds test setup. Tests use the database `terra_ops_test`, created and migrated by the test run |
| D36 | Idempotency key scope | The checkout key is unique per customer (`orders_customer_idempotency_unique`). The same key from another customer is simply not found for them and makes their own order. No order is ever returned across customers |
| D37 | Repeated click | A trip or stop step that was already taken changes nothing and returns `CONFLICT` "Already done". A skipped step returns `CONFLICT` "This step is not available yet" |
| D38 | Cart state | The checkout cart lives in the URL (`?division=&items=id:units,...&step=review`). A refresh on step 2 and the "Back" link keep it. The server drops unknown IDs from it |
| D39 | Timeline of a returned order | An order that leaves a trip gets an ACCEPTED event that carries the trip. The timeline shows it as "Removed from trip". The note is "Removed from trip" or "Trip cancelled" |
| D40 | Lists before Phase 4 | `listMyOrders` and `listPlanetOrders` return every row, with no `page`, `q` or `status` yet. Pagination, search, auto-refresh, waiting time and expected trip profit stay in Phases 3 and 4 |
| D41 | Report date range | C5 used as proposed: the default is today and the 30 days before it, in UTC. `from` and `to` are in the URL, both days included. A missing or invalid range in the URL falls back to the default. A start date after the end date is stopped in the form, so the last result stays on screen |
| D42 | Seed statuses | The seed shows all 9 order statuses and all 6 trip statuses. A captain has one open trip, and the open trips needed are PLANNING, LOADED, LIFTED_OFF and LANDED, so the seed has 4 captains. Captain 4 holds the LOADED trip: a full ship of 20 units to Uranus |
| D43 | Cancelled trip money | A cancelled trip is listed with earnings, fuel and profit of zero: it never flew. Its frozen fuel cost stays on the row |
| D44 | Captain money DTO | Trip earnings and profit are in their own DTO (`TripRow`, from `listMyTrips` and `getMyTripRow`). `TripDetail` stays as in Phase 1, without money totals |
| D45 | Phase 2 limits | Admiral order and trip lists filter by status and planet. Pagination and search stay in Phase 4, `getOverdueCount` in slice 3.2, the settings history page in Phase 5 (D19). History rows are written now |
| D46 | Overdue threshold | C6 used as proposed: an order is overdue when it has waited strictly more than 3 days (exactly 3 days is not overdue). PLACED waits from `created_at`, ACCEPTED from `accepted_at`, every other status does not wait. An order that comes back from a trip keeps its first `accepted_at`. All in UTC instants, no calendar days |
| D47 | One overdue rule | `orders/waiting.ts` holds the rule for the UI. The orders service holds the same rule as one SQL condition, used by both `getOverdueCount` and `listAllOrders({ overdue })`. The Admiral card links to `/admiral/orders?waiting=overdue&sort=waiting` |
| D48 | Expected profit DTO | `getMyOpenTrip` returns `OpenTrip`: `TripDetail` plus earnings, expected profit and units to break even. `TripDetail` itself stays without money (D44). Earnings use each order's frozen charge. The units still needed use the planet's delivery charge of today and the space left on the ship |
| D49 | Who sees waiting time | Managers (queue and planet orders), captains (available orders) and the Admiral (orders list, pipeline, "Waiting too long" card). Customer DTOs carry no waiting field. The text is worked out on the server at request time and is not live until auto-refresh in Phase 4 |
| D50 | Loss made visible | A trip with negative profit is red and labelled in the trip tables ("Loss" or "Expected loss"), has a banner on its detail page for the captain and the Admiral, and a warning above "Mark as loaded". Loading it stays allowed |
| D51 | Paged lists | C10 used as proposed: 20 rows. Customer orders, manager orders, captain trips, Admiral orders and Admiral trips return `{ rows, total, page, pageCount }` from one count query and one page query. Newest first with the number as tie-breaker. A bad `page` is page 1, a page past the end is the last page. The queue and the captain's available orders are not paged. This ends D40 and the list part of D45 |
| D52 | Search | `q` is trimmed and cut at 100 characters, and `%`, `_` and `\` match themselves. It is matched without case against the code as shown ("ORD-1001", "TRP-101"), so "1001" and "ord-10" both work. Customers search the code only. Managers and the Admiral also search the customer name. Trips are searched by code only. The scope condition of the role is always in the same query |
| D53 | One filter form | `ListFilters` is a Server Component with a plain GET form. It replaces `SelectFilters`. It sends no `page`, so a new filter starts at page 1. "Clear" shows only when a filter is set |
| D54 | Auto-refresh details | `AutoRefresh` is on three pages only: customer tracking until the order is DELIVERED or REJECTED, the manager queue, and the captain's trip while it is PLANNING. The timer logic is `lib/polling` (no React), so it has unit tests. "Updated <time> UTC" is the server time of the last render, so it stands still while the network is down |
| D55 | Captain trip list | "Trip history" on `/captain/trips` lists every own trip, the open one too, with a status filter. The "Expected" box reads the open trip from `getMyOpenTrip` and no longer from the list, because the list is paged |
| D56 | Settings history list | `listSettingsChanges({ page, entity })` is Admiral only and returns a paged list of `{ id, changedAt, actorName, entity, entityName, field, oldValueCents, newValueCents }`. No email, no user ID, no target ID. Order: `changed_at` newest first, then field, then ID, because the fields of one save share a timestamp. `entity` is `product` or `planet`. Anything else means all |
| D57 | Settings history page | `/admiral/history` is read-only and has no Server Action. Labels ("Water · price") and the signed difference ("+$2.00") are pure functions in `settings/history`. The difference is not coloured: a higher price is not good or bad by itself. An empty filter result shows the same "No changes yet" with a Clear button. "History" is in the Admiral nav, and the product and planet pages link to their own filter |

## Changes vs project.md

| project.md said | Now |
|---|---|
| Order "treated as paid when placed", and refunds out of scope (contradiction on rejection) | Paid at checkout. Rejection refunds automatically as a status (D2 to D4) |
| A planet may have more than one manager | Exactly one per planet (D7). Removes F7's "two managers click at once" edge case |
| Seed managers for at least 3 planets | A manager for all 7 planets |
| Company counts DELIVERED orders, captain counts COMPLETED trips, manager report unspecified | One rule for all reports: delivered (D11) |
| Nice-to-haves only if time is left | All in scope, phase by phase (D1) |
| Seed users: 1 admiral, 3+ managers, 3 captains, 4 customers | 1 admiral, 7 managers, 4 captains, 4 customers, plus public customer sign-up |

## Plan

Reference material (data model, status machines, money, permissions) is in `plan.md`. The work order is in `phases/`: 7 phase files, 29 vertical slices, each with acceptance criteria, edge cases and tests. Items still waiting for confirmation are in its section 15.

## Phase status

| Phase | Status |
|---|---|
| Setup | Done |
| 0 Foundation | Slices 0.1 to 0.5 done locally. 0.6 (live deploy) waits for the Neon and Vercel projects |
| 1 Order flow | Slices 1.1 to 1.6 done locally and in CI. The phase gate on the live URL waits for slice 0.6 |
| 2 Money and reports | Slices 2.1 to 2.7 done locally and in CI. The phase gate on the live URL waits for slice 0.6 |
| 3 Client pains | Slices 3.1 and 3.2 done locally and in CI. The phase gate on the live URL waits for slice 0.6 |
| 4 Usability | Slices 4.1 to 4.3 done locally and in CI. The two-browser check on the live URL waits for slice 0.6 |
| 5 History | Slice 5.1 done locally and in CI. The phase gate on the live URL waits for slice 0.6 |
| 6 | Not started |

## Open questions

- Confirmations C8 and C9 in `plan.md` §15 (C1 to C4 and C7 are settled, C5, C6 and C10 are used as proposed in D41, D46 and D51).
- Slice 0.6 needs the Neon pooled connection string and the Vercel project from the user (D26). The Phase 1 gate on the live URL waits for it too.

## Changelog

### 2026-11-22 · Phase 5, settings history

- 5.1 Settings history: `/admiral/history` lists every change of a price, making cost, delivery charge or fuel cost. Columns: time in UTC, who, what ("Water · price", "Mars · fuel cost"), old value, new value, difference with its sign. Filter: all, products, planets. Newest first, 20 rows per page.
- `listSettingsChanges` in `settings/service` (one count query, one page query). `settings/history` holds the pure parts: the entity filter, the labels, the signed difference. `HistoryTable` is a Server Component.
- "History" is in the Admiral nav. The product and planet pages have a "Change history" link to their own filter. `ListFilters` accepts the new path.
- New decisions D56 and D57. No schema change, no new action, no new dependency.
- 1044 automated tests (998 before). New: entity parsing, labels and signed difference, and service tests for the empty list, names resolved, newest first by time and not by insert order, one row per field with the same timestamp, a value changed back, a save that changed nothing, the entity filter and its count, an unknown entity, 21, 25 and 45 rows across pages with no row repeated or missing, a page past the end, the exact DTO keys with no email, reading changes nothing, the database rejecting an edit and a delete of a history row, FORBIDDEN for customer, manager and captain, UNAUTHORIZED without a session, the settings actions being only the two edit actions, and the seeded Water change visible through the service.
- Checked over HTTP against a production build. On a fresh seeded database: the Admiral sees "Water · price", $9.00, $10.00, "+$1.00", "Ada Sterling" and the UTC time, the product filter keeps the row, the planet filter shows "No changes yet", an unknown `entity` and a bad `page` show everything. On a database without changes: "No changes yet". A manager and a captain are redirected to their own home, a visitor to `/login`. No email in the page.
- Not done: the phase gate on the live URL (waits for slice 0.6). Not run in a browser: the click path "change a price, then open History" is covered by service tests, not by a browser run.

### 2026-11-22 · Phase 4, usability

- 4.1 Auto-refresh: `components/auto-refresh` calls `router.refresh()` every 10 seconds while the tab is visible and shows "Updated <time> UTC". It is on the customer tracking page until the order is DELIVERED or REJECTED, on the manager queue, and on the captain's trip while it is PLANNING. No other page polls. The timer is `lib/polling`.
- 4.2 Pagination: `lib/pagination` and `components/pagination`. Customer orders, manager orders, captain trips, Admiral orders and Admiral trips show 20 rows, the total count, and "Previous", "Page x of y", "Next" as real links. The services return `{ rows, total, page, pageCount }`.
- 4.3 Search and filters: `lib/search` and `components/list-filters` (replaces `select-filters`). Search by order code for everyone, also by customer name for managers and the Admiral, by trip code on the Admiral's trips. Status filter on every list, also on the captain's trips. "Clear" resets everything. A search with no result shows "No orders match" with a Clear button.
- New decisions D51 to D55. C10 is settled (20 rows). No schema change, no new action.
- `/captain/trips` now lists the open trip in "Trip history" too (D55).
- Fixed a test that failed the CI run of Phase 3 once: the wrong-password test started two sign-ins at once and awaited them one by one, so the second rejection could count as unhandled.
- Changed tests: every call of the five list functions now reads `.rows`.
- 998 automated tests (885 before). New: page parsing, page windows and page links, search text and LIKE escaping, the polling timer (hidden tab, visible again, stop, a failed tick), `isFinalStatus`, `formatUtcTime`, and service tests for 0, 20, 21 and 45 rows, no row repeated or missing, the number as tie-breaker, a page past the end, code and name search per role, search with status and planet, `%`, `_`, quotes, SQL text, spaces, long text, and scope kept for each role.
- Checked in a headless browser against a production build with the seeded data, 35 checks: a manager accepts an order in one browser and the customer's tracking page in another shows "Accepted by planet" about 5 seconds later without a reload, the order leaves a second manager's queue, the reject dialog keeps its typed text through a refresh, no request while the tab is hidden and one right away when it is visible again, no polling on a delivered order, on the lists, or on a LOADED or LANDED trip, the PLANNING trip refreshes, search, Clear, the back button, page 2 of the Admiral's orders, a filter returning to page 1, and no sideways page scroll at 375px.
- Not done: the two-browser check on the live URL (waits for slice 0.6). Not run in a browser: a session that expires while polling, and a network that goes offline.

### 2026-11-22 · Phase 3, client pains

- 3.1 Expected trip profit: `trips/profit` (earnings, expected profit, units to break even). `getMyOpenTrip` returns the money of the open trip. The trip builder shows "Earnings − Fuel = Expected profit", "N more units to cover fuel", each available order as "+$N", and "This trip will lose $X" above "Mark as loaded". The planet list shows the units that cover the fuel and warns when the waiting units are not enough.
- 3.2 Waiting time: `orders/waiting` (waiting start, text, overdue after 3 days). "Waiting 2d 5h" in the manager queue, the manager's planet orders, the captain's available orders and the Admiral's orders, with overdue rows in red. The Admiral dashboard has a "Waiting too long" card that links to exactly those orders, and the pipeline shows the oldest waiting order.
- Loss trips are marked in the captain and Admiral trip tables and on the trip detail pages (D50).
- `/admiral/orders` has two new URL parameters: `waiting=overdue` and `sort=waiting`.
- New decisions D46 to D50. No schema change, no new action.
- The seed has 5 overdue orders: three old small orders to Uranus and Neptune, the order that came back from the cancelled Jupiter trip, and the oldest Uranus queue order.
- Changed tests: two pipeline tests now compare status and count only, the available-order test expects `waitingSince`, and the captain "no hidden keys" test allows `expectedProfitCents` (the captain's own trip profit).
- 885 automated tests (807 before). New: `profit` and `waiting` unit tests (boundaries at exactly 3 days, zero charge, unreachable break-even), expected profit after every add and remove, mixed frozen charges, the same numbers before and after the trip completes, waiting start per status and after a removal from a trip, the overdue count equal to the filtered list, role checks, and the seed.
- Checked over HTTP against a production build with the seeded data: the dashboard card (5) and its link, the overdue list in waiting order, the Uranus manager's queue warning, the captain's builder summary with "+$N" and waiting time, the loss trip in the Admiral's list and on its detail page, and no waiting field in the customer pages.
- Not done: the phase gate on the live URL (waits for slice 0.6). No click-through in a real browser for this phase: the loss warning above "Mark as loaded" is covered by tests and the shared component, not by a browser run.

### 2026-11-22 · Phase 2, seed shows every status

- D42 changed: the seed now has an order in LOADED, so all 9 order statuses and all 6 trip statuses can be seen without creating data.
- A fourth demo captain (`captain4@terra.demo`, D9) holds a LOADED trip to Uranus with two orders, 20 units. Four open trips need four captains, because a captain has one open trip.
- Seed is now 32 orders and 11 trips, with 16 demo accounts. Dashboard totals and captain earnings are unchanged: nothing on the new trip is delivered.
- New seed tests: every status has at least one order and one trip, and the LOADED trip is full with both orders LOADED.
- 807 automated tests (804 before).

### 2026-11-22 · Phase 2, money and reports

- 2.1 and 2.2 Settings: `/admiral/products` and `/admiral/planets` with an edit dialog. `updateProduct` and `updatePlanetCharges` lock the row, write one `settings_changes` row per changed field and nothing when nothing changed. Dollar text becomes cents in `settings/schemas`. Warnings for a product sold at a loss and a planet whose fuel a full ship cannot cover.
- 2.3 Admiral dashboard: `/admiral` with the date range in the URL, four totals, "Profit by planet" (D32), planet by product with subtotals, and the pipeline. One counting rule: DELIVERED by `delivered_at`. Every sum is done in SQL on the frozen columns.
- 2.4 Manager: `/manager/report` with "Delivered" and "In progress" (D31). The planet comes from the session. The queries select no making cost.
- 2.5 Captain: `/captain/trips` with totals over COMPLETED trips, the open trip as "Expected", trip history, and `/captain/trips/[id]`.
- 2.6 Admiral lists: `/admiral/orders`, `/admiral/trips` and their detail pages, read-only, with status and planet filters. Order detail shows making cost, profit and who did each step.
- 2.7 Seed: `seed/history` adds 30 orders, 10 trips and one Water price change, all in the past. The expected dashboard and captain numbers are constants in `seed/history-data.ts`, worked out by hand and checked by a test.
- New decisions D41 to D45. No schema change: `settings_changes` already existed.
- 804 automated tests (557 before). New: range parsing, break-even units, money input, both settings services with history and snapshots, exact report numbers on a known set, range boundaries, manager isolation and no cost key at any depth, the three reports agreeing with each other, captain worked examples (+$50 and -$15), Admiral read access and no mutations, and the seed.
- Checked against a production build with the seeded data. Over HTTP: dashboard totals, empty and invalid ranges, manager report, captain totals and the loss trip in red, another captain's trip as not found, Admiral detail pages without action buttons. In a headless browser: both edit dialogs (field errors keep the typed text, "Saved", "Nothing changed", loss and fuel warnings), the date filter (start after end stays on the page, a valid range goes into the URL), the new price at checkout, and the dashboard unchanged after a price change.
- Not done: the phase gate on the live URL (waits for slice 0.6).

### 2026-11-22 · Phase 1, order flow

- 1.1 Checkout: `orders/pricing`, `status`, `cart`, `placeOrder`, `/customer/orders/new` in two steps. Prices, making cost and delivery charge are frozen on each line. Price change blocks the order (D23). Same key twice gives one order, also for two calls at once (D36).
- 1.2 Tracking: `/customer/orders` and `/customer/orders/[id]` with the 8 step progress line, UTC timeline, ETA (`orders/eta`), rejected state.
- 1.3 Manager: `/manager/queue` with accept and reject (reason dialog), `/manager/orders`, `/manager/orders/[id]`. No making cost or profit in any manager DTO.
- 1.4 to 1.6 Captain: `/captain/trip` from planet list to completed trip. `trips/status`, `trips/stops`, 13 service functions, 9 actions. Race-safe add: reserve space on the trip row, then claim the order. Every other step locks the trip row first.
- Not built on purpose (D40): pagination, search, auto-refresh, waiting time, expected profit, Admiral lists, captain trip history.
- New shared pieces: `lib/pg-error`, `FormState`, `components/action-button`, `components/status-badge`, `test/orders`.
- 557 automated tests (161 before). New: both status machines over every pair, money formulas, ETA, cart, stop grouping, database checks and triggers for orders and trips, service tests for permissions, scoping, snapshots, idempotency and the races (two captains on one order, parallel adds past 20 units, double clicks, last two stops at once), Server Action tests, and the full flow from `placeOrder` to COMPLETED with the exact event list.
- Checked in a real browser against a production build: 38 checks across customer, manager and captain, from checkout to "Delivered to division", plus a rejected order.
- Known behavior: a scoped lookup that finds nothing renders the not-found page, but the HTTP status is 200 because `loading.tsx` has already started the response.

### 2026-11-22 · Phase 0 test gaps closed

- Audit of slices 0.1 to 0.5 against their acceptance criteria. No app code changed: the gaps were all missing tests.
- Added: database constraint tests (planets, sectors, products, user role, one manager per planet), page guard tests for all 16 role and page pairs, `proxy.ts` tests, Server Action tests (all 15 demo logins land on their role home, sign-in, sign-up, log out), and a check that the test run is connected to `terra_ops_test`.
- 161 automated tests. Not covered by a test: one session read per request (`cache()` only works inside a React render).
- Not done: 0.6 live deploy.

### 2026-11-21 · Phase 0, slices 0.1 to 0.5

- 0.1: `lib/errors`, `action-result`, `money`, `dates` with unit tests. Test database set up by the test run. CI workflow added.
- 0.2: seed (`npm run db:seed -- --yes`) for users, 7 planets, 14 sectors, 34 divisions, 5 products. `listLocationTree`, `getDivisionWithPlanet`, `listProducts`.
- 0.3: session helpers, `proxy.ts`, role layouts, app shell, login. 0.4: customer sign-up. 0.5: demo login for the 15 seeded accounts.
- Checked by hand over HTTP: every redirect in the slice tables, login, wrong password, sign-up, duplicate email, role in the sign-up body, demo login, log out. 84 automated tests.
- Not done: 0.6 live deploy. Browser click-through on a real screen is still to do.

### 2026-11-21 · Database migrated

- Approved as D33. Migrations `0001_domain` and `0002_triggers` generated and applied to the local database: 13 tables, 10 triggers.
- The 99 checks were rerun against the migration files: all as expected.
- `plan.md` §3 now points to `database.md`. Phase 0 and 1 slices no longer plan schema work that is done.

### 2026-11-21 · Database design reviewed

- A review attacked the first schema with 20 statements. Fixes: triggers in `drizzle/0002_triggers.sql` (append-only history, frozen snapshot columns, commit-time trip check for units, status agreement and stuck trips), `order_events.seq`, `clock_timestamp()`, one event per status, timestamp order checks, $1,000,000 money cap.
- `database.md` corrected: flexibility costs, ERD minimums, D7 wording, a longer "does not enforce" list. `hld.md` §5, §6, §10 and `lld/01`, `03`, `04`, `05` now match the schema.
- Verified on a throwaway database: 99 checks and one two-session race, all as expected. Still no migration generated or applied.

### 2026-11-21 · Database design (proposed)

- Added `database.md` and the Drizzle schema for all 9 domain tables in `src/db/schema/`.
- Verified on a throwaway database: 58 constraint checks, all as expected. No migration generated or applied yet.

### 2026-11-21 · Gaps G1 to G4 closed

- Client PDF compared with `requremt-by-client.md`: identical.
- Decisions D29 to D32 applied to `plan.md`, `phases/`, `hld.md`, `lld/` and `traceability.md`. All 34 requirements are now fully covered.

### 2026-11-21 · Docs map and requirements check

- Added the docs map to this file.
- Added `traceability.md`: 34 client requirements checked against all docs. 30 covered, 4 with a gap (G1 to G4), none missing.

### 2026-11-21 · Low-level design

- Added `lld/`: one file per feature (shared, auth, locations, settings, orders, trips, reports) and an index listing all 18 Server Actions, 45 service functions, the auth route handler, 21 pages and the URL parameters.

### 2026-11-21 · High-level design

- Added `hld.md`: system context, architecture, code structure, request flows, domain model, lifecycles, money, security, consistency, caching, deployment, testing, failure modes, trade-offs.
- Added the GitHub account rule (D28). First push to `github.com/sajjad-mugdho/terra-ops`.

### 2026-11-21 · Phase files

- Added `phases/`: the plan cut into 29 vertical slices across phases 0 to 6, each with build steps, acceptance criteria, edge cases and tests.
- Agent and skill files added to `.gitignore` (D20).

### 2026-11-21 · Full plan

- Added `plan.md`: routes, data model, status machines, money, permissions, feature specs with edge cases, phases, tests, seed, CI and deploy.
- Added decisions D17 to D27. Phase plan is final.

### 2026-11-21 · Architecture rules

- `AGENTS.md` rewritten: feature-based folder structure, Data Access Layer, thin Server Actions, request flows, import rules, error handling, 13 Next.js rules, domain rules, test rules.
- Added decisions D14 to D16.

### 2026-11-21 · Setup

- Next.js 16.4 scaffold: TypeScript strict, Tailwind CSS 4, shadcn/ui, ESLint.
- Drizzle with node-postgres, Docker Postgres 17, first migration with the Better Auth tables.
- Better Auth: email + password, `role` field defaulting to `customer` with `input: false`, Next.js route handler.
- Vitest config, Zod env validation, `.env.example`.
- `AGENTS.md` (project rules) and `CLAUDE.md` (imports `AGENTS.md`).
- Verified: typecheck, lint, test and build pass. A sign-up request that sends `role: "admiral"` still creates a `customer`.
