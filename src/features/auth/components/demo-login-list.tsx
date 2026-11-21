"use client";

import { useActionState } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { demoLoginAction } from "../actions";
import type { DemoUser } from "../demo-users";
import { ROLE_LABEL, ROLES } from "../roles";

export function DemoLoginList({ users }: { users: DemoUser[] }) {
  const [state, action, pending] = useActionState(demoLoginAction, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={state?.error} />
      {ROLES.map((role) => (
        <section key={role} className="flex flex-col gap-2">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {ROLE_LABEL[role]}
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {users
              .filter((user) => user.role === role)
              .map((user) => (
                <Button
                  key={user.email}
                  type="submit"
                  name="email"
                  value={user.email}
                  variant="outline"
                  disabled={pending}
                  className="h-auto justify-start py-2 text-left"
                >
                  <span className="flex flex-col">
                    <span>Log in as {user.planet ?? user.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
                  </span>
                </Button>
              ))}
          </div>
        </section>
      ))}
    </form>
  );
}
