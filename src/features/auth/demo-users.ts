import type { Role } from "./roles";

export type DemoUser = { email: string; name: string; role: Role; planet?: string };

// Not a secret: these accounts exist so a reviewer can log in with one click.
export const DEMO_PASSWORD = "terra-demo-2026";

export const DEMO_PLANETS = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"] as const;

export const DEMO_USERS: DemoUser[] = [
  { email: "admiral@terra.demo", name: "Ada Sterling", role: "admiral" },
  ...DEMO_PLANETS.map(
    (planet): DemoUser => ({
      email: `manager.${planet.toLowerCase()}@terra.demo`,
      name: `${planet} Manager`,
      role: "manager",
      planet,
    }),
  ),
  { email: "captain1@terra.demo", name: "Captain Vega", role: "captain" },
  { email: "captain2@terra.demo", name: "Captain Orion", role: "captain" },
  { email: "captain3@terra.demo", name: "Captain Lyra", role: "captain" },
  { email: "captain4@terra.demo", name: "Captain Rigel", role: "captain" },
  { email: "customer1@terra.demo", name: "Mira Chen", role: "customer" },
  { email: "customer2@terra.demo", name: "Jonas Okafor", role: "customer" },
  { email: "customer3@terra.demo", name: "Priya Nair", role: "customer" },
  { email: "customer4@terra.demo", name: "Leo Brandt", role: "customer" },
];

export function isDemoEmail(email: string): boolean {
  return DEMO_USERS.some((user) => user.email === email);
}
