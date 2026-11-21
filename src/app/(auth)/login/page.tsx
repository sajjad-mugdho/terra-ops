import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoLoginList } from "@/features/auth/components/demo-login-list";
import { LoginForm } from "@/features/auth/components/login-form";
import { DEMO_USERS } from "@/features/auth/demo-users";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <>
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
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Demo accounts</CardTitle>
          <CardDescription>One click logs you in as a seeded user. No password needed.</CardDescription>
        </CardHeader>
        <CardContent>
          <DemoLoginList users={DEMO_USERS} />
        </CardContent>
      </Card>
    </>
  );
}
