"use client";

import { useActionState, useRef } from "react";
import { FieldError, FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { formatUtc } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { acceptOrderAction, rejectOrderAction } from "../actions";
import type { QueueOrder } from "../service";
import { orderCode } from "../status";
import type { Waiting } from "../waiting";
import { WaitingTime } from "./waiting-time";

// waiting is worked out on the server, so the text is the same before and after hydration.
export function QueueCard({ order, waiting }: { order: QueueOrder; waiting: Waiting | null }) {
  const [accepted, acceptAction] = useActionState(acceptOrderAction, null);
  const [rejected, rejectAction] = useActionState(rejectOrderAction, null);
  const dialog = useRef<HTMLDialogElement>(null);
  const reasonErrors = rejected && !rejected.ok ? rejected.fieldErrors?.reason : undefined;

  return (
    <Card className={waiting?.overdue ? "border-destructive/40" : undefined}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span>{orderCode(order.number)}</span>
          <span className="text-sm font-normal text-muted-foreground">
            Placed {formatUtc(order.createdAt)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {waiting && (
            <>
              <dt className="text-muted-foreground">Waiting</dt>
              <dd>
                <WaitingTime waiting={waiting} />
              </dd>
            </>
          )}
          <dt className="text-muted-foreground">Customer</dt>
          <dd>{order.customerName}</dd>
          <dt className="text-muted-foreground">Deliver to</dt>
          <dd>
            {order.sector} · {order.division}
          </dd>
          <dt className="text-muted-foreground">Items</dt>
          <dd>{order.items.map((item) => `${item.units} ${item.productName}`).join(", ")}</dd>
          <dt className="text-muted-foreground">Units</dt>
          <dd>{order.totalUnits}</dd>
          <dt className="text-muted-foreground">Total paid</dt>
          <dd className="tabular-nums">{formatMoney(order.totalCents)}</dd>
        </dl>

        <div className="flex flex-wrap items-start gap-2">
          <form action={acceptAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <SubmitButton>Accept</SubmitButton>
          </form>
          <Button type="button" variant="destructive" onClick={() => dialog.current?.showModal()}>
            Reject
          </Button>
        </div>
        {accepted && !accepted.ok && <FormError message={accepted.error} />}
      </CardContent>

      <dialog
        ref={dialog}
        aria-labelledby={`reject-${order.id}`}
        className="m-auto w-full max-w-md rounded-xl border bg-background p-5 text-foreground backdrop:bg-black/40"
      >
        <form action={rejectAction} className="flex flex-col gap-3">
          <h2 id={`reject-${order.id}`} className="text-base font-medium">
            Reject {orderCode(order.number)}
          </h2>
          <p className="text-sm text-muted-foreground">
            The customer sees this reason and gets a refund. This cannot be undone.
          </p>
          <input type="hidden" name="orderId" value={order.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`reason-${order.id}`}>Reason</Label>
            <textarea
              id={`reason-${order.id}`}
              name="reason"
              rows={3}
              required
              minLength={3}
              maxLength={300}
              defaultValue={rejected?.reason}
              aria-invalid={!!reasonErrors}
              aria-describedby={`reason-error-${order.id}`}
              className="rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <FieldError id={`reason-error-${order.id}`} messages={reasonErrors} />
          </div>
          {rejected && !rejected.ok && !reasonErrors && <FormError message={rejected.error} />}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => dialog.current?.close()}>
              Keep order
            </Button>
            <SubmitButton variant="destructive">Reject order</SubmitButton>
          </div>
        </form>
      </dialog>
    </Card>
  );
}
