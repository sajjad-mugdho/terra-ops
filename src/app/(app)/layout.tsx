import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/features/auth/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  // A stale cookie passes the proxy. This is where it gets caught.
  if (!user) redirect("/login");
  // Written by the sidebar when it is collapsed or opened.
  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";
  return (
    <AppShell user={user} sidebarOpen={sidebarOpen}>
      {children}
    </AppShell>
  );
}
