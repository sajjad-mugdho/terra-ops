import { describe, expect, it } from "vitest";
import { ROLE_HOME, ROLES } from "@/features/auth/roles";
import { activeNav, crumbsFor, NAV } from "./app-nav";

describe("NAV", () => {
  it.each(ROLES)("starts %s at the role home and stays inside the role's segment", (role) => {
    const items = NAV[role].flatMap((group) => group.items);
    expect(items[0].href).toBe(ROLE_HOME[role]);
    for (const item of items) expect(item.href.startsWith(`/${role}`)).toBe(true);
    expect(new Set(items.map((item) => item.href)).size).toBe(items.length);
  });
});

describe("activeNav", () => {
  it.each([
    ["admiral", "/admiral", "/admiral"],
    ["admiral", "/admiral/orders", "/admiral/orders"],
    ["admiral", "/admiral/orders/abc", "/admiral/orders"],
    ["customer", "/customer/orders/new", "/customer/orders/new"],
    ["customer", "/customer/orders/abc", "/customer/orders"],
    ["captain", "/captain/trip", "/captain/trip"],
    ["captain", "/captain/trips", "/captain/trips"],
    ["captain", "/captain/trips/abc", "/captain/trips"],
    ["manager", "/manager", "/manager"],
  ] as const)("%s on %s marks %s", (role, pathname, href) => {
    expect(activeNav(role, pathname)?.item.href).toBe(href);
  });

  it("marks nothing outside the role's pages", () => {
    expect(activeNav("customer", "/admiral")).toBeNull();
    expect(activeNav("admiral", "/admiralty")).toBeNull();
  });
});

describe("crumbsFor", () => {
  it("names the group and the page", () => {
    expect(crumbsFor("admiral", "/admiral/trips")).toEqual([{ label: "Operations" }, { label: "Trips" }]);
  });

  it("links back to the list from a detail page", () => {
    expect(crumbsFor("manager", "/manager/orders/abc")).toEqual([
      { label: "Orders" },
      { label: "All orders", href: "/manager/orders" },
      { label: "Order details" },
    ]);
  });

  it("is empty for an unknown path", () => {
    expect(crumbsFor("captain", "/nowhere")).toEqual([]);
  });
});
