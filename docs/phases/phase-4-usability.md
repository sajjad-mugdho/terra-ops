# Phase 4 · Usability

**Goal:** live pages update by themselves, and every list stays usable as data grows.

**Time:** ~2.5h, Sunday afternoon. **Depends on:** Phase 3.

---

## Slice 4.1 · Auto-refresh

**Outcome:** three live pages show new data without a manual reload (D24).

### Build

| Layer | Work |
|---|---|
| UI | `components/auto-refresh.tsx`: a Client Component that calls `router.refresh()` every 10 seconds while the tab is visible. Shows "Updated <time> UTC" |
| Pages | Customer tracking `/customer/orders/[id]`, manager queue `/manager/queue`, captain available orders on `/captain/trip` (PLANNING only) |

### Acceptance criteria

- [ ] A status change made in another browser appears on the tracking page within about 10 seconds.
- [ ] A new order appears in the manager queue within about 10 seconds.
- [ ] An order taken by another captain disappears from the available list within about 10 seconds.
- [ ] Polling stops while the tab is hidden and runs once right away when it becomes visible.
- [ ] Tracking stops polling once the order is DELIVERED or REJECTED.
- [ ] No other page polls.

### Edge cases

| Case | Expected |
|---|---|
| Refresh fires while the reject dialog is open with typed text | Text and dialog stay. Client state is not reset |
| Refresh fires while an action is pending | No double submit. The action result wins |
| Session expires while polling | Next refresh redirects to `/login` |
| Network offline | Refresh fails silently. Next tick tries again |
| Order disappears from the captain's list just before clicking Add | Service returns the "just taken" conflict from slice 1.4 |
| Component unmounts | Timer is cleared |

### Tests

- Manual, two browsers, on the live URL for each of the three pages.

---

## Slice 4.2 · Pagination

**Outcome:** every list shows 20 rows per page **[C10]** with working page links.

### Build

| Layer | Work |
|---|---|
| Pure logic | `lib/pagination.ts`: parse `page` from search params, compute offset, total pages |
| Service | List functions take `{ page }` and return `{ rows, total, page, pageCount }`. One count query plus one page query |
| UI | `components/pagination.tsx` with previous, next and "Page x of y". State in the URL `?page=` |
| Lists | Customer orders, manager orders, captain trips, Admiral orders, Admiral trips. Not paginated: manager queue and captain available orders (short, live lists) |

### Acceptance criteria

- [ ] Each list shows at most 20 rows and the total count.
- [ ] Page links are real links, so back, forward and refresh work.
- [ ] Sorting is stable: newest first, with ID as the tie-breaker, so no row repeats or is skipped between pages.
- [ ] Pagination is hidden when there is one page.

### Edge cases

| Case | Expected |
|---|---|
| `?page=0`, `?page=-3`, `?page=abc` | Treated as page 1 |
| `?page=999` beyond the last page | Shows the last page |
| Empty list | Empty state, no pagination |
| Exactly 20 rows | One page |
| 21 rows | Two pages, second has 1 row |
| A new row arrives while on page 2 | Rows shift by one. Accepted for offset pagination at this scale |

### Tests

- Unit `pagination.ts`: all page parsing cases, offsets, page counts.
- Service: 0, 20, 21 rows. No row is repeated or missing across pages.

---

## Slice 4.3 · Search and filters

**Outcome:** a user finds an order by its code, and staff also by customer name. Lists filter by status.

### Build

| Layer | Work |
|---|---|
| Service | List functions take `{ q, status }`. Search matches the order code and, for manager and Admiral, the customer name. Case-insensitive, parameterized. Admiral also filters by planet |
| UI | `components/list-filters.tsx`: search box and status select as a GET form. State in the URL `?q=&status=&planet=` |
| Lists | Customer orders, manager orders, Admiral orders (code, name, status, planet), Admiral trips (trip code, status, planet), captain trips (status) |

### Acceptance criteria

- [ ] Typing a full or partial order code finds the order.
- [ ] Manager and Admiral can search by customer name. Customers cannot.
- [ ] Status and search combine. Changing a filter returns to page 1.
- [ ] A "Clear" link resets all filters.
- [ ] Search never returns rows outside the user's scope.

### Edge cases

| Case | Expected |
|---|---|
| Search with no match | Empty state "No orders match" with the Clear link |
| Search text with `%` or `_` | Treated as plain text, escaped |
| Search text with quotes or SQL | Safe. Queries are parameterized |
| Only spaces | Treated as no search |
| Very long text | Cut at 100 characters |
| Unknown status in the URL | Ignored |
| Manager searches a code from another planet | No result |
| Customer searches another customer's code | No result |

### Tests

- Service: code match, name match, combined with status, wildcard characters, scope is kept for each role.

---

## Phase gate

- [ ] On the live URL, with two browsers, a delivery step shows up on the customer's page without a reload.
- [ ] Every list paginates and its filters survive a refresh.
- [ ] CI green. `context.md` updated. Pushed.
