import { requirePageRole } from "@/features/auth/guards";

export default async function AdmiralLayout({ children }: LayoutProps<"/admiral">) {
  await requirePageRole("admiral");
  return children;
}
