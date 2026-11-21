# Requirements Traceability

Every statement in the client's brief (`requremt-by-client.md`), checked against our docs. Last checked: 2026-11-21.

**Result: 34 requirements, all fully covered.** Four gaps were found on the first check and closed by decisions D29 to D32 (section 3).

The client's PDF and `requremt-by-client.md` were compared line by line and are identical.

Status: ✅ covered.

---

## 1. Matrix

### The world and the problem

| # | Client says | Where we cover it | Status |
|---|---|---|---|
| R1 | One internet connects all planets in real time | A web app, one shared database. `hld.md` §2, §3 | ✅ |
| R2 | Delivers water, oxygen, plants, food, machines | 5 fixed products. D18, `plan.md` §11, `lld/03-settings.md` | ✅ |
| R3 | Orders get lost | Status + timeline + waiting time. Slices 1.1 to 1.6, 3.2 | ✅ |
| R4 | Customers don't know where supplies are | Tracking page. Slice 1.2, 4.1 | ✅ |
| R5 | Nobody knows which planets are profitable | Admiral dashboard with "Profit by planet" summary. D32, slice 2.3 | ✅ |

### How space is organized

| # | Client says | Where we cover it | Status |
|---|---|---|---|
| R6 | Planet → sectors → divisions. A division is a delivery address | `lld/02-locations.md`, slice 0.2 | ✅ |
| R7 | Example: Mars → Olympus Sector → Division 7 | In the seed. Slice 0.2 | ✅ |
| R8 | Earth is the only supplier. Every trip starts from Earth | Earth is the origin only, never a destination. D30, `lld/02-locations.md` | ✅ |
| R9 | Supply is unlimited | No inventory. `hld.md` §1 non-goals | ✅ |
| R10 | Each planet is a fixed number of days from Earth | `planets.days_from_earth`, used for ETA. D6 | ✅ |
| R11 | Whole system runs on Earth time (UTC) | `timestamptz`, shown as UTC. `AGENTS.md` domain rules | ✅ |

### Who uses it

| # | Client says | Where we cover it | Status |
|---|---|---|---|
| R12 | Grand Admiral sees everything | Dashboard + read-only all orders and trips. D22, slice 2.6 | ✅ |
| R13 | Admiral sets each product's price and making cost | Slice 2.1, `lld/03-settings.md` | ✅ |
| R14 | Admiral can change them at any time | Snapshots keep history correct. `hld.md` §8, slice 2.1 | ✅ |
| R15 | At a glance: how much of what was delivered to which planet, cost, revenue, profit | Planet × product table with units, revenue, cost, profit. Slice 2.3 | ✅ |
| R16 | Each Planet Manager runs one planet | D7, `user.planet_id` constraints. Slice 0.3 | ✅ |
| R17 | Manager can only see their own planet | Scope in every query. `hld.md` §9.3, slice 1.3 | ✅ |
| R18 | Managers accept incoming orders | Slice 1.3 | ✅ |
| R19 | Managers track what their planet bought: quantities, product amounts, delivery charges | Delivered and In progress tables, same three columns. D31, slice 2.4 | ✅ |
| R20 | Managers see no profit | Cost columns never selected. Tested. Slices 1.3, 2.4 | ✅ |
| R21 | Captains earn the delivery charges on what they carry | `hld.md` §8, D5 | ✅ |
| R22 | Captains pay for their own fuel | Fuel cost frozen per trip. Slice 1.4 | ✅ |
| R23 | Captains see earnings, fuel cost, profit | Slice 2.5, also live while building (3.1) | ✅ |
| R24 | Customers buy supplies | Checkout. Slice 1.1 | ✅ |
| R25 | Customers know where their order is at every step | Slice 1.2 | ✅ |

### How an order works

| # | Client says | Where we cover it | Status |
|---|---|---|---|
| R26 | One or more products in units. One order, one division | Slice 1.1, `lld/04-orders.md` | ✅ |
| R27 | That planet's manager accepts the order | Slice 1.3 | ✅ |
| R28 | Captains pick accepted orders to carry | Slice 1.4. Captain sees products and units of each order. D29 | ✅ |
| R29 | One trip, one planet, several divisions | `trips.planet_id`, stops. Slices 1.4, 1.6 | ✅ |
| R30 | A ship carries at most 20 units | Conditional update + CHECK. `hld.md` §10 | ✅ |
| R31 | An order is never split. No order over 20 units | One `trip_id` per order. CHECK 1 to 20. Slice 1.1 | ✅ |
| R32 | Steps: Loaded → Lifted off → Landed → Delivered to sector → Delivered to division. Each division marked separately after landing | Slices 1.5, 1.6 | ✅ |

### The money

| # | Client says | Where we cover it | Status |
|---|---|---|---|
| R33 | Customer pays (price + delivery charge) × units · delivery charge per unit per planet · fuel cost per trip per planet · captain's profit = delivery charges − fuel · company's profit = product sales − making cost | `plan.md` §5, `lld/06-reports.md` §3, pure functions with tests | ✅ |

### What they expect

| # | Client says | Where we cover it | Status |
|---|---|---|---|
| R34 | Choose what matters, do it well, explain your choices. Usability over visual effects. No animations | README plan (slice 6.2), `hld.md` §15 trade-offs, plain shadcn UI | ✅ |

---

## 2. What we added beyond the brief

The client did not ask for these. Each must be explained in the README.

| Addition | Why | Decision |
|---|---|---|
| Manager can reject an order, with a reason | "Accept" implies a choice. Without reject, a bad order sits forever | `project.md` |
| Checkout step and PAID / REFUNDED status | "Customer pays" needs a moment of payment | D2 to D4 |
| Extra status ASSIGNED | Customer sees that a captain picked the order | `project.md` |
| Captain can cancel a trip while planning | Otherwise a wrong choice traps the captain | D17 |
| Admiral sets delivery charge and fuel cost | The brief says they are "set per planet" but not by whom | `project.md` |
| ETA | The brief gives days per planet. Customers want a date | D6 |
| Expected trip profit, waiting time | Shows the unpicked-order problem | D12 |
| Settings history, auto-refresh, pagination, search | Usability | D12 |
| Customer sign-up, demo login | So a reviewer can try it | D8 |

---

## 3. Gaps found and closed

| # | Gap | Requirement | Decision |
|---|---|---|---|
| G1 | A captain could not see which products they carry | R28 | D29: show product names and units, no prices |
| G2 | Nothing said whether Earth is a destination | R8 | D30: Earth is the origin only |
| G3 | Manager's "In progress" block had no product amounts or delivery charges | R19 | D31: two tables with the same columns |
| G4 | No at-a-glance view of which planets are profitable | R5 | D32: "Profit by planet" summary, sorted by profit |

### Still undecided (not gaps)

Items C1 to C10 in `plan.md` §15: seed numbers, demo password, codes, currency, default date range, waiting highlight, where migrations run, video, page size. C7 (captain sees customer name: no) is settled by D29.

---

## 4. How to keep this true

- When a decision changes, update the matching row here in the same commit.
- Before submission (slice 6.4), walk this matrix on the live URL.
