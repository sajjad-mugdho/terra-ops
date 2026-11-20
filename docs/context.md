# Context

Source of truth for every locked decision. Updated at the end of every phase and in every push.

## How to use this file

- Read it before starting any work.
- Where it differs from `project.md`, this file wins.
- A new decision is added here before or together with the code that depends on it.
- Every push: update **Phase status** and add a **Changelog** entry.

## Sources

| File | Owner | Role |
|---|---|---|
| `requremt-by-client.md` | Client | Requirements. Never edited |
| `project.md` | Us | Original brief and early decisions |
| `context.md` | Us | Locked decisions. Wins on conflict |

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
| 0 to 6 | Not started |

## Open questions

- Items C1 to C10 in `plan.md` section 15.
- Repo name on `github.com/sajjad-mugdho/`.

## Changelog

### 2026-11-21 · Phase files (not pushed yet)

- Added `phases/`: the plan cut into 29 vertical slices across phases 0 to 6, each with build steps, acceptance criteria, edge cases and tests.
- Agent and skill files added to `.gitignore` (D20).

### 2026-11-21 · Full plan (not pushed yet)

- Added `plan.md`: routes, data model, status machines, money, permissions, feature specs with edge cases, phases, tests, seed, CI and deploy.
- Added decisions D17 to D27. Phase plan is final.

### 2026-11-21 · Architecture rules (not pushed yet)

- `AGENTS.md` rewritten: feature-based folder structure, Data Access Layer, thin Server Actions, request flows, import rules, error handling, 13 Next.js rules, domain rules, test rules.
- Added decisions D14 to D16.

### 2026-11-21 · Setup (not pushed yet)

- Next.js 16.4 scaffold: TypeScript strict, Tailwind CSS 4, shadcn/ui, ESLint.
- Drizzle with node-postgres, Docker Postgres 17, first migration with the Better Auth tables.
- Better Auth: email + password, `role` field defaulting to `customer` with `input: false`, Next.js route handler.
- Vitest config, Zod env validation, `.env.example`.
- `AGENTS.md` (project rules) and `CLAUDE.md` (imports `AGENTS.md`).
- Verified: typecheck, lint, test and build pass. A sign-up request that sends `role: "admiral"` still creates a `customer`.
