# Low-Level Design

One file per feature. Each file answers the same six questions, in the same order:

1. **What it does**
2. **Files**
3. **Data it owns**
4. **Server Actions** (writes)
5. **Service functions** (reads and the logic behind writes)
6. **Flow** (one diagram)

| Feature | File | Actions | Service functions |
|---|---|---|---|
| Shared building blocks | [00-shared.md](00-shared.md) | — | — |
| Auth | [01-auth.md](01-auth.md) | 4 | 3 |
| Locations | [02-locations.md](02-locations.md) | 0 | 2 |
| Settings | [03-settings.md](03-settings.md) | 2 | 6 |
| Orders | [04-orders.md](04-orders.md) | 3 | 10 |
| Trips | [05-trips.md](05-trips.md) | 9 | 17 |
| Reports | [06-reports.md](06-reports.md) | 0 | 8 |
| **Total** | | **18** | **46** |

---

## How to read the lists

This app has almost no REST API. It uses the Next.js model:

| Kind | What it is | Used for |
|---|---|---|
| **Server Action** | A server function a form calls directly. A POST under the hood | Every write |
| **Service function** | A server-only function a page calls while rendering | Every read, and the logic of every write |
| **Route handler** | A classic HTTP endpoint | Only Better Auth |
| **Page** | A URL that renders on the server | Everything the user sees |

Every action returns the same shape:

```
ActionResult = { ok: true, data? }
             | { ok: false, error: string, fieldErrors?: { field: [messages] } }
```

Error codes used below: `UNAUTHORIZED` (not logged in) · `FORBIDDEN` (wrong role) · `NOT_FOUND` (missing or out of scope) · `CONFLICT` (state changed, or lost a race) · `INVALID` (bad input).

---

## A. Route handlers (HTTP API)

