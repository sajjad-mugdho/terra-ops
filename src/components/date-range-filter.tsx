"use client";

import Form from "next/form";
import Link from "next/link";
import { useState } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rangeError } from "@/features/reports/range";

type Props = { path: "/admiral" | "/manager/report"; from: string; to: string };

// The range lives in the URL, so a report can be shared and refreshed.
export function DateRangeFilter({ path, from, to }: Props) {
  const [error, setError] = useState<string | null>(null);

  return (
    <Form
      // Remounts when the URL range changes, so the inputs follow it.
      key={`${from}-${to}`}
      action={path}
      className="mb-6 flex flex-col gap-2"
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget);
        const problem = rangeError(data.get("from"), data.get("to"));
        setError(problem);
        // A bad range never leaves the page: the last result stays on screen.
        if (problem) event.preventDefault();
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="from">From</Label>
          <Input id="from" name="from" type="date" required defaultValue={from} aria-invalid={!!error} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="to">To</Label>
          <Input id="to" name="to" type="date" required defaultValue={to} aria-invalid={!!error} />
        </div>
        <Button type="submit">Apply</Button>
        <Button variant="ghost" nativeButton={false} render={<Link href={path} />}>
          Last 30 days
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Earth time (UTC). Both days are included.</p>
      <FormError message={error ?? undefined} />
    </Form>
  );
}
