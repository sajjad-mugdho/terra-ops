import type { DEMO_PLANETS } from "@/features/auth/demo-users";
import type { TripStatus } from "@/features/trips/status";

type PlanetName = (typeof DEMO_PLANETS)[number];
type ProductName = "Water" | "Oxygen" | "Plants" | "Food" | "Machines";

// Every time is "hours ago", so the demo always looks recent and nothing is in the future.
const d = (days: number, hours = 0) => days * 24 + hours;

// Water cost $9 until the Admiral raised it to $10, ten days ago.
export const OLD_WATER_PRICE_CENTS = 900;
export const WATER_PRICE_CHANGED = d(10);

export type SeedOrder = {
  customer: 1 | 2 | 3 | 4;
  to: [sector: string, division: string];
  // An item may carry the price it was sold at, when that is not today's price.
  items: [product: ProductName, units: number, unitPriceCents?: number][];
  placed: number;
  accepted?: number;
  rejected?: { at: number; reason: string };
  atSector?: number;
  delivered?: number;
};

export type SeedTrip = {
  captain: 1 | 2 | 3 | 4;
  planet: PlanetName;
  status: TripStatus;
  created: number;
  loaded?: number;
  liftedOff?: number;
  landed?: number;
  completed?: number;
  cancelled?: number;
  orders: SeedOrder[];
  // Orders that were on this trip and went back to the waiting list.
  returned?: SeedOrder[];
};

const OLD = OLD_WATER_PRICE_CENTS;

