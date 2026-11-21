import "server-only";
import { redirect } from "next/navigation";
import { ROLE_HOME, type Role } from "./roles";
import { type CurrentUser, getCurrentUser } from "./session";

// For layouts and pages: a friendly redirect. Services still do the real check.
export async function requirePageRole(role: Role): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== role) redirect(ROLE_HOME[user.role]);
  return user;
}

export async function redirectIfSignedIn(): Promise<void> {
  const user = await getCurrentUser();
  if (user) redirect(ROLE_HOME[user.role]);
}
