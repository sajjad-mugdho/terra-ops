# Phase 0 · Foundation

**Goal:** every role can log in on the live URL and lands on its own home. Wrong-role URLs are blocked. CI is green.

**Time:** ~4h, Saturday morning. **Depends on:** project setup (done).

---

## Slice 0.1 · Tooling baseline

**Outcome:** a clean first commit, shared helpers, a working test database, and CI running on every push.

### Build

| Layer | Work |
|---|---|
| Git | First commit of the existing setup. Agent files are already ignored (D20) |
| Shared | `lib/errors.ts` (`AppError` + codes), `lib/action-result.ts` (`ActionResult` + mapper), `lib/money.ts`, `lib/dates.ts` |
| Tests | Install `server-only`, alias it to an empty module in `vitest.config.ts`. Global setup: create `terra_ops_test` if missing, run migrations. Helper to truncate all domain tables. Test files run one at a time |
| CI | `.github/workflows/ci.yml`: Postgres 17 service, install, migrate, `typecheck`, `lint`, `test`, `build`, with dummy env values |

### Acceptance criteria

- [ ] `formatMoney(1250)` gives `$12.50` **[C4]**. `parseDollarsToCents("12.5")` gives `1250`.
- [ ] `npm run test` creates and migrates the test database by itself on a fresh machine with only `npm run db:up` done.
- [ ] Tests never touch the dev database `terra_ops`.
- [ ] CI runs on push and on pull request, and all four checks are separate visible steps.
- [ ] The mapper turns an `AppError` into `{ ok: false, error }` and a Zod error into `{ ok: false, error, fieldErrors }`.

### Edge cases

| Case | Expected |
|---|---|
| `parseDollarsToCents("12.345")` | Rejected: more than 2 decimals |
| `parseDollarsToCents("-1")`, `"abc"`, `""` | Rejected |
| `parseDollarsToCents("0")` | `0` |
| `formatMoney(-1500)` | `-$15.00` (needed for loss trips) |
| `formatMoney(5)` | `$0.05` |
| Float math like `0.1 + 0.2` | Never happens: parsing works on the string, not on floats |
| Duration of 0 minutes | `0m`. 26h → `1d 2h` |
| Unknown thrown error in an action | Not caught by the mapper. Reaches `error.tsx` |
| Test run while the test DB is missing | Global setup creates it |

### Tests

- Unit: every money and date case above.
- Unit: the error mapper for each `AppError` code and for a Zod error.

---

## Slice 0.2 · Reference data

**Outcome:** planets, sectors, divisions and products exist in the database and can be read as one tree.

### Build

| Layer | Work |
|---|---|
| Schema | `planets`, `sectors`, `divisions`, `products` with all constraints from `plan.md` 3.1. Migration |
| Seed | `npm run db:seed -- --yes`: 7 planets, 2 sectors each, 2 to 3 divisions each, 5 products **[C1]**. Includes Mars → Olympus Sector → Division 7 |
| Service | `locations/service.ts`: `listLocationTree()`, `getDivisionWithPlanet(id)`. `settings/service.ts`: `listProducts()` (price only, no making cost, for non-admirals) |

### Acceptance criteria

- [ ] The seed can run twice in a row and gives the same data (wipe, then insert).
- [ ] The seed refuses to run without `--yes` and prints which database it will wipe.
- [ ] `listLocationTree()` returns every planet with its sectors and divisions in one query, sorted by name.
- [ ] `listProducts()` for a customer returns no `makingCostCents` key.

### Edge cases

| Case | Expected |
|---|---|
| Insert a planet with `days_from_earth = 0` | DB rejects |
| Insert a negative price, charge or fuel cost | DB rejects |
| Two sectors with the same name on one planet | DB rejects |
| Same sector name on two different planets | Allowed |
| `getDivisionWithPlanet` with an unknown or malformed ID | `INVALID`, not a crash |
| `listLocationTree()` without a session | `UNAUTHORIZED` |
| Seed run against the live database | Works the same, still needs `--yes` |

### Tests

- Service: tree shape and sort order. Unknown division. No session.
- Service: `listProducts()` DTO has no cost key for customer, manager and captain.
- DB: each constraint above is rejected.

---

## Slice 0.3 · Sign in and role homes

**Outcome:** a seeded user logs in with email and password, lands on the home of their role, and cannot open another role's pages.

### Build

| Layer | Work |
|---|---|
| Schema | `user.planet_id`, role CHECK, manager-needs-planet CHECK, unique manager per planet (D7). `planetId` as Better Auth additional field, `input: false`. Migration |
| Seed | 1 Admiral, 7 managers, 3 captains, 4 customers, created through Better Auth **[C2]** |
| Service | `auth/session.ts`: `getCurrentUser()` in React `cache()`, `requireUser()`, `requireRole()`. `auth/roles.ts`: role list and role home map |
| Routing | `proxy.ts` optimistic guard. `(auth)/login`. `(app)` layout with app shell. One layout per role segment calling `requireRole`. `/` redirect |
| UI | Login form (`useActionState`), app shell: product name, role label, user name, planet name for managers, role nav, log out. Empty home page per role |

### Acceptance criteria

