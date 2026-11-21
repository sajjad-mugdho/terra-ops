import { requirePageRole } from "@/features/auth/guards";

export default async function CaptainLayout({ children }: LayoutProps<"/captain">) {
  await requirePageRole("captain");
  return children;
}
