# Deploy and runbook

How to put Terra Supply Co. on a live URL, check it, and keep it in a known state.

The Neon project, the Vercel project and every secret belong to the owner (D26). Nothing in this repo deploys by itself and no secret is stored in it.

## 1. What is needed

| Thing | Who has it | Used for |
|---|---|---|
| GitHub repo `sajjad-mugdho/terra-ops` | Owner | Code, CI |
| Neon project (exists, Postgres 18, see D61) | Owner | Live database |
| Vercel project | Owner creates it | Live app |
| Node 24+ on a local machine | Owner | Migrations, seed, smoke test |

## 2. Environment variables

Three variables. All are required. `src/env.ts` checks them at build and at startup.

| Variable | Rule | Local | Vercel (Production) |
|---|---|---|---|
| `DATABASE_URL` | A `postgres://` or `postgresql://` URL | `postgresql://terra:terra@localhost:5434/terra_ops` | The Neon **pooled** string. The host contains `-pooler` and the string ends with `?sslmode=require` |
| `BETTER_AUTH_SECRET` | At least 32 characters | `openssl rand -base64 32` | A new value from `openssl rand -base64 32`. Not the local one |
| `BETTER_AUTH_URL` | An `http://` or `https://` URL, no trailing slash | `http://localhost:3000` | The exact URL people open, for example `https://terra-ops.vercel.app` |

What the check does:

| Case | Result |
|---|---|
| A variable is missing or empty | Build fails: `Invalid environment: DATABASE_URL is missing. See .env.example.` |
| A value breaks its rule | Build fails: `Invalid environment: BETTER_AUTH_SECRET is invalid. ...` The value is never printed |
| `BETTER_AUTH_URL` is localhost on Vercel | Build fails: `BETTER_AUTH_URL points to localhost on Vercel.` |
| `BETTER_AUTH_URL` is a real URL but not the one people open | The build passes and login fails. The smoke test catches it |

Rules for secrets:

- `.env` is in `.gitignore`. Only `.env.example` is committed, and it holds no secret.
- CI uses dummy values written in the workflow file. They protect nothing.
- `npm run check:repo` fails if a `.env`, a key file or an agent file is tracked or was ever committed. CI runs it first.
- A secret that was committed once is burned. Rotate it (section 8). Deleting the file is not enough.
- The demo password `terra-demo-2026` is public on purpose. The demo accounts hold only seed data.

## 3. First deploy

### 3.1 Neon

The project exists and is linked (D61). The strings are in the git-ignored `.env.neon`: `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct).

`neon init`, `neon deploy` and `neon env pull` write the Neon string into `.env`. After any of them, move the Neon lines to `.env.neon` and put the local `DATABASE_URL` back, or the next local `db:seed` and test run hit the live data.

### 3.2 Migrate and seed, from the local machine

Migrations and the seed are run by command, never in the Vercel build (D58).

```bash
set -a && . ./.env.neon && set +a
DATABASE_URL="$DATABASE_URL_UNPOOLED" npm run db:migrate
npm run db:seed -- --yes
unset DATABASE_URL DATABASE_URL_UNPOOLED
```

- Both commands read `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` from the local `.env`. Their values do not matter here: the seed only hashes passwords.
- The seed prints the host and database name before it starts. Read it. It wipes every row.
- If a command fails on the pooled string, use the direct string for these two commands. Vercel always gets the pooled one.
- The export lives only in that terminal. Do not write the Neon string into `.env`, or the next local `db:seed` wipes the live data.

### 3.3 Vercel

1. Import the GitHub repo. Framework: Next.js. No other setting is needed, and there is no `vercel.json`.
2. Node.js version: 24.x.
3. Set the three variables for the Production environment (section 2).
4. Put the function region next to the Neon region.
5. Deploy. Then open the URL Vercel shows.
6. If that URL is not what `BETTER_AUTH_URL` says, fix the variable and redeploy.

Preview deployments get their own URL, so login does not work on them unless `BETTER_AUTH_URL` is set per preview. Use the production URL for the review.

### 3.4 Check

```bash
npm run smoke -- https://<live-url>
```

All lines must say PASS. Then add the live URL to `README.md` and `docs/context.md`.

## 4. Later deploys

| Change | Steps |
|---|---|
| Code only | Push. CI must be green. Vercel deploys |
| New migration | Run `npm run db:migrate` against Neon first, then push. Keep the migration additive, so the old code keeps working while the new one builds |
| Demo data is dirty | `npm run db:seed -- --yes` against Neon |

## 5. Smoke test

`npm run smoke` checks a running app that has the seed data. Default target: `http://localhost:3000`.

