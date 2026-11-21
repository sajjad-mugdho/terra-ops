import "server-only";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { DEMO_PASSWORD, isDemoEmail } from "./demo-users";
import { isRole, type Role } from "./roles";
import type { SignInInput, SignUpInput } from "./schemas";

export const EMAIL_TAKEN = "An account with this email already exists";

// One message for both cases, so nobody learns which emails have accounts.
export async function signIn(input: SignInInput): Promise<Role> {
  try {
    const { user } = await auth.api.signInEmail({ body: input, headers: await headers() });
    return isRole(user.role) ? user.role : "customer";
  } catch (error) {
    if (error instanceof APIError) throw new AppError("INVALID", "Invalid email or password");
    throw error;
  }
}

// Better Auth ignores role in the body (input: false), so this always creates a customer.
export async function signUp(input: SignUpInput): Promise<void> {
  try {
    await auth.api.signUpEmail({ body: input, headers: await headers() });
  } catch (error) {
    if (error instanceof APIError) {
      const taken = error.body?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" || error.body?.code === "USER_ALREADY_EXISTS";
      throw new AppError(taken ? "CONFLICT" : "INVALID", taken ? EMAIL_TAKEN : "Could not create the account");
    }
    throw error;
  }
}

// Only for the seeded list, so it can never open a real account.
export async function demoLogin(email: string): Promise<Role> {
  if (!isDemoEmail(email)) throw new AppError("FORBIDDEN");
  try {
    return await signIn({ email, password: DEMO_PASSWORD });
  } catch (error) {
    if (error instanceof AppError) {
      throw new AppError("NOT_FOUND", "Demo data is missing. Run the seed.");
    }
    throw error;
  }
}

export async function signOut(): Promise<void> {
  await auth.api.signOut({ headers: await headers() }).catch((error: unknown) => {
    // No session left to end is fine.
    if (!(error instanceof APIError)) throw error;
  });
}
