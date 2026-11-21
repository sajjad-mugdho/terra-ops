import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions";
import { ROLE_HOME, ROLE_LABEL, type Role } from "@/features/auth/roles";
import type { CurrentUser } from "@/features/auth/session";

// A link is added here in the slice that adds its page.
const NAV: Record<Role, { href: Route; label: string }[]> = {
  admiral: [{ href: "/admiral", label: "Dashboard" }],
  manager: [{ href: "/manager/queue", label: "Order queue" }],
  captain: [{ href: "/captain/trip", label: "My trip" }],
  customer: [{ href: "/customer/orders", label: "My orders" }],
};

export function AppShell({ user, children }: { user: CurrentUser; children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href={ROLE_HOME[user.role]} className="font-semibold">
            Terra Supply Co.
          </Link>
          <nav aria-label="Main" className="flex flex-1 flex-wrap gap-1">
            {NAV[user.role].map((item) => (
              <Button key={item.href} variant="ghost" size="sm" nativeButton={false} render={<Link href={item.href} />}>
                {item.label}
              </Button>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right leading-tight">
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">
                {ROLE_LABEL[user.role]}
                {user.planetName && ` · ${user.planetName}`}
              </p>
            </div>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                Log out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
