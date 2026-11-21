import { requirePageRole } from "@/features/auth/guards";

export default async function ManagerLayout({ children }: LayoutProps<"/manager">) {
  await requirePageRole("manager");
  return children;
}
