import { ClipboardCheck, type LucideIcon, Rocket, ShoppingCart, TrendingUp } from "lucide-react";
import type { Role } from "@/features/auth/roles";
import { MAX_UNITS } from "@/features/orders/pricing";

export type Step = { role: Role; verb: string; text: string; icon: LucideIcon; demoEmail: string };

// One order passes through all four roles, in this order.
export const STEPS: Step[] = [
  {
    role: "customer",
    verb: "Orders",
    text: `Picks a division, adds up to ${MAX_UNITS} units, pays at checkout and follows every step.`,
    icon: ShoppingCart,
    demoEmail: "customer1@terra.demo",
  },
  {
    role: "manager",
    verb: "Accepts",
    text: "Accepts or rejects the orders of their own planet and sees what the planet has bought.",
    icon: ClipboardCheck,
    demoEmail: "manager.mars@terra.demo",
  },
  {
    role: "captain",
    verb: "Flies",
    text: "Builds a trip to one planet, sees the expected profit, then loads, lifts off, lands and delivers.",
    icon: Rocket,
    demoEmail: "captain1@terra.demo",
  },
  {
    role: "admiral",
    verb: "Counts",
    text: "Sets prices and planet charges and sees revenue, cost and profit for every planet.",
    icon: TrendingUp,
    demoEmail: "admiral@terra.demo",
  },
];
