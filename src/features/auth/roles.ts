import type { Route } from "next";

export const ROLES = ["admiral", "manager", "captain", "customer"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_HOME: Record<Role, Route> = {
  admiral: "/admiral",
  manager: "/manager/queue",
  captain: "/captain/trip",
  customer: "/customer/orders",
};

export const ROLE_LABEL: Record<Role, string> = {
  admiral: "Grand Admiral",
  manager: "Planet Manager",
  captain: "Captain",
  customer: "Customer",
};

export function isRole(value: unknown): value is Role {
  return ROLES.includes(value as Role);
}
