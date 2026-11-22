# Terra Supply Co.

[![CI](https://github.com/sajjad-mugdho/terra-ops/actions/workflows/ci.yml/badge.svg)](https://github.com/sajjad-mugdho/terra-ops/actions/workflows/ci.yml)

The software that runs an Earth-to-planets supply company.
Customers order supplies, planet managers accept them, captains fly them out, and the Grand Admiral sees what every planet earns.
Built in one weekend with one goal: money and order status are always correct, and tests prove it.

| | |
|---|---|
| Live URL | https://terra-ops-gold.vercel.app (Vercel + Neon). Steps: [docs/deploy.md](docs/deploy.md) |
| Video walkthrough | Not recorded yet. It is recorded on the live URL |
| Run it now | [Run locally](#9-run-locally-run-tests), about 3 minutes |

## Contents

1. [What it is](#1-what-it-is)
2. [Demo users and a 2-minute tour per role](#2-demo-users-and-a-2-minute-tour-per-role)
3. [What I chose to do well](#3-what-i-chose-to-do-well)
4. [Architecture](#4-architecture)
5. [How correctness is protected](#5-how-correctness-is-protected)
6. [Key decisions and trade-offs](#6-key-decisions-and-trade-offs)
7. [Assumptions](#7-assumptions)
8. [Out of scope, and what I would build next](#8-out-of-scope-and-what-i-would-build-next)
9. [Run locally. Run tests](#9-run-locally-run-tests)

## 1. What it is

The client named three pains. Each has a direct answer in the product.

| Pain | Answer |
|---|---|
| Orders get lost | Every order has one status, one owner per step, a full timeline, and a visible waiting time |
| Nobody knows what a planet earns | Admiral dashboard: revenue, making cost and profit per planet and per product, from frozen prices |
| Captains fly trips that lose money | Expected profit while building a trip, and a loss warning before loading |

Four roles, each with its own home:

| Role | Does |
|---|---|
| Customer | Signs up, orders up to 20 units to a division, pays at checkout, tracks 8 steps |
| Planet Manager | Accepts or rejects the orders of their own planet, sees a purchases report |
| Captain | Builds a trip of up to 20 units to one planet, loads, lifts off, lands, delivers each stop |
| Grand Admiral | Sets prices and planet charges, sees the dashboard, all orders, all trips and the change history |

## 2. Demo users and a 2-minute tour per role

The live URL opens on a landing page: an orbit of the seven planets, a delivery price calculator and one "Enter as" button per role.
Or open `/login` and click a name under "Demo accounts". No typing needed.
To type instead: every demo account has the password `terra-demo-2026`.

| Role | Email | Starts on |
|---|---|---|
| Grand Admiral | `admiral@terra.demo` | `/admiral` |
| Planet Manager | `manager.<planet>@terra.demo`, for example `manager.mars@terra.demo` | `/manager` |
| Captain | `captain1@terra.demo` to `captain4@terra.demo` | `/captain` |
| Customer | `customer1@terra.demo` to `customer4@terra.demo` | `/customer` |

Planets: mercury, venus, mars, jupiter, saturn, uranus, neptune. A new customer can also sign up at `/sign-up`.

The seed holds 32 orders and 11 trips, so every one of the 9 order statuses and 6 trip statuses is on screen from the first login.

Every role starts on a "Dashboard" with its headline numbers and charts. The pages below are in the sidebar. The sun and moon button in the header switches between light and dark.

### Customer (`customer1@terra.demo`)

1. "My orders": orders in different statuses. Search "1001", filter by status.
2. Open a delivered order: all 8 steps with UTC times.
3. "New order": pick Mars, Olympus Sector, Division 7, add 3 Water, review, "Pay & place order".
4. The tracking page shows "Order placed" and "Paid". It refreshes by itself every 10 seconds.

### Planet Manager (`manager.mars@terra.demo`)

1. "Order queue": new orders for Mars with their waiting time. Accept one. It leaves the queue.
2. Reject one with a reason. The customer sees the reason and "Refunded".
3. "All orders": every Mars order, with search by code or customer name.
4. "Purchases": units and money per product, "Delivered" and "In progress". No making cost and no profit anywhere.

### Captain

| Account | Open trip in the seed | Good for |
|---|---|---|
| `captain2@terra.demo` | PLANNING, Venus | Adding orders, expected profit, loss warning |
| `captain4@terra.demo` | LOADED, Uranus, full ship | Lift off, land |
| `captain3@terra.demo` | LIFTED_OFF, Saturn | Land, deliver |
| `captain1@terra.demo` | LANDED, Mars | Delivering stops until the trip completes |

1. As `captain2`: "Current trip" shows "Earnings − Fuel = Expected profit" and each available order as "+$N".
2. A small trip shows "This trip will lose $X" above "Mark as loaded". Loading stays allowed.
3. As `captain1`: deliver each stop. After the last one the trip is COMPLETED.
4. "Trips and earnings": totals over completed trips and the trip history. A loss trip is red.

### Grand Admiral (`admiral@terra.demo`)

1. "Dashboard": totals with the change against the period before, the "Revenue and profit" chart, "Profit by planet", the pipeline, the "Waiting too long" card, and both tables under "Breakdown".
2. "Products": change the Water price. Checkout shows the new price at once. The dashboard numbers of past orders do not move.
3. "Change history": the change is listed with old value, new value, who and when.
4. "Orders" and "Trips": read-only lists of everything, with making cost and profit on the order detail.

### Access checks to try

- As a customer, open `/admiral`: you are sent to your own home.
- As a customer, open another customer's order URL: not found.
- As a manager, open an order of another planet: not found.

## 3. What I chose to do well

**Correctness of money and status.** One weekend is not enough to do everything well, so one thing had to be right without exceptions. A supply company that loses an order or reports a wrong profit has no product.

| Choice | What it means in practice |
|---|---|
| Money is integer cents | No float ever touches an amount |
| Prices are frozen on the order | A price change today never changes a report about last week |
| One counting rule | Money counts when the order is delivered. The Admiral, the manager and the captain always agree |
| Status changes are race-safe | Two captains cannot take the same order. A ship cannot pass 20 units |
| The database has the last word | Constraints and triggers refuse bad data even if the application code has a bug |
| It is proven | 1058 automated tests, most of them against a real Postgres |

What I gave less time to on purpose: visual polish, staff management, real payments. See [section 8](#8-out-of-scope-and-what-i-would-build-next).

## 4. Architecture

Next.js 16.4 (App Router, Server Actions) · TypeScript strict · Tailwind CSS 4 · shadcn/ui · Recharts · PostgreSQL 17 · Drizzle ORM · Better Auth · Zod 4 · Vitest · Vercel + Neon.

One deployable unit: a Next.js app and one Postgres database. No separate API, no queue, no cache.

### Folder structure

```
src/
├─ app/            Routing only. Pages compose features and hold no business logic
│  ├─ (auth)/      login, sign-up
│  ├─ (app)/       admiral/, manager/, captain/, customer/
│  └─ api/auth/    Better Auth handler, the only route handler
├─ features/       One folder per business area
│  ├─ auth/        session helpers, role guards, demo users
│  ├─ locations/   planets, sectors, divisions
│  ├─ settings/    prices, planet charges, change history
│  ├─ orders/      checkout, accept and reject, tracking, timeline
│  ├─ trips/       trip building, trip steps
│  └─ reports/     dashboard, manager purchases, captain earnings
├─ components/     shared UI, shadcn primitives in ui/
├─ db/             Drizzle client and schema
├─ seed/           demo data
├─ lib/            money, dates, errors, pagination, search
├─ env.ts          validated environment variables
└─ proxy.ts        optimistic redirect to /login
```

Inside a feature:

| File | Holds | Rule |
|---|---|---|
| `service.ts` | Every read and write of the feature: the Data Access Layer | Server only. Checks session, role and scope. Returns small DTOs, never raw rows |
| `actions.ts` | Server Actions | Thin: Zod parse, call the service, revalidate, return a result. No database access |
| `schemas.ts` | Zod input schemas | Shared by forms and actions |
| `status.ts`, `pricing.ts`, `profit.ts`, ... | Pure domain rules | No database, no framework. Fully unit tested |
| `components/` | Feature UI | Server Components by default. `"use client"` only on leaves |

Imports go one way: `app` → `features` → `db`, `lib`.

### Data Access Layer

A page or an action can never reach the database directly. It calls a service function, and every service function starts with the same three checks: is there a session, is the role right, is the record inside this user's scope. `import "server-only"` turns an import from client code into a build error.

A manager's query is `WHERE id = $1 AND planet_id = $myPlanet`. An order of another planet is not "forbidden", it is not found, so nobody learns that it exists.

### Server Actions

Every mutation is a Server Action. Each one is treated as a public endpoint: it takes an ID and the change, never a whole record, and the role always comes from the server session.

### One request flow: a captain adds an order to a trip

```mermaid
sequenceDiagram
    participant U as Captain (browser)
    participant A as actions.ts
    participant S as trips/service.ts
    participant D as Postgres

    U->>A: form action (tripId, orderId)
    A->>A: Zod parse
    A->>S: addOrderToTrip(tripId, orderId)
    S->>S: session, role = captain
    S->>D: BEGIN
    S->>D: UPDATE trips SET total_units = total_units + n<br/>WHERE id, captain = me, status = PLANNING, total_units + n <= 20
    S->>D: UPDATE orders SET trip_id, status = ASSIGNED<br/>WHERE id, planet = trip planet, status = ACCEPTED, trip_id IS NULL
    alt zero rows changed
        S->>D: ROLLBACK
        S-->>A: AppError CONFLICT
        A-->>U: "This order was just taken by another captain."
    else one row changed
        S->>D: INSERT order_events
        S->>D: COMMIT (trigger checks units and status agreement)
        S-->>A: ok
        A->>A: revalidatePath
        A-->>U: fresh page
    end
```

More detail: [docs/hld.md](docs/hld.md) for the design, [docs/lld/](docs/lld/) per feature, [docs/database.md](docs/database.md) for the schema and ERD.

## 5. How correctness is protected

The application states the rule, and the database enforces it.

| Risk | Protection |
|---|---|
| Two captains take one order | Conditional `UPDATE ... WHERE status = 'ACCEPTED' AND trip_id IS NULL`. One row changed, or a conflict |
| A trip over 20 units | Conditional update on the trip, a `CHECK` on the counter, and a commit-time trigger that compares the counter with the orders |
| A step applied twice (double click, stale tab) | Every transition is `UPDATE ... WHERE status = expected`. The second call changes nothing and says "Already done" |
| Status and timeline disagree | The status change and its `order_events` row are written in one transaction |
| A past order changes when a price changes | Price, making cost and delivery charge are frozen on the order line. Fuel cost is frozen on the trip. Triggers make these columns read-only |
| History is edited | Triggers make `order_events` and `settings_changes` append-only |
| An order placed twice | Unique idempotency key per customer |
| A customer pays a price they did not see | Checkout sends the expected total. The server compares, blocks on a mismatch, and shows the new price |
| A captain with two open trips | Partial unique index |
| A planet without a manager, or a manager with two planets | `planets.manager_id NOT NULL UNIQUE` |
| Impossible combinations (rejected but paid, in a trip but only placed) | `CHECK` constraints across columns |
| A manager sees profit | Manager queries never select making cost. A test walks every manager DTO at any depth and fails on a cost key |
| A sign-up picks its own role | The role field is not an input. A request that sends `role: "admiral"` still creates a customer |

**Tests.** 1058 automated tests in 3 groups:

- Pure rules: both status machines over every pair of statuses, money formulas, ETA, waiting time, profit and break-even.
- Services against a real Postgres: permissions and scope for every role, snapshots, idempotency, and the races with real parallel calls (two captains on one order, parallel adds past 20 units, double clicks, the last two stops at once).
- Database: every constraint and trigger is attacked directly with SQL.

CI runs them on every push, then seeds a database, starts the production build and runs a smoke test against it.

## 6. Key decisions and trade-offs

| Chosen | Instead of | Cost accepted |
|---|---|---|
| One Next.js app | Separate API and frontend | No API for other clients yet. Services do not depend on Next.js, so an API can be added in front of them |
| Server Actions | REST endpoints | Tied to the web UI |
| Conditional updates | A queue or long row locks | The loser of a race sees a clear message and retries by hand |
| Captains mark each step by hand | A simulated clock | A captain can land "early". ETA is only an estimate |
| Polling every 10 seconds on three pages | WebSockets or SSE | Up to 10 seconds of delay, extra queries |
| Reports aggregate in SQL on read | Stored totals | Dashboard cost grows with the order count. No drift between totals and rows |
| No caching at all | Cached reference data | Every page is a database read. Status and money are never stale |
| Offset pagination | Cursor pagination | Rows can shift between pages while data changes |
| Seed-only staff | Staff management UI | The Admiral cannot add a captain |
| Refund as a status | Payment and refund records | No ledger to reconcile |
| `pg` driver with a pooled Neon URL | Neon's HTTP driver | Real transactions, which the race-safe trip building needs |
| Migrations run by command from a developer machine | Migrations in the Vercel build | A human step before a schema deploy. A failed build can never half-migrate production |

Things the client did not ask for, and why they exist:

| Addition | Why |
|---|---|
| Manager can reject, with a reason | "Accept" implies a choice. Without reject, a bad order sits forever |
| Checkout step with PAID and REFUNDED | "Customer pays" needs a moment of payment |
| Status ASSIGNED | The customer sees that a captain picked the order |
| Captain can cancel a trip while planning | A wrong choice would trap the captain |
| Admiral sets delivery charge and fuel cost | The brief says "set per planet" but not by whom |
| ETA | The brief gives days per planet. Customers want a date |
| Customer sign-up and demo login | So a reviewer can try it in one click |

## 7. Assumptions

Every decision from [docs/context.md](docs/context.md), in plain words. The number is the decision ID there.

### Scope and people

- **D1** All 13 must-haves and all 5 nice-to-haves are built, phase by phase.
- **D12** The nice-to-haves are: expected trip profit, waiting time, auto-refresh, pagination with search, settings history.
- **D7** Every planet has exactly one manager. The database enforces it.
- **D8** Customers sign up with email and password. A new account is always a customer.
- **D9** The Admiral, 7 managers and 4 captains come from the seed. There is no staff management screen.
- **D18** There are 5 fixed products. The Admiral edits price and making cost only.
- **D30** Earth is where every trip starts. It is never a destination. The 7 other planets are.
- **D34** Seed numbers, the demo password `terra-demo-2026`, the email pattern and the `$` symbol are as listed in `docs/plan.md` §11.

### Money

- **D2** Checkout is a normal two-step page. Payment is simulated. There is no payment provider.
- **D3** An order is paid when it is placed.
- **D4** A rejected order is refunded automatically. "Refunded" is a status, not a refund system.
- **D5** The product amount goes to the company. The delivery charge goes to the captain.
- **D11** One rule for every report: money counts only when the order is delivered. Rejected orders never count.
- **D23** If a price changed since the checkout page loaded, the order is blocked and the customer confirms the new price.
- **D31** The manager report has two tables with the same columns: "Delivered" in the date range, and "In progress".
- **D32** The dashboard starts with "Profit by planet", sorted by profit.
- **D41** Reports default to today and the 30 days before it, in UTC. A bad range in the URL falls back to the default.
- **D43** A cancelled trip is listed with zero earnings, fuel and profit. It never flew.
- **D44** Trip earnings and profit live in their own DTO, separate from the trip detail.
- **D48** The open trip carries earnings, expected profit and the units still needed to cover fuel.
- **D50** A loss is made visible: red in tables, a banner on the trip, a warning before loading. Loading stays allowed.

### Orders and trips

- **D6** Captains mark every step by hand. ETA is lift-off time plus the planet's days, shown as an estimate.
- **D17** A captain can cancel a trip only while it is PLANNING. Its orders go back to ACCEPTED.
- **D25** A captain delivers the stops of a trip in any order.
- **D29** A captain sees product names and units. Never prices, making cost or the customer's name.
- **D36** The checkout idempotency key is unique per customer. No order is ever returned across customers.
- **D37** A step that was already taken changes nothing and says "Already done". A skipped step says "This step is not available yet".
- **D38** The cart lives in the URL, so a refresh and the Back link keep it.
- **D39** An order that leaves a trip shows "Removed from trip" or "Trip cancelled" in its timeline.
- **D46** An order is overdue after waiting strictly more than 3 days. PLACED waits from creation, ACCEPTED from acceptance.
- **D47** The overdue rule exists once for the UI and once as SQL. The dashboard card and the filtered list use the same SQL.
- **D49** Managers, captains and the Admiral see waiting time. Customers do not.

### Access

- **D10** Every read and write is checked on the server: session, role, scope.
- **D22** The Admiral has read-only lists of all orders and trips, with detail pages.
- **D56** The settings history list is Admiral only. It carries the actor's name, never an email or an ID.
- **D57** The history page is read-only. The difference is shown with a sign and no color, because a higher price is not good or bad by itself.

### Lists and refresh

- **D24, D54** Auto-refresh runs every 10 seconds on three pages only: customer tracking until the order is final, the manager queue, and a captain's trip while PLANNING. It stops while the tab is hidden.
- **D51** Lists show 20 rows per page with a total count, newest first. A bad page number is page 1.
- **D52** Search matches the code as shown ("ORD-1001"), without case. Managers and the Admiral also search by customer name.
- **D53** One filter form for every list. A new filter starts at page 1.
- **D55** The captain's "Trip history" lists every own trip, the open one too.
- **D40, D45** Earlier limits on lists. Both ended when pagination and search were built (D51).

### Engineering

- **D14** Feature folders with a Data Access Layer, thin Server Actions and pure domain rules.
- **D15** Every mutation is a Server Action. The only route handler is Better Auth's.
- **D16** Server Components by default. The installed Next.js docs are read before an API is used.
- **D19** History rows were written from the day settings became editable. The page came later.
- **D21** Service tests run on a real Postgres database, `terra_ops_test`. CI runs on every push.
- **D33** The schema is as in `docs/database.md`: composite foreign keys, triggers for append-only history and commit-time trip checks.
- **D35** `src/seed/` holds the seed and `src/test/` the test setup. The test run creates its own database.
- **D42** The seed shows all 9 order statuses and all 6 trip statuses, so it has 4 captains.
- **D58** Migrations and the seed run by command from a developer machine, never in the Vercel build.
- **D59** A wrong environment variable stops the build with the variable's name and never its value. On Vercel, an auth URL that points to localhost stops the build too.
- **D60** A smoke test (`npm run smoke`) checks a running, seeded deployment. CI runs it against the production build.
- **D61** The live database is a Neon project, linked with the Neon CLI. The Neon connection strings stay in a git-ignored file, away from the local `.env`.
- **D62** One dashboard shell for every role: sidebar with grouped pages, breadcrumb, light and dark theme from a cookie.
- **D63** Every role lands on an overview page with its headline numbers. The working pages keep their URLs.
- **D64** Charts use Recharts through the shadcn chart component. Time series are built in SQL, so empty days are zero. Manager charts never hold cost or profit.
- **D65** `/` is a public landing page built from `design.md`: dark only, its own token scope, CSS-only motion that stops under reduced motion. Signed-in users still go straight to their home.
- **D66** The landing page reads planets and products without a session, and only what a customer sees at checkout. A test pins the allowed fields, so no cost can leak.

### Process

- **D13** `docs/context.md` is updated at the end of every phase and in every push.
- **D20** Agent files are not committed. Demo data is reset only by the seed command. There is no reset button.
- **D26** The owner creates the Neon and Vercel projects and sets the environment variables.
- **D27** The phase plan is final: phases 0 to 6.
- **D28** Commits and pushes use one confirmed GitHub account.

## 8. Out of scope, and what I would build next

Not built, on purpose:

| Not built | Today |
|---|---|
| Staff management | Staff comes from the seed |
| Order cancellation by the customer | Only a manager can reject |
| Real payments and refunds | Both are statuses |
| Notifications (email, push) | The tracking page refreshes itself |
| Adding or removing products | 5 fixed products |
| Route planning between stops | The captain picks the order of stops |
| A demo reset button | One seed command |
| Logging, metrics, alerting, rate limiting of our own | Vercel logs, Better Auth's built-in sign-in rate limit |

What I would build next, in this order:

1. **Assignment rules or incentives for unpicked orders.** The system now shows which small far-planet orders nobody takes. The next step is to fix it, for example a bonus that grows with waiting time.
2. **Staff management.** Add a captain, replace a manager, deactivate an account.
3. **Real payments.** A payment provider, a ledger table, refunds as records.
4. **Instant updates.** Server-sent events fed by Postgres `LISTEN/NOTIFY` instead of polling.
5. **An HTTP API** in front of the existing services, for a mobile app or partners.
6. **Operations.** Structured logs, error tracking, report tables that update incrementally.

## 9. Run locally. Run tests

Needs Node 24 or newer, Docker, and `openssl`.

```bash
git clone https://github.com/sajjad-mugdho/terra-ops.git
cd terra-ops
npm install
cp .env.example .env
sed -i.bak "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$(openssl rand -base64 32)|" .env && rm .env.bak
npm run db:up               # Postgres 17 in Docker on localhost:5434
npm run db:migrate
npm run db:seed -- --yes    # wipes and reseeds the database in DATABASE_URL
npm run dev                 # http://localhost:3000
```

Open http://localhost:3000 and click a demo account.

If `db:migrate` says the connection was refused, the database is still starting. Wait a few seconds and run it again.

### Tests and checks

The tests need the Docker database to be running. They create and use their own database, `terra_ops_test`, and never touch your data.

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

### Smoke test

Checks a running, seeded app: the landing page and the auth pages load, visitors are redirected from the role pages, one account per role signs in and lands on its home, a customer cannot open staff pages.

```bash
npm run build && npm run start     # in one terminal
npm run smoke                      # in another. Or: npm run smoke -- https://your-url
```

### Environment variables

| Variable | What | Local value |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | `postgresql://terra:terra@localhost:5434/terra_ops` |
| `BETTER_AUTH_SECRET` | Signs session cookies. At least 32 characters | Generated above |
| `BETTER_AUTH_URL` | Public URL of the app | `http://localhost:3000` |

A missing or wrong variable stops the app at startup and names the variable. `.env` is ignored by git.

### Deploy

[docs/deploy.md](docs/deploy.md) has the full runbook: Neon, Vercel, migrations, seed, smoke test, the 13-step walkthrough and the submission checklist.

On the live site the first page after a quiet period can take a few seconds, because a Neon database on the free plan goes to sleep when idle.
