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
| D9 | Staff accounts | Admiral, 7 managers and 3 captains come from the seed only. No staff management UI. Listed as "what I would build next" |
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

## Changes vs project.md

| project.md said | Now |
|---|---|
| Order "treated as paid when placed", and refunds out of scope (contradiction on rejection) | Paid at checkout. Rejection refunds automatically as a status (D2 to D4) |
| A planet may have more than one manager | Exactly one per planet (D7). Removes F7's "two managers click at once" edge case |
| Seed managers for at least 3 planets | A manager for all 7 planets |
| Company counts DELIVERED orders, captain counts COMPLETED trips, manager report unspecified | One rule for all reports: delivered (D11) |
| Nice-to-haves only if time is left | All in scope, phase by phase (D1) |
| Seed users: 1 admiral, 3+ managers, 3 captains, 4 customers | 1 admiral, 7 managers, 3 captains, 4 customers, plus public customer sign-up |

## Plan

Reference material (data model, status machines, money, permissions) is in `plan.md`. The work order is in `phases/`: 7 phase files, 29 vertical slices, each with acceptance criteria, edge cases and tests. Items still waiting for confirmation are in its section 15.

## Phase status

| Phase | Status |
|---|---|
| Setup | Done |
| 0 Foundation | Slices 0.1 to 0.5 done locally. 0.6 (live deploy) waits for the Neon and Vercel projects |
| 1 to 6 | Not started |

## Open questions

- Confirmations C5, C6, C8, C9, C10 in `plan.md` §15 (C1 to C4 and C7 are settled).
- Slice 0.6 needs the Neon pooled connection string and the Vercel project from the user (D26).

## Changelog

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
