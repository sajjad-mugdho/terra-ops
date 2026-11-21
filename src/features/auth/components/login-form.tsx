"use client";

import { useActionState } from "react";
import { FieldError, FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction } from "../actions";

export function LoginForm() {
  const [state, action] = useActionState(signInAction, null);
  const errors = state?.fieldErrors;

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state?.values?.email}
          aria-invalid={!!errors?.email}
          aria-describedby="email-error"
        />
        <FieldError id="email-error" messages={errors?.email} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={!!errors?.password}
          aria-describedby="password-error"
        />
        <FieldError id="password-error" messages={errors?.password} />
      </div>
      {!errors && <FormError message={state?.error} />}
      <SubmitButton>Log in</SubmitButton>
    </form>
  );
}
