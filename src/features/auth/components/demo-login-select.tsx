"use client";

import { useActionState } from "react";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";
import { demoLoginAction } from "../actions";
import type { DemoUser } from "../demo-users";
import { ROLE_LABEL, ROLES } from "../roles";

// One dropdown for every seeded account, grouped by role. A native select, so it works with the keyboard and without JS.
export function DemoLoginSelect({ users }: { users: DemoUser[] }) {
  const [state, action] = useActionState(demoLoginAction, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="demo-email">Demo account</Label>
        <NativeSelect id="demo-email" name="email" defaultValue={users[0]?.email} className="w-full">
          {ROLES.map((role) => (
            <NativeSelectOptGroup key={role} label={ROLE_LABEL[role]}>
              {users
                .filter((user) => user.role === role)
                .map((user) => (
                  <NativeSelectOption key={user.email} value={user.email}>
                    {user.name} · {user.email}
                  </NativeSelectOption>
                ))}
            </NativeSelectOptGroup>
          ))}
        </NativeSelect>
        <p className="text-xs text-muted-foreground">Seeded users for every role and planet. No password needed.</p>
      </div>
      <FormError message={state?.error} />
      <SubmitButton variant="outline">Log in with this account</SubmitButton>
    </form>
  );
}
