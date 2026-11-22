import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ROLE_HOME } from "@/features/auth/roles";
import { getCurrentUser } from "@/features/auth/session";
import { LandingPage } from "@/features/landing/components/landing-page";
import { getLandingCatalog } from "@/features/landing/service";

export const metadata: Metadata = {
  title: { absolute: "Terra Supply Co. · Supplies for every planet" },
  description: "Supplies flown from Earth to every planet. Pick a planet, price a delivery, follow every step.",
};

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect(ROLE_HOME[user.role]);
  return <LandingPage catalog={await getLandingCatalog()} />;
}