```bash
npm run smoke                            # local
npm run smoke -- https://<live-url>      # live
```

| Check | Proves |
|---|---|
| `/api/auth/ok` answers | The app is up and the auth handler is mounted |
| `/login` and `/sign-up` load, demo accounts are listed | Pages render |
| A visitor on `/`, `/admiral`, `/manager`, `/captain`, `/customer` goes to `/login` | The proxy guard works |
| One account per role signs in | The database is reachable, migrated and seeded. `BETTER_AUTH_URL` matches the URL |
| Each role lands on its own home and can open it | Role routing and the first service read of each role |
| A customer on a staff URL is sent home | Role guards |
| A wrong password gets 401 | Auth refuses bad logins |

Notes:

- There is no separate health endpoint. Better Auth already serves `/api/auth/ok`, and a sign-in is the real database check.
- Better Auth allows 3 sign-ins per 10 seconds per IP in production. The script waits and retries, so a run takes about 15 seconds.
- Each run leaves 4 session rows. The next seed removes them.
- CI runs the same script against `next start` after `db:seed`.

## 6. Walkthrough (slice 6.1)

Run on the live URL, in a private window, with the browser console and network tab open. Reseed first and reseed again at the end.

| # | As | Do | Expect |
|---|---|---|---|
| 1 | Visitor | Open the live URL | Login page with demo accounts |
| 2 | New customer | Sign up, place a 3-unit order to Mars | Tracking page, "Order placed", "Paid" |
| 3 | Mars manager | Accept it | Leaves the queue |
| 4 | Captain | Start a Mars trip, add the order, see expected profit | Loss warning for a small trip |
| 5 | Captain | Add more orders, load, lift off, land, deliver each stop | Trip completes |
| 6 | Customer | Open the order | All 8 steps with UTC times |
| 7 | Customer | Place a second order | Tracking page again |
| 8 | Manager | Reject it with a reason | Customer sees reason and "Refunded" |
| 9 | Admiral | Open the dashboard | The delivered order is counted |
| 10 | Admiral | Change the Water price | Checkout shows the new price, dashboard past numbers unchanged, history has the row |
| 11 | Manager | Open the report | No cost or profit anywhere |
| 12 | Captain | Open earnings | The completed trip is listed |
| 13 | Customer | Paste an `/admiral` URL and another customer's order URL | Redirect home, and not found |

For step 4, a captain without an open trip is needed. In a fresh seed every demo captain has one. Use `captain2@terra.demo`: cancel the PLANNING Venus trip, then start the Mars trip.

Also check by hand:

- No console errors and no failed requests.
- Every page at laptop width and at 375px.
- Every form with the keyboard only. Every input has a label.

## 7. Submission checklist (slice 6.4)

- [ ] Repo is public.
- [ ] `npm run check:repo` passes: no `.env`, no secrets, no agent files in the history.
- [ ] CI is green on the last commit.
- [ ] `npm run smoke -- https://<live-url>` passes.
- [ ] The live URL works in a private window and on a second device.
- [ ] The video is under 5 minutes, recorded on the live URL, and its link opens without a login.
- [ ] The README has the live URL and the video link.
- [ ] `docs/context.md`: all phases done, final changelog entry.
- [ ] The live database was reseeded as the last step.
- [ ] The GitHub account used for the push was confirmed.

## 8. When something goes wrong

| Problem | Do |
|---|---|
| Build fails with `Invalid environment` | Fix the named variable in Vercel, redeploy |
| Login fails on the live URL, pages load | `BETTER_AUTH_URL` is not the URL in the address bar. Fix, redeploy |
| Every page shows the error page | Database unreachable. Check `DATABASE_URL`, and that migrations ran |
| First page is slow after a quiet period | The Neon database was asleep. Normal on the free plan |
| "too many connections" | The direct string is in use. Switch Vercel to the pooled string |
| A deploy is broken | Vercel: promote the previous deployment (instant rollback). There is no down migration, so an additive migration is what keeps the old code running |
| A migration failed halfway | It ran in a transaction, so nothing was applied. Fix and rerun |
| Demo data was changed by a visitor | Reseed |
| A secret was committed or leaked | Rotate it, then redeploy: a new `BETTER_AUTH_SECRET` (everyone is logged out), or reset the Neon role password and update `DATABASE_URL`. Then clean the history |