export const TRIPS: SeedTrip[] = [
  {
    // The worked example: 18 units to Mars earn $90, fuel $40, profit $50.
    captain: 1,
    planet: "Mars",
    status: "COMPLETED",
    created: d(26),
    loaded: d(25, 20),
    liftedOff: d(25),
    landed: d(21),
    completed: d(20, 18),
    orders: [
      { customer: 1, to: ["Olympus Sector", "Division 7"], items: [["Water", 10, OLD], ["Food", 2]], placed: d(28), accepted: d(27), atSector: d(20, 22), delivered: d(20, 20) },
      { customer: 2, to: ["Tharsis Sector", "Division 1"], items: [["Oxygen", 6]], placed: d(27, 12), accepted: d(27), atSector: d(20, 20), delivered: d(20, 18) },
    ],
  },
  {
    captain: 2,
    planet: "Venus",
    status: "COMPLETED",
    created: d(24),
    loaded: d(23, 18),
    liftedOff: d(23),
    landed: d(21),
    completed: d(20, 12),
    orders: [
      { customer: 3, to: ["Ishtar Sector", "Division 1"], items: [["Plants", 8], ["Water", 4, OLD]], placed: d(26), accepted: d(25), atSector: d(20, 20), delivered: d(20, 16) },
      { customer: 4, to: ["Aphrodite Sector", "Division 2"], items: [["Food", 8]], placed: d(25, 6), accepted: d(25), atSector: d(20, 16), delivered: d(20, 12) },
    ],
  },
  {
    // The loss trip: 5 units to Mars earn $25, fuel $40, profit -$15.
    captain: 3,
    planet: "Mars",
    status: "COMPLETED",
    created: d(18),
    loaded: d(17, 20),
    liftedOff: d(17, 12),
    landed: d(13, 12),
    completed: d(13, 6),
    orders: [
      { customer: 2, to: ["Olympus Sector", "Division 8"], items: [["Water", 5, OLD]], placed: d(20), accepted: d(19), atSector: d(13, 9), delivered: d(13, 6) },
    ],
  },
  {
    captain: 1,
    planet: "Jupiter",
    status: "COMPLETED",
    created: d(20),
    loaded: d(19, 12),
    liftedOff: d(19),
    landed: d(7),
    completed: d(6, 12),
    orders: [
      { customer: 1, to: ["Europa Sector", "Division 1"], items: [["Machines", 2], ["Oxygen", 5]], placed: d(22), accepted: d(21), atSector: d(6, 20), delivered: d(6, 18) },
      { customer: 3, to: ["Ganymede Sector", "Division 2"], items: [["Food", 12]], placed: d(21, 6), accepted: d(21), atSector: d(6, 15), delivered: d(6, 12) },
    ],
  },
  {
    captain: 2,
    planet: "Mercury",
    status: "COMPLETED",
    created: d(12),
    loaded: d(11, 18),
    liftedOff: d(11),
    landed: d(8),
    completed: d(7, 14),
    orders: [
      { customer: 4, to: ["Caloris Sector", "Division 1"], items: [["Water", 6, OLD], ["Plants", 4]], placed: d(13), accepted: d(12, 12), atSector: d(7, 20), delivered: d(7, 18) },
      { customer: 1, to: ["Borealis Sector", "Division 3"], items: [["Oxygen", 6]], placed: d(12, 18), accepted: d(12, 6), atSector: d(7, 16), delivered: d(7, 14) },
    ],
  },
  {
    captain: 3,
    planet: "Venus",
    status: "COMPLETED",
    created: d(8),
    loaded: d(7, 18),
    liftedOff: d(7),
    landed: d(5),
    completed: d(4, 10),
    orders: [
      { customer: 2, to: ["Ishtar Sector", "Division 2"], items: [["Water", 10]], placed: d(9), accepted: d(8, 12), atSector: d(4, 18), delivered: d(4, 14) },
      { customer: 3, to: ["Ishtar Sector", "Division 1"], items: [["Machines", 1], ["Food", 4]], placed: d(8, 20), accepted: d(8, 10), atSector: d(4, 12), delivered: d(4, 10) },
    ],
  },
  {
    // Cancelled while planning. Its one order went back to the waiting list.
    captain: 2,
    planet: "Jupiter",
    status: "CANCELLED",
    created: d(7),
    cancelled: d(6, 20),
    orders: [],
    returned: [
      { customer: 3, to: ["Europa Sector", "Division 2"], items: [["Plants", 4]], placed: d(8), accepted: d(7, 12) },
    ],
  },
  {
    // Landed, stops in three states. The delivered order already counts for the company.
    captain: 1,
    planet: "Mars",
    status: "LANDED",
    created: d(5, 12),
    loaded: d(5, 8),
    liftedOff: d(5),
    landed: d(1),
    orders: [
      { customer: 1, to: ["Olympus Sector", "Division 7"], items: [["Water", 4], ["Oxygen", 2]], placed: d(6, 12), accepted: d(6), atSector: d(0, 22), delivered: d(0, 20) },
      { customer: 2, to: ["Olympus Sector", "Division 9"], items: [["Food", 5]], placed: d(6, 6), accepted: d(6), atSector: d(0, 18) },
      { customer: 3, to: ["Tharsis Sector", "Division 2"], items: [["Plants", 3]], placed: d(6), accepted: d(5, 20) },
    ],
  },
  {
    captain: 3,
    planet: "Saturn",
    status: "LIFTED_OFF",
    created: d(3),
    loaded: d(2, 18),
    liftedOff: d(2),
    orders: [
      { customer: 2, to: ["Titan Sector", "Division 2"], items: [["Oxygen", 10]], placed: d(4, 12), accepted: d(4) },
      { customer: 4, to: ["Rhea Sector", "Division 1"], items: [["Machines", 1], ["Water", 7]], placed: d(4), accepted: d(3, 12) },
    ],
  },
  {
    // Loaded and locked: a full ship of 20 units, waiting for lift-off.
    captain: 4,
    planet: "Uranus",
    status: "LOADED",
    created: d(0, 8),
    loaded: d(0, 4),
    orders: [
      { customer: 1, to: ["Titania Sector", "Division 2"], items: [["Oxygen", 8], ["Machines", 2]], placed: d(2), accepted: d(1, 18) },
      { customer: 4, to: ["Oberon Sector", "Division 2"], items: [["Food", 10]], placed: d(1, 20), accepted: d(1, 12) },
    ],
  },
  {
    captain: 2,
    planet: "Venus",
    status: "PLANNING",
    created: d(0, 3),
    orders: [
      { customer: 4, to: ["Aphrodite Sector", "Division 1"], items: [["Water", 6]], placed: d(0, 20), accepted: d(0, 12) },
      { customer: 1, to: ["Ishtar Sector", "Division 3"], items: [["Machines", 2], ["Food", 2]], placed: d(0, 18), accepted: d(0, 12) },
    ],
  },
];

