# Phases

The build plan from `../plan.md`, cut into vertical slices. `plan.md` holds the reference material (data model, status machines, money, permission matrix). These files hold the work order.

## What a vertical slice is here

One slice delivers one thing a user can do, through every layer: schema and migration, pure domain logic, service (`service.ts`), Server Action (`actions.ts`), UI, tests. After a slice is merged, the app works and the new behavior can be clicked on the live URL.

No slice builds a layer "for later". A table, function or component is added in the first slice that needs it.

## Phases and slices

| Phase | File | Slices | When | Time |
|---|---|---|---|---|
| 0 Foundation | [phase-0-foundation.md](phase-0-foundation.md) | 0.1 Tooling baseline · 0.2 Reference data · 0.3 Sign in and role homes · 0.4 Customer sign-up · 0.5 Demo login · 0.6 First live deploy | Sat morning | ~4h |
| 1 Order flow | [phase-1-order-flow.md](phase-1-order-flow.md) | 1.1 Checkout · 1.2 My orders and tracking · 1.3 Accept and reject · 1.4 Build a trip · 1.5 Depart and land · 1.6 Deliver stops | Sat | ~9h |
| 2 Money and reports | [phase-2-money-and-reports.md](phase-2-money-and-reports.md) | 2.1 Product settings · 2.2 Planet settings · 2.3 Admiral dashboard · 2.4 Manager purchases · 2.5 Captain earnings · 2.6 Admiral orders and trips · 2.7 Seed history | Sun morning | ~6h |
| 3 Client pains | [phase-3-client-pains.md](phase-3-client-pains.md) | 3.1 Expected trip profit · 3.2 Waiting time | Sun midday | ~1.5h |
| 4 Usability | [phase-4-usability.md](phase-4-usability.md) | 4.1 Auto-refresh · 4.2 Pagination · 4.3 Search and filters | Sun afternoon | ~2.5h |
| 5 History | [phase-5-history.md](phase-5-history.md) | 5.1 Settings history page | Sun afternoon | ~1h |
| 6 Ship | [phase-6-ship.md](phase-6-ship.md) | 6.1 Final reseed and walkthrough · 6.2 README · 6.3 Video · 6.4 Submission check | Sun evening | ~4h |
| 7 Dashboard redesign | [phase-7-redesign.md](phase-7-redesign.md) | 7.1 Shell: sidebar, header, theme · 7.2 Shared pieces · 7.3 Admiral dashboard with charts · 7.4 Overview pages | Sun evening | ~5h |

Slices run in the listed order. Each depends only on slices above it.

## Definition of done

**For a slice**

- Every acceptance criterion is checked by hand in the browser.
- Every listed edge case behaves as written.
- Every listed test exists and passes.
- `typecheck`, `lint`, `test`, `build` pass locally.
- Committed with a plain message. One slice is one or a few small commits.

**For a phase**

- All its slices are done.
- Pushed, CI is green, and the phase gate at the bottom of its file passes on the live URL.
- `../context.md` is updated: phase status, any new decision, changelog entry.

## Rules that apply to every slice

These are not repeated in each slice. They come from `AGENTS.md`.

- Every service function starts with the session, role and scope check.
- Every Server Action validates input with Zod and returns `ActionResult`.
- A record outside the user's scope gives the same result as a record that does not exist.
- Every status change writes its `order_events` row in the same transaction.
- Money is integer cents. Times are UTC.
- Pages have `loading.tsx`, `error.tsx`, an empty state, and exported `metadata`.
- After a mutation, every affected page is revalidated.

## Open confirmations

Items C1 to C10 in `../plan.md` section 15 are still proposals. Slices that use one are marked **[C#]**.
