"use client";

import { useActionState, useEffect, useRef } from "react";
import { FieldError, FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { centsToDollarText } from "@/lib/money";
import type { MoneyFormState } from "../actions";

type Field = { name: string; label: string; cents: number; hint: string };

type Props = {
  id: string;
  title: string;
  fields: Field[];
  action: (state: MoneyFormState, formData: FormData) => Promise<MoneyFormState>;
};

export function EditMoneyDialog({ id, title, fields, action }: Props) {
  const [state, formAction] = useActionState(action, null);
  const dialog = useRef<HTMLDialogElement>(null);
  const failed = state && !state.ok ? state : null;
  const hasFieldErrors = fields.some((field) => failed?.fieldErrors?.[field.name]);

  useEffect(() => {
    if (state?.ok) dialog.current?.close();
  }, [state]);

  return (
    <div className="flex items-center justify-end gap-2">
      {state?.ok && (
        <span role="status" className="text-xs text-muted-foreground">
          {state.data?.message}
        </span>
      )}
      <Button type="button" variant="outline" size="sm" onClick={() => dialog.current?.showModal()}>
        Edit
      </Button>

      <dialog
        ref={dialog}
        aria-labelledby={`edit-${id}`}
        className="m-auto w-full max-w-sm rounded-xl border bg-background p-5 text-left text-foreground backdrop:bg-black/40"
      >
        {/* The key resets the inputs to the saved values after a successful save. */}
        <form
          key={fields.map((field) => field.cents).join("-")}
          action={formAction}
          className="flex flex-col gap-3"
        >
          <h2 id={`edit-${id}`} className="text-base font-medium">
            {title}
          </h2>
          <input type="hidden" name="id" value={id} />
          {fields.map((field) => {
            const errors = failed?.fieldErrors?.[field.name];
            const inputId = `${field.name}-${id}`;
            return (
              <div key={field.name} className="flex flex-col gap-1.5">
                <Label htmlFor={inputId}>{field.label} ($)</Label>
                <Input
                  id={inputId}
                  name={field.name}
                  inputMode="decimal"
                  autoComplete="off"
                  required
                  defaultValue={failed?.values?.[field.name] ?? centsToDollarText(field.cents)}
                  aria-invalid={!!errors}
                  aria-describedby={`${inputId}-error ${inputId}-hint`}
                />
                <FieldError id={`${inputId}-error`} messages={errors} />
                <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
                  {field.hint}
                </p>
              </div>
            );
          })}
          {failed && !hasFieldErrors && <FormError message={failed.error} />}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => dialog.current?.close()}>
              Cancel
            </Button>
            <SubmitButton>Save</SubmitButton>
          </div>
        </form>
      </dialog>
    </div>
  );
}