- [ ] Correct email and password → redirect to the role home: `/customer/orders`, `/manager/queue`, `/captain/trip`, `/admiral`.
- [ ] Wrong password or unknown email → one message, "Invalid email or password". It does not say which one was wrong.
- [ ] The app shell shows only the nav links of the current role.
- [ ] A manager sees their planet name in the shell.
- [ ] Log out ends the session and returns to `/login`. The back button does not show protected content.
- [ ] `/` sends a signed-in user to their home and a visitor to `/login`.

### Edge cases

| Case | Expected |
|---|---|
| Visitor opens `/admiral` | Redirect to `/login` (proxy) |
| Customer opens `/admiral`, `/manager/queue`, `/captain/trip` | Redirect to `/customer/orders` |
| Signed-in user opens `/login` or `/sign-up` | Redirect to role home |
| Session cookie present but expired or invalid | Proxy lets it pass, the layout finds no session, redirect to `/login` |
| Server Action called with an expired session | `UNAUTHORIZED`, form shows "Please log in again" |
| Insert a manager with no planet | DB rejects |
| Insert a customer, captain or admiral with a planet | DB rejects |
| Insert a second manager for one planet | DB rejects |
| Unknown route | `not-found.tsx` |
| Email typed with capitals or spaces | Trimmed and lowercased before sign-in |
| `getCurrentUser()` called 5 times in one request | One session read (`cache()`) |

### Tests

- Service: `requireRole` passes for the right role, throws `FORBIDDEN` for a wrong role, `UNAUTHORIZED` with no session.
- DB: the three user constraints above.
- Seed check: every planet has exactly one manager.

---

## Slice 0.4 · Customer sign-up

**Outcome:** anyone can create a customer account and is logged in right away.

### Build

| Layer | Work |
|---|---|
| Schema | `schemas.ts`: name 2 to 60 chars, valid email, password 8 to 128 chars |
| Action | `signUp`: validate, call Better Auth, redirect to `/customer/orders` |
| UI | `(auth)/sign-up` form with field errors. Links between login and sign-up |

### Acceptance criteria

- [ ] A new account is always a customer with no planet.
- [ ] After sign-up the user is logged in and on `/customer/orders` with an empty state.
- [ ] Each invalid field shows its own message next to the field. Typed values stay in the form, except the password.

### Edge cases

| Case | Expected |
|---|---|
| Email already used | Field error "An account with this email already exists" |
| Request body contains `role: "admiral"` or `planetId` | Ignored. Account is a customer (verified in setup, now a test) |
| Password under 8 characters | Field error |
| Name is only spaces | Field error |
| Double click on submit | Button disabled while pending. Second request fails on the unique email, no duplicate |
| Same email in different letter case | Treated as the same email |

### Tests

- Service/API: sign-up with `role` and `planetId` in the body still creates a plain customer.
- Unit: schema accepts and rejects the cases above.

---

## Slice 0.5 · Demo login

**Outcome:** a reviewer logs in as any seeded user with one click.

### Build

| Layer | Work |
|---|---|
| Data | `auth/demo-users.ts`: the list of seeded demo emails with name, role, planet. The seed reads the same list |
| Action | `demoLogin(email)`: allowed only for emails in that list, signs in with the shared demo password |
| UI | On `/login`, under the form: demo accounts grouped by role, each with a "Log in as" button. Managers show their planet |

### Acceptance criteria

- [ ] All 15 demo accounts (1 + 7 + 3 + 4) are listed and each button logs in to the right role home.
- [ ] The seed and the login page use the same list, so they cannot drift apart.
- [ ] Works on the live URL.

### Edge cases

| Case | Expected |
|---|---|
| `demoLogin` called with an email not in the list (for example a real customer's) | `FORBIDDEN`. It can never be used to log in as a real account |
| Demo user missing from the database (seed not run) | Clear message "Demo data is missing. Run the seed." |
| A demo account's password was changed | Not possible: there is no change-password feature |
| Two reviewers use the same demo account at once | Works. Each gets their own session |

### Tests

- Service: `demoLogin` rejects an email outside the list.
- Seed check: every email in the demo list exists with the listed role.

---

## Slice 0.6 · First live deploy

**Outcome:** the app runs on a public URL with seeded data.

### Steps

1. User creates the Neon project and gives the pooled connection string (D26).
2. User creates the Vercel project from the GitHub repo and sets `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.
3. Run migrations against Neon **[C8]**.
4. Run the seed against Neon.
5. Add the live URL to `context.md`.

### Acceptance criteria

- [ ] The live URL loads over HTTPS in a private window.
- [ ] One demo login per role works on the live URL.
- [ ] A new customer can sign up on the live URL.
- [ ] CI is green on the pushed commit.

### Edge cases

| Case | Expected |
|---|---|
| A required env var is missing on Vercel | Build fails with a clear Zod message naming the variable |
| `BETTER_AUTH_URL` still points to localhost | Login fails. Checked as part of this slice |
| Direct (not pooled) Neon string used | Works at low traffic but risks connection limits. The pooled string is required |
| Migration fails halfway | Drizzle migrations run in a transaction. Fix and rerun |

---

## Phase gate

- [ ] 4 roles log in on the live URL and land on their own home.
- [ ] A customer cannot open any `/admiral`, `/manager` or `/captain` URL.
- [ ] Sign-up creates only customers.
- [ ] CI green. `context.md` updated. Pushed.
