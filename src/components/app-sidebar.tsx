"use client";

import { LogOut, Rocket } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeNav, NAV } from "@/components/app-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { signOutAction } from "@/features/auth/actions";
import { ROLE_HOME, ROLE_LABEL } from "@/features/auth/roles";
import type { CurrentUser } from "@/features/auth/session";

export type SidebarUser = Pick<CurrentUser, "name" | "email" | "role" | "planetName">;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export function AppSidebar({ user }: { user: SidebarUser }) {
  const active = activeNav(user.role, usePathname())?.item.href;
  const { setOpenMobile } = useSidebar();
  const closeDrawer = () => setOpenMobile(false);

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={closeDrawer} render={<Link href={ROLE_HOME[user.role]} />}>
              <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Rocket aria-hidden />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">Terra Supply Co.</span>
                <span className="truncate text-xs text-muted-foreground">
                  {ROLE_LABEL[user.role]}
                  {user.planetName && ` · ${user.planetName}`}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <nav aria-label="Main" className="flex flex-col">
          {NAV[user.role].map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={item.href === active}
                        aria-current={item.href === active ? "page" : undefined}
                        tooltip={item.label}
                        onClick={closeDrawer}
                        render={<Link href={item.href} />}
                      >
                        <item.icon aria-hidden />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 p-2 text-sm group-data-[collapsible=icon]:p-0">
          <Avatar>
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          </div>
        </div>
        <form action={signOutAction}>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton type="submit" tooltip="Log out">
                <LogOut aria-hidden />
                <span>Log out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </form>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
