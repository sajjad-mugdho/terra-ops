import type { Route } from "next";
import {
  Boxes,
  Globe,
  History,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  Package,
  PackagePlus,
  Receipt,
  Rocket,
  Route as RouteIcon,
} from "lucide-react";
import type { Role } from "@/features/auth/roles";

// detail names the pages below an item, for the breadcrumb.
export type NavItem = { href: Route; label: string; icon: LucideIcon; detail?: string };

export type NavGroup = { label: string; items: NavItem[] };

export type Crumb = { label: string; href?: Route };

export const NAV: Record<Role, NavGroup[]> = {
  admiral: [
    { label: "Overview", items: [{ href: "/admiral", label: "Dashboard", icon: LayoutDashboard }] },
    {
      label: "Operations",
      items: [
        { href: "/admiral/orders", label: "Orders", icon: Package, detail: "Order details" },
        { href: "/admiral/trips", label: "Trips", icon: Rocket, detail: "Trip details" },
      ],
    },
    {
      label: "Settings",
      items: [
        { href: "/admiral/products", label: "Products", icon: Boxes },
        { href: "/admiral/planets", label: "Planets", icon: Globe },
        { href: "/admiral/history", label: "Change history", icon: History },
      ],
    },
  ],
  manager: [
    { label: "Overview", items: [{ href: "/manager", label: "Dashboard", icon: LayoutDashboard }] },
    {
      label: "Orders",
      items: [
        { href: "/manager/queue", label: "Order queue", icon: Inbox },
        { href: "/manager/orders", label: "All orders", icon: Package, detail: "Order details" },
      ],
    },
    { label: "Reports", items: [{ href: "/manager/report", label: "Purchases", icon: Receipt }] },
  ],
  captain: [
    { label: "Overview", items: [{ href: "/captain", label: "Dashboard", icon: LayoutDashboard }] },
    {
      label: "Trips",
      items: [
        { href: "/captain/trip", label: "Current trip", icon: Rocket },
        { href: "/captain/trips", label: "Trips and earnings", icon: RouteIcon, detail: "Trip details" },
      ],
    },
  ],
  customer: [
    { label: "Overview", items: [{ href: "/customer", label: "Dashboard", icon: LayoutDashboard }] },
    {
      label: "Orders",
      items: [
        { href: "/customer/orders", label: "My orders", icon: Package, detail: "Order details" },
        { href: "/customer/orders/new", label: "New order", icon: PackagePlus },
      ],
    },
  ],
};

// The longest matching href wins, so "/admiral" is not active on "/admiral/orders".
export function activeNav(role: Role, pathname: string): { group: NavGroup; item: NavItem } | null {
  let best: { group: NavGroup; item: NavItem } | null = null;
  for (const group of NAV[role]) {
    for (const item of group.items) {
      const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (matches && (!best || item.href.length > best.item.href.length)) best = { group, item };
    }
  }
  return best;
}

export function crumbsFor(role: Role, pathname: string): Crumb[] {
  const active = activeNav(role, pathname);
  if (!active) return [];
  const { group, item } = active;
  if (pathname === item.href) return [{ label: group.label }, { label: item.label }];
  return [
    { label: group.label },
    { label: item.label, href: item.href },
    { label: item.detail ?? "Details" },
  ];
}
