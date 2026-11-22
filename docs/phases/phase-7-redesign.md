# Phase 7 · Dashboard redesign

**Goal:** the app reads as a dashboard. Every role gets a sidebar, a breadcrumb, an overview page with headline numbers and charts, and cleaner lists.

**Time:** ~5h, Sunday evening. **Depends on:** Phase 6. Reads only: no schema change, no new Server Action, no change to any write rule.

Decisions: D62 (look), D63 (overview pages are the role homes), D64 (charts) in `../context.md`.

---

## Slice 7.1 · Shell: sidebar, header, theme

**Outcome:** one layout for every role.

### Build

| Layer | Work |
|---|---|
| Config | `components/app-nav.ts`: the pages of each role in groups, with icons. `activeNav` picks the current page (longest match), `crumbsFor` builds the breadcrumb. Pure, unit tested |
| UI | `AppShell` composes the shadcn `Sidebar` (collapses to icons, a drawer on phones), `AppSidebar` (brand, groups, user, log out), `AppHeader` (toggle, breadcrumb, theme toggle) |
| Theme | shadcn neutral, light and dark. `ThemeToggle` flips the `dark` class and writes the `theme` cookie. The root layout reads the cookie, so the server render already has the right class |

### Acceptance criteria

- [ ] Every role sees its own groups and pages in the sidebar. The current page is marked, on detail pages too.
- [ ] The breadcrumb shows group, page and "details" on a detail page, with a link back to the list.
- [ ] The sidebar state and the theme survive a reload.
- [ ] On a phone the sidebar is a drawer and closes after a tap on a link. No horizontal page scroll at 390px.
- [ ] Log out works from the sidebar.

### Edge cases

| Case | Expected |
|---|---|
| `/admiral` and `/admiral/orders` both match | The longest match is the current page |
| No `theme` cookie | Light |
| A path that is in no group | No breadcrumb, nothing marked |

### Tests

`app-nav.test.ts`: every role starts at its home and stays in its segment, the active item for list, detail and nested paths, breadcrumbs for a page, a detail page and an unknown path.

---

## Slice 7.2 · Shared pieces

**Outcome:** lists, badges and filters look the same everywhere.

### Build

| Piece | Work |
|---|---|
| `StatusBadge` | Outline badge with a colored dot. The label always carries the meaning |
| Tables | All 11 tables use the shadcn `Table`. Cells do not wrap, the table scrolls inside its border |
| `ListFilters`, `LocationPicker` | shadcn `NativeSelect`. Still plain GET forms and plain selects |
| `StatCard`, `Delta` | One headline number with an icon and a hint. `Delta` shows the change against the period before with an arrow and a sign |
| `Pagination` | The "Next" link had no border: the base and the variant border classes were not merged. Fixed with `cn` |

### Acceptance criteria

- [ ] No order code or date wraps inside a table.
- [ ] Every status badge has a dot and a label.
- [ ] Filters still work without JavaScript and keep their values in the URL.

---

## Slice 7.3 · Admiral dashboard with charts

**Outcome:** the Admiral sees the trend and the split before any table.

### Build

| Layer | Work |
|---|---|
| Domain | `reports/series.ts`: `seriesUnit` (day up to 92 days, month up to 10 years, then year), `previousPeriod`, `percentChange`, `bucketLabel`. Pure, unit tested |
| Service | `getProfitSeries(period)`: revenue and profit per bucket, empty buckets included, in SQL with `generate_series`. Same counting rule as the totals (D11) |
| UI | Five stat cards (revenue, profit, making cost, units, waiting too long) with the change against the period before. "Revenue and profit" line chart. "Profit by planet" ranked bars. Pipeline as a bar list, each row links to the orders of that status. The two tables sit behind tabs |

### Acceptance criteria

- [ ] The points of the chart add up to the totals of the same range.
- [ ] A range of more than 92 days is grouped by month.
- [ ] The change shows "+12.5%" or "−12.5%" with an arrow, or says there is nothing to compare with.
- [ ] Hover or keyboard focus on a chart shows the exact amounts.

### Edge cases

| Case | Expected |
|---|---|
| No delivery in the range | One zero point per day, the note above the charts stays |
| The period before has no delivery | "Nothing in the N days before to compare", never a division by zero |
| A loss | The profit line goes below zero. Negative amounts stay red in the cards and tables |

### Tests

`series.test.ts`: all four functions. `service.test.ts`: points per day with empty days, month grouping adds up to the totals, 31 zero points for an empty range, FORBIDDEN for the three other roles.

---

## Slice 7.4 · Overview pages for manager, captain and customer

**Outcome:** every role lands on a page that answers "what needs me now" (D63).

### Build

| Page | Reads | Shows |
|---|---|---|
| `/manager` | `listQueue`, `getPlanetPurchases`, `getPlanetInProgress`, new `getPlanetSpendSeries` | Waiting for a decision (red when overdue), on the way, delivered, paid. "Paid per day" chart, "Paid by product" bars, the 5 oldest orders of the queue. Auto-refresh |
| `/captain` | `getMyEarnings`, `getMyOpenTrip`, `listMyTrips` | The five earnings numbers, "Earnings and fuel by trip" bars, the current trip with capacity and expected profit |
| `/customer` | new `getMyOrderSummary`, `listMyOrders` | On the way, delivered, total paid. The newest moving order with its 8 steps. The 5 newest orders |

`ROLE_HOME` points to these pages. The actions that change orders and trips also revalidate them.

### Acceptance criteria

- [ ] Login as each role lands on its overview.
- [ ] The manager pages hold no making cost and no profit, in the chart data too.
- [ ] A manager sees only the own planet, a captain only own trips, a customer only own orders.
- [ ] A refunded order is not in the customer's "Total paid".

### Edge cases

| Case | Expected |
|---|---|
| Empty queue | "Nothing is waiting", the card has no list |
| Captain without a completed trip | Zeros in the cards, the chart card says where trips will appear |
| Captain without an open trip | "No open trip" with "Start a trip" |
| Customer without orders | Zeros, "Nothing on the way" with "Place an order", no table |

### Tests

`reports/service.test.ts`: the spend series per day for two planets, no cost or profit key at any depth, FORBIDDEN for other roles. `orders/service.test.ts`: the summary for two customers with a delivered, an accepted, a placed and a rejected order, zeros for no orders, FORBIDDEN for other roles. Action tests: the new paths are revalidated. `auth/actions.test.ts`: the new role homes.

---

## Phase gate

`typecheck`, `lint`, `test`, `build` and the smoke test pass. Every role's overview and one list and one detail page are checked at 1440px and 390px, in light and dark, on the live URL after the deploy.
