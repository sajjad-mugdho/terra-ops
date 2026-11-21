# Reports

## 1. What it does

Answers the money questions for each role. Read-only. It owns no tables and has no actions.

| Role | Question |
|---|---|
| Admiral | How much of what was delivered to which planet, and what did we earn? |
| Manager | What did my planet buy? |
| Captain | What did I earn? |

## 2. Files

| File | Holds |
|---|---|
| `features/reports/range.ts` | Pure: parse and validate a date range |
| `features/reports/service.ts` | 8 functions |
| `features/reports/components/` | `TotalsCards`, `PlanetProfitSummary`, `PlanetProductTable`, `PipelineList`, `OverdueCard`, `PurchasesTable`, `EarningsSummary` |
| `app/(app)/admiral`, `manager/report`, `captain/trips` | Pages |

## 3. Data it reads

| Source | Used for |
|---|---|
| `order_items` (frozen prices) + `orders` | Company and planet numbers |
| `trips` (frozen fuel cost) + their orders | Captain numbers |

**The one counting rule**

| Counts | When |
|---|---|
| An order | Status DELIVERED, by `delivered_at` |
| A trip | Status COMPLETED, by `completed_at` |
| "In progress" | Accepted but not yet delivered. Shown separately |
| Never | REJECTED orders, CANCELLED trips |

**Formulas**

| Number | Formula |
|---|---|
| Revenue | Σ units × unit price |
| Making cost | Σ units × unit making cost |
| Company profit | Revenue − making cost |
| Delivery charges | Σ units × unit delivery charge |
| Total paid | Revenue + delivery charges |
| Captain profit | Delivery charges of the trip − fuel cost of the trip |

## 4. Server Actions

None. Filters are URL parameters (`from`, `to`).

## 5. Service functions

| Function | Role | Input | Returns |
|---|---|---|---|
| `getCompanyTotals(range)` | Admiral | from, to | `{ unitsDelivered, revenueCents, makingCostCents, profitCents }` |
| `getPlanetProfitSummary(range)` | Admiral | from, to | `[{ planet, units, revenueCents, makingCostCents, profitCents }]`. Every planet, sorted by profit, ties by name (D32) |
| `getPlanetProductTable(range)` | Admiral | from, to | `[{ planet, rows: [{ product, units, revenueCents, makingCostCents, profitCents }], subtotal }]`. Every planet, zeros included, same planet order as the summary |
| `getPipeline()` | Admiral | — | `[{ status, count }]` for all 9 statuses |
| `getOverdueCount()` | Admiral | — | `{ count }` of orders waiting over 3 days |
| `getPlanetPurchases(range)` | Manager | from, to | `{ rows: [{ product, units, productAmountCents, deliveryChargesCents, totalPaidCents }], total }` |
| `getPlanetInProgress()` | Manager | — | Same shape as `getPlanetPurchases`, for orders ACCEPTED to AT_SECTOR (D31) |
| `getMyEarnings()` | Captain | — | `{ trips, units, earningsCents, fuelCents, profitCents }` over completed trips |

All throw `FORBIDDEN` for a wrong role. Manager functions take the planet from the session, never from input.

**Pure**

| Function | Purpose |
|---|---|
| `parseRange(from, to)` | Valid range, or the default (last 30 days). End date inclusive. UTC |

## 6. Flow

```mermaid
flowchart LR
    subgraph Source
        OI["order_items<br/>frozen prices"]
        TR["trips<br/>frozen fuel cost"]
    end
    OI -- "DELIVERED<br/>GROUP BY planet<br/>GROUP BY planet, product" --> AD[Admiral dashboard]
    OI -- "DELIVERED, my planet<br/>GROUP BY product<br/>no cost columns" --> MG[Manager report]
    OI -- "delivery charges" --> CE
    TR -- "COMPLETED, my trips" --> CE[Captain earnings]
```

**How the three reports agree**

```mermaid
flowchart TD
    T["Total paid by customers<br/>for delivered orders"] --> R[Revenue → Admiral]
    T --> DC[Delivery charges → Captains]
    R --> MP["Manager total paid<br/>= revenue + delivery charges<br/>for that planet"]
    DC --> MP
```

## 7. Rules to remember

- All sums are done by the database, on frozen values. Never in JavaScript, never from current prices.
- Manager queries do not select cost columns at all, so there is nothing to leak.
- Planets and products with no deliveries still appear, as zeros.
- The dashboard answers "which planets are profitable" first: the summary is sorted by profit.
- The manager's two tables never overlap. An order is in "In progress" or in "Delivered", not both.
- The pipeline and overdue count ignore the date range. They show the present.
- A negative profit is shown in red with a minus sign.
