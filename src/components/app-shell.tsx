import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { CurrentUser } from "@/features/auth/session";

type Props = { user: CurrentUser; sidebarOpen: boolean; children: ReactNode };

export function AppShell({ user, sidebarOpen, children }: Props) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={sidebarOpen}>
        {/* Only what the sidebar shows crosses to the client. */}
        <AppSidebar
          user={{ name: user.name, email: user.email, role: user.role, planetName: user.planetName }}
        />
        <SidebarInset>
          <AppHeader role={user.role} />
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
