"use client";

import { useActionState } from "react";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { placeOrderAction } from "../actions";
import type { RequestedLine } from "../pricing";

type Props = {
  divisionId: string;
  items: RequestedLine[];
  expectedTotalCents: number;
  idempotencyKey: string;
};

export function PlaceOrderForm({ divisionId, items, expectedTotalCents, idempotencyKey }: Props) {
  const [state, action] = useActionState(placeOrderAction, null);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="divisionId" value={divisionId} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <input type="hidden" name="expectedTotalCents" value={expectedTotalCents} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {state && !state.ok && <FormError message={state.error} />}
      <SubmitButton size="lg">Pay &amp; place order</SubmitButton>
      <p className="text-xs text-muted-foreground">Payment is simulated. No card is charged.</p>
    </form>
  );
}