// Orders that are on no trip.
export const LOOSE_ORDERS: SeedOrder[] = [
  // Old small orders to far planets that no captain picked.
  { customer: 1, to: ["Titania Sector", "Division 1"], items: [["Water", 2, OLD]], placed: d(16), accepted: d(15) },
  { customer: 2, to: ["Triton Sector", "Division 2"], items: [["Machines", 1]], placed: d(14), accepted: d(13) },
  { customer: 4, to: ["Nereid Sector", "Division 3"], items: [["Food", 3]], placed: d(11), accepted: d(10, 20) },
  // Waiting for the Venus trip that is being planned. The second one does not fit.
  { customer: 3, to: ["Ishtar Sector", "Division 2"], items: [["Oxygen", 5]], placed: d(0, 10), accepted: d(0, 5) },
  { customer: 2, to: ["Aphrodite Sector", "Division 2"], items: [["Water", 12]], placed: d(0, 9), accepted: d(0, 5) },
  {
    customer: 3,
    to: ["Borealis Sector", "Division 1"],
    items: [["Machines", 20]],
    placed: d(9),
    rejected: { at: d(8, 18), reason: "Mercury cannot store 20 machines this month. Please order fewer." },
  },
  // Manager queues.
  { customer: 2, to: ["Oberon Sector", "Division 1"], items: [["Food", 6]], placed: d(4) },
  { customer: 4, to: ["Caloris Sector", "Division 2"], items: [["Plants", 2]], placed: d(1) },
  { customer: 1, to: ["Titan Sector", "Division 3"], items: [["Machines", 1]], placed: d(0, 6) },
  { customer: 3, to: ["Tharsis Sector", "Division 1"], items: [["Oxygen", 8]], placed: d(0, 5) },
  { customer: 1, to: ["Olympus Sector", "Division 7"], items: [["Water", 3], ["Food", 1]], placed: d(0, 2) },
];

// Worked out by hand from the lists above. A test compares them with the reports.
export const EXPECTED = {
  orders: 32,
  byStatus: {
    PLACED: 5,
    ACCEPTED: 6,
    REJECTED: 1,
    ASSIGNED: 2,
    LOADED: 2,
    LIFTED_OFF: 2,
    LANDED: 1,
    AT_SECTOR: 1,
    DELIVERED: 12,
  },
  // Waiting more than 3 days: three unpicked far-planet orders, the order that came back from
  // the cancelled Jupiter trip, and the oldest Uranus queue order.
  overdueOrders: 5,
  tripsByStatus: { PLANNING: 1, LOADED: 1, LIFTED_OFF: 1, LANDED: 1, COMPLETED: 6, CANCELLED: 1 },
  totals: { unitsDelivered: 99, revenueCents: 133900, makingCostCents: 82600, profitCents: 51300 },
  // Highest profit first, then by name.
  planets: [
    { planet: "Venus", units: 35, revenueCents: 48400, makingCostCents: 29800, profitCents: 18600 },
    { planet: "Jupiter", units: 19, revenueCents: 33400, makingCostCents: 20800, profitCents: 12600 },
    { planet: "Mars", units: 29, revenueCents: 31100, makingCostCents: 19200, profitCents: 11900 },
    { planet: "Mercury", units: 16, revenueCents: 21000, makingCostCents: 12800, profitCents: 8200 },
    { planet: "Neptune", units: 0, revenueCents: 0, makingCostCents: 0, profitCents: 0 },
    { planet: "Saturn", units: 0, revenueCents: 0, makingCostCents: 0, profitCents: 0 },
    { planet: "Uranus", units: 0, revenueCents: 0, makingCostCents: 0, profitCents: 0 },
  ],
  // Completed trips only. Captain 4 has none yet.
  captains: [
    { trips: 2, units: 37, earningsCents: 26100, fuelCents: 15000, profitCents: 11100 },
    { trips: 2, units: 36, earningsCents: 12400, fuelCents: 5500, profitCents: 6900 },
    { trips: 2, units: 20, earningsCents: 7000, fuelCents: 6500, profitCents: 500 },
    { trips: 0, units: 0, earningsCents: 0, fuelCents: 0, profitCents: 0 },
  ],
};
