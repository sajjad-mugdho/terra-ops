"use server";

import { redirect } from "next/navigation";
import { type ActionFailure, toActionResult } from "@/lib/action-result";
import { AppError } from "@/lib/errors";
import { ROLE_HOME, type Role } from "./roles";
import { demoLoginSchema, signInSchema, signUpSchema } from "./schemas";
import { demoLogin, EMAIL_TAKEN, signIn, signOut, signUp } from "./service";

// values: what the user typed, so the form can show it again. Never the password.
export type AuthFormState = (ActionFailure & { values?: Record<string, string> }) | null;

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

export async function signInAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = text(formData, "email");
  let role: Role;
  try {
    role = await signIn(signInSchema.parse({ email, password: text(formData, "password") }));
  } catch (error) {
    return { ...toActionResult(error), values: { email } };
  }
  redirect(ROLE_HOME[role]);
}

export async function signUpAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { name: text(formData, "name"), email: text(formData, "email") };
  try {
    await signUp(signUpSchema.parse({ ...values, password: text(formData, "password") }));
  } catch (error) {
    const result = toActionResult(error);
    const emailTaken = error instanceof AppError && error.message === EMAIL_TAKEN;
    return { ...result, values, ...(emailTaken && { fieldErrors: { email: [EMAIL_TAKEN] } }) };
  }
  redirect(ROLE_HOME.customer);
}

export async function demoLoginAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  let role: Role;
  try {
    role = await demoLogin(demoLoginSchema.parse({ email: text(formData, "email") }).email);
  } catch (error) {
    return toActionResult(error);
  }
  redirect(ROLE_HOME[role]);
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/login");
}
