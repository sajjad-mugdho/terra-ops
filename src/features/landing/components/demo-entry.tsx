"use client";

import { ArrowRight } from "lucide-react";
import { type ReactNode, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { FormError } from "@/components/form-error";
import { demoLoginAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";
import { CHIP } from "./styles";

// One form around the role cards: each card's button logs in as that role's demo user.
export function DemoEntryForm({ children }: { children: ReactNode }) {
  const [state, action] = useActionState(demoLoginAction, null);
  return (
    <form action={action}>
      <FormError message={state?.error} />
      {children}
    </form>
  );
}

export function DemoEntryButton({ email, label }: { email: string; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name="email" value={email} disabled={pending} className={cn(CHIP, "cursor-pointer disabled:opacity-50")}>
      {label}
      <ArrowRight className="size-3.5" aria-hidden />
    </button>
  );
}
