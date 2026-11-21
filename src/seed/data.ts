import type { DEMO_PLANETS } from "@/features/auth/demo-users";

type PlanetName = (typeof DEMO_PLANETS)[number];

type PlanetSeed = {
  name: PlanetName;
  daysFromEarth: number;
  deliveryChargeCents: number;
  fuelCostCents: number;
  sectors: { name: string; divisions: string[] }[];
};

export const PLANETS: PlanetSeed[] = [
  {
    name: "Mercury",
    daysFromEarth: 3,
    deliveryChargeCents: 400,
    fuelCostCents: 3000,
    sectors: [
      { name: "Caloris Sector", divisions: ["Division 1", "Division 2"] },
      { name: "Borealis Sector", divisions: ["Division 1", "Division 2", "Division 3"] },
    ],
  },
  {
    name: "Venus",
    daysFromEarth: 2,
    deliveryChargeCents: 300,
    fuelCostCents: 2500,
    sectors: [
      { name: "Ishtar Sector", divisions: ["Division 1", "Division 2", "Division 3"] },
      { name: "Aphrodite Sector", divisions: ["Division 1", "Division 2"] },
    ],
  },
  {
    name: "Mars",
    daysFromEarth: 4,
    deliveryChargeCents: 500,
    fuelCostCents: 4000,
    sectors: [
      { name: "Olympus Sector", divisions: ["Division 7", "Division 8", "Division 9"] },
      { name: "Tharsis Sector", divisions: ["Division 1", "Division 2"] },
    ],
  },
  {
    name: "Jupiter",
    daysFromEarth: 12,
    deliveryChargeCents: 900,
    fuelCostCents: 11000,
    sectors: [
      { name: "Europa Sector", divisions: ["Division 1", "Division 2"] },
      { name: "Ganymede Sector", divisions: ["Division 1", "Division 2", "Division 3"] },
    ],
  },
  {
    name: "Saturn",
    daysFromEarth: 18,
    deliveryChargeCents: 1200,
    fuelCostCents: 16000,
    sectors: [
      { name: "Titan Sector", divisions: ["Division 1", "Division 2", "Division 3"] },
      { name: "Rhea Sector", divisions: ["Division 1", "Division 2"] },
    ],
  },
  {
    name: "Uranus",
    daysFromEarth: 30,
    deliveryChargeCents: 1600,
    fuelCostCents: 24000,
    sectors: [
      { name: "Titania Sector", divisions: ["Division 1", "Division 2"] },
      { name: "Oberon Sector", divisions: ["Division 1", "Division 2"] },
    ],
  },
  {
    name: "Neptune",
    daysFromEarth: 40,
    deliveryChargeCents: 2000,
    fuelCostCents: 32000,
    sectors: [
      { name: "Triton Sector", divisions: ["Division 1", "Division 2"] },
      { name: "Nereid Sector", divisions: ["Division 1", "Division 2", "Division 3"] },
    ],
  },
];

export const PRODUCTS = [
  { name: "Water", priceCents: 1000, makingCostCents: 600 },
  { name: "Oxygen", priceCents: 1400, makingCostCents: 800 },
  { name: "Plants", priceCents: 1800, makingCostCents: 1100 },
  { name: "Food", priceCents: 1200, makingCostCents: 700 },
  { name: "Machines", priceCents: 6000, makingCostCents: 4200 },
];
