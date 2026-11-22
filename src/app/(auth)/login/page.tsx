import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoLoginSelect } from "@/features/auth/components/demo-login-select";
import { LoginForm } from "@/features/auth/components/login-form";
import { DEMO_USERS } from "@/features/auth/demo-users";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>
          New customer?{" "}
          <Link href="/sign-up" className="text-foreground underline underline-offset-4">
            Create an account
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <LoginForm />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" aria-hidden />
          or try a demo account
          <span className="h-px flex-1 bg-border" aria-hidden />
        </div>
        <DemoLoginSelect users={DEMO_USERS} />
      </CardContent>
    </Card>
  );
}
