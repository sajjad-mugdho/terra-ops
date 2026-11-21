"use client";

import { useActionState } from "react";
import { FieldError, FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction } from "../actions";

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, null);
  const errors = state?.fieldErrors;

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          required
          defaultValue={state?.values?.name}
          aria-invalid={!!errors?.name}
          aria-describedby="name-error"
        />
        <FieldError id="name-error" messages={errors?.name} />
      </div>
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
          autoComplete="new-password"
          required
          aria-invalid={!!errors?.password}
          aria-describedby="password-error password-hint"
        />
        <p id="password-hint" className="text-xs text-muted-foreground">
          At least 8 characters.
        </p>
        <FieldError id="password-error" messages={errors?.password} />
      </div>
      {!errors && <FormError message={state?.error} />}
      <SubmitButton>Create account</SubmitButton>
    </form>
  );
}
