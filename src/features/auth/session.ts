import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";
import { db } from "@/db";
import { planets } from "@/db/schema";
import { auth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { isRole, type Role } from "./roles";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  planetId: string | null;
  planetName: string | null;
};

export type ManagerUser = CurrentUser & { planetId: string; planetName: string };

// cache(): one session read per request, however many services ask.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isRole(session.user.role)) return null;

  const { id, name, email, role } = session.user;
  const user: CurrentUser = { id, name, email, role, planetId: null, planetName: null };
  if (role !== "manager") return user;

  const [planet] = await db
    .select({ id: planets.id, name: planets.name })
    .from(planets)
    .where(eq(planets.managerId, id));
  return planet ? { ...user, planetId: planet.id, planetName: planet.name } : user;
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHORIZED");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new AppError("FORBIDDEN");
  return user;
}

export async function requireManagerPlanet(): Promise<ManagerUser> {
  const user = await requireRole("manager");
  if (!user.planetId || !user.planetName) throw new AppError("FORBIDDEN");
  return { ...user, planetId: user.planetId, planetName: user.planetName };
}
