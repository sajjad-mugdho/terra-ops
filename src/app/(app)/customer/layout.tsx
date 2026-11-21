import { requirePageRole } from "@/features/auth/guards";

export default async function CustomerLayout({ children }: LayoutProps<"/customer">) {
  await requirePageRole("customer");
  return children;
}
