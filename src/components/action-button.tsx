"use client";

import { type ComponentProps, useActionState } from "react";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "@/lib/action-result";

type Props = Omit<ComponentProps<typeof SubmitButton>, "action"> & {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  fields: Record<string, string>;
};

// One button that runs one Server Action and shows its error next to itself.
export function ActionButton({ action, fields, children, ...button }: Props) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton {...button}>{children}</SubmitButton>
      {state && !state.ok && <FormError message={state.error} />}
    </form>
  );
}
