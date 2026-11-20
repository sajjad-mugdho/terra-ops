# Terra Supply Co.

## The world

Humans now live on every planet in the solar system, and one internet connects them all in real time.

Every planet still depends on Earth. Earth produces everything, and Terra Supply Co. delivers it: water, oxygen, plants, food and machines.

Today the company runs on spreadsheets and radio calls. Orders get lost, customers don't know where their supplies are, and nobody knows which planets are actually profitable.

> **Build the software that runs Terra Supply Co.**

## How space is organized

- Each planet is divided into sectors, and each sector into divisions. A division is a delivery address, e.g. Mars → Olympus Sector → Division 7.
- Earth is the only supplier. Every trip starts from Earth, and supply is unlimited.
- Each planet is a fixed number of days from Earth.
- The whole solar system runs on Earth time (UTC).

## Who uses it

**The Grand Admiral** owns the company and sees everything. They set each product's price and making cost, and can change them at any time. At a glance, they want to know how much of what was delivered to which planet, the cost, the revenue, and the profit.

**Planet Managers** each run one planet and can only see their own planet. They accept incoming orders and track what their planet bought: quantities, product amounts and delivery charges. No profit.

**Captains** fly the ships. They earn the delivery charges on what they carry and pay for their own fuel. They want to see earnings, fuel cost and profit.

**Customers** buy supplies and want to know where their order is at every step.

## How an order works

1. A customer orders one or more products in units (e.g. 3 water + 1 food). Each order goes to one division.
2. That planet's manager accepts the order.
3. Captains pick accepted orders to carry:
   - One trip goes to one planet, and can deliver to several divisions there.
   - A ship carries at most 20 units.
   - An order is never split. A captain takes all of it or none of it, so no order can be larger than 20 units.
4. The captain marks each step:

   Loaded → Lifted off → Landed on planet → Delivered to sector → Delivered to division

   With several divisions, the captain marks each one separately after landing.
5. The customer sees every step.

## The money

- **Customer pays:** (product price + delivery charge) × units
- **Delivery charge:** fixed per unit, set per planet
- **Fuel cost:** fixed per trip, set per planet
- **Captain's profit:** delivery charges − fuel cost
- **Company's profit:** product sales − making cost

## What we expect

Build it however you think is best. What to build, how it looks and what to prioritize is your call. Choose what matters most, do it well, and explain your choices.

Usability and clarity matter more than visual effects. Skip the rocket animations.