The only HTTP endpoints. Both are handled by Better Auth.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/auth/[...all]` | Session lookup |
| POST | `/api/auth/[...all]` | Sign in, sign up, sign out |

---

## B. Server Actions (all 18)

| # | Action | Feature | Role | Input | Success | Main errors |
|---|---|---|---|---|---|---|
| 1 | `signInAction` | auth | Public | email, password | Redirect to role home | `INVALID` |
| 2 | `signUpAction` | auth | Public | name, email, password | Redirect to `/customer/orders` | `INVALID` |
| 3 | `demoLoginAction` | auth | Public | email | Redirect to role home | `FORBIDDEN` |
| 4 | `signOutAction` | auth | Any | — | Redirect to `/login` | — |
| 5 | `updateProductAction` | settings | Admiral | productId, price, makingCost | "Saved" | `INVALID`, `NOT_FOUND` |
| 6 | `updatePlanetChargesAction` | settings | Admiral | planetId, deliveryCharge, fuelCost | "Saved" | `INVALID`, `NOT_FOUND` |
| 7 | `placeOrderAction` | orders | Customer | divisionId, items[], expectedTotalCents, idempotencyKey | Redirect to tracking page | `INVALID`, `CONFLICT` (prices changed) |
| 8 | `acceptOrderAction` | orders | Manager | orderId | Order leaves the queue | `NOT_FOUND`, `CONFLICT` |
| 9 | `rejectOrderAction` | orders | Manager | orderId, reason | Order leaves the queue | `INVALID`, `NOT_FOUND`, `CONFLICT` |
| 10 | `createTripAction` | trips | Captain | planetId | Trip builder opens | `INVALID`, `CONFLICT` |
| 11 | `addOrderToTripAction` | trips | Captain | tripId, orderId | Order moves into the trip | `CONFLICT` (taken, or no space) |
| 12 | `removeOrderFromTripAction` | trips | Captain | tripId, orderId | Order returns to the available list | `NOT_FOUND`, `CONFLICT` |
| 13 | `cancelTripAction` | trips | Captain | tripId | Back to the planet list | `NOT_FOUND`, `CONFLICT` |
| 14 | `markLoadedAction` | trips | Captain | tripId | Trip locked | `INVALID` (empty), `CONFLICT` |
| 15 | `markLiftedOffAction` | trips | Captain | tripId | ETA starts | `CONFLICT` |
| 16 | `markLandedAction` | trips | Captain | tripId | Stops appear | `CONFLICT` |
| 17 | `markStopAtSectorAction` | trips | Captain | tripId, divisionId | Stop at sector | `NOT_FOUND`, `CONFLICT` |
| 18 | `markStopDeliveredAction` | trips | Captain | tripId, divisionId | Stop delivered. Trip may complete | `NOT_FOUND`, `CONFLICT` |

Every action also returns `UNAUTHORIZED` without a session and `FORBIDDEN` for a wrong role.

---

## C. Read functions (called by pages)

| Function | Feature | Role | Returns |
|---|---|---|---|
| `getCurrentUser` | auth | Any | Current user or null |
| `listLocationTree` | locations | Any signed-in | Planets → sectors → divisions |
| `listProducts` | settings | Any signed-in | Products with price, no cost |
| `listProductsForAdmiral` | settings | Admiral | Products with price, cost, margin |
| `listPlanetsForAdmiral` | settings | Admiral | Planets with charges and break-even units |
| `listSettingsChanges` | settings | Admiral | Paged change history |
| `listMyOrders` | orders | Customer | Own orders, paged |
| `getMyOrder` | orders | Customer | One own order with timeline and ETA |
| `listQueue` | orders | Manager | PLACED orders of own planet |
| `listPlanetOrders` | orders | Manager | All orders of own planet, paged |
| `getPlanetOrder` | orders | Manager | One planet order, no cost |
| `listAllOrders` | orders | Admiral | Every order, paged. Overdue filter, sort by waiting |
| `getAnyOrder` | orders | Admiral | One order with cost and profit |
| `listPlanetsForTrip` | trips | Captain | Planets with fuel cost and waiting orders |
| `getMyOpenTrip` | trips | Captain | Open trip with orders, stops, expected profit |
| `listAvailableOrders` | trips | Captain | ACCEPTED orders for the trip's planet, with products and units |
| `listMyTrips` | trips | Captain | Own trips, paged |
| `getMyTrip` | trips | Captain | One own trip |
| `getMyTripRow` | trips | Captain | Earnings, fuel and profit of one own trip |
| `listAllTrips` | trips | Admiral | Every trip, paged |
| `getAnyTrip` | trips | Admiral | One trip |
| `getCompanyTotals` | reports | Admiral | Units, revenue, cost, profit |
| `getPlanetProfitSummary` | reports | Admiral | One row per planet, sorted by profit |
| `getPlanetProductTable` | reports | Admiral | Planet × product rows |
| `getPipeline` | reports | Admiral | Order count per status, oldest waiting order for PLACED and ACCEPTED |
| `getOverdueCount` | reports | Admiral | Orders waiting too long |
| `getPlanetPurchases` | reports | Manager | Per product purchases |
| `getPlanetInProgress` | reports | Manager | Per product purchases on the way |
| `getMyEarnings` | reports | Captain | Totals over completed trips |

---

## D. Pages (all 21)

| URL | Role | Reads | Actions on the page |
|---|---|---|---|
| `/login` | Public | demo user list | 1, 3 |
| `/sign-up` | Public | — | 2 |
| `/` | Any | `getCurrentUser` | — |
| `/customer/orders` | Customer | `listMyOrders` | — |
| `/customer/orders/new` | Customer | `listLocationTree`, `listProducts` | 7 |
| `/customer/orders/[id]` | Customer | `getMyOrder` | — |
| `/manager/queue` | Manager | `listQueue` | 8, 9 |
| `/manager/orders` | Manager | `listPlanetOrders` | — |
| `/manager/orders/[id]` | Manager | `getPlanetOrder` | — |
| `/manager/report` | Manager | `getPlanetPurchases`, `getPlanetInProgress` | — |
| `/captain/trip` | Captain | `getMyOpenTrip`, `listPlanetsForTrip`, `listAvailableOrders` | 10 to 18 |
| `/captain/trips` | Captain | `listMyTrips`, `getMyEarnings` | — |
| `/captain/trips/[id]` | Captain | `getMyTrip`, `getMyTripRow` | — |
| `/admiral` | Admiral | `getCompanyTotals`, `getPlanetProfitSummary`, `getPlanetProductTable`, `getPipeline`, `getOverdueCount` | — |
| `/admiral/orders` | Admiral | `listAllOrders`, `listPlanetsForAdmiral` | — |
| `/admiral/orders/[id]` | Admiral | `getAnyOrder` | — |
| `/admiral/trips` | Admiral | `listAllTrips`, `listPlanetsForAdmiral` | — |
| `/admiral/trips/[id]` | Admiral | `getAnyTrip` | — |
| `/admiral/products` | Admiral | `listProductsForAdmiral` | 5 |
| `/admiral/planets` | Admiral | `listPlanetsForAdmiral` | 6 |
| `/admiral/history` | Admiral | `listSettingsChanges` | — |

`signOutAction` (4) is in the app shell on every signed-in page.

---

## E. URL parameters

| Parameter | Used on | Values |
|---|---|---|
| `page` | All paged lists | Integer ≥ 1. Bad value → 1 |
| `q` | Order and trip lists | Search text, max 100 chars |
| `status` | Order and trip lists | A status name. Unknown → ignored |
| `planet` | Admiral lists | Planet ID |
| `from`, `to` | Reports | `YYYY-MM-DD`, UTC. Default last 30 days |
| `entity` | `/admiral/history` | `product`, `planet`, or empty |
| `sort` | `/admiral/orders` | `newest` (default), `waiting` |
| `waiting` | `/admiral/orders` | `overdue`: only orders waiting over 3 days. Anything else → ignored |
