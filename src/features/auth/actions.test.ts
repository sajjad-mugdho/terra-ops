import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { session, user } from "@/db/schema";
import { seedReference } from "@/seed/reference";
import { redirectTarget } from "@/test/redirect";
import { actAs, actAsNobody } from "@/test/session";
import { demoLoginAction, signInAction, signOutAction, signUpAction } from "./actions";
import { DEMO_PASSWORD, DEMO_USERS } from "./demo-users";
import { ROLE_HOME, ROLES } from "./roles";
import { getCurrentUser } from "./session";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeAll(seedReference);

describe("role homes", () => {
  it("gives every role its own home", () => {
    expect(ROLE_HOME).toEqual({
      admiral: "/admiral",
      manager: "/manager/queue",
      captain: "/captain/trip",
      customer: "/customer/orders",
    });
    expect(new Set(Object.values(ROLE_HOME)).size).toBe(ROLES.length);
  });
});

describe("demoLoginAction", () => {
  it("lists 1 admiral, 7 managers, 4 captains and 4 customers", () => {
    const count = (role: string) => DEMO_USERS.filter((demo) => demo.role === role).length;
    expect(ROLES.map(count)).toEqual([1, 7, 4, 4]);
  });

  it.each(DEMO_USERS)("logs in $email and lands on the $role home", async ({ email, role }) => {
    const target = await redirectTarget(() => demoLoginAction(null, form({ email })));
    expect(target).toBe(ROLE_HOME[role]);
  });

  it("refuses an email outside the demo list", async () => {
    await expect(demoLoginAction(null, form({ email: "nobody@example.com" }))).resolves.toEqual({
      ok: false,
      error: "Not allowed",
    });
  });
});

describe("signInAction", () => {
  it("accepts an email typed with capitals and spaces and lands on the role home", async () => {
    const fields = { email: "  Manager.Mars@Terra.Demo ", password: DEMO_PASSWORD };
    expect(await redirectTarget(() => signInAction(null, form(fields)))).toBe("/manager/queue");
  });

  it.each([
    ["a wrong password", { email: "admiral@terra.demo", password: "wrong-password" }],
    ["an unknown email", { email: "nobody@terra.demo", password: DEMO_PASSWORD }],
  ])("gives one message for %s and keeps the email, not the password", async (_, fields) => {
    await expect(signInAction(null, form(fields))).resolves.toEqual({
      ok: false,
      error: "Invalid email or password",
      values: { email: fields.email },
    });
  });

  it("returns field errors for an empty form", async () => {
    const result = await signInAction(null, form({}));
    expect(result).toMatchObject({ ok: false, fieldErrors: { email: [expect.any(String)] } });
    expect(result?.fieldErrors).toHaveProperty("password");
  });
});

describe("signUpAction", () => {
  const fields = { name: "Nova Reyes", email: "Nova@Example.com", password: "long-enough" };

  it("creates a customer and lands on the customer home", async () => {
    const data = form({ ...fields, role: "admiral", planetId: "x" });
    expect(await redirectTarget(() => signUpAction(null, data))).toBe("/customer/orders");

    const [row] = await db.select().from(user).where(eq(user.email, "nova@example.com"));
    expect(row).toMatchObject({ name: "Nova Reyes", role: "customer" });
  });

  it("puts a used email next to the email field and keeps the typed values", async () => {
    await expect(signUpAction(null, form(fields))).resolves.toEqual({
      ok: false,
      error: "An account with this email already exists",
      fieldErrors: { email: ["An account with this email already exists"] },
      values: { name: fields.name, email: fields.email },
    });
  });

  it("returns one error per invalid field", async () => {
    const result = await signUpAction(null, form({ name: "  ", email: "nope", password: "short" }));
    expect(Object.keys(result?.fieldErrors ?? {}).sort()).toEqual(["email", "name", "password"]);
    expect(result?.values).toEqual({ name: "  ", email: "nope" });
  });
});

describe("signOutAction", () => {
  it("ends the session and returns to /login", async () => {
    await actAs("captain3@terra.demo");
    const [captain] = await db.select().from(user).where(eq(user.email, "captain3@terra.demo"));
    const sessions = () => db.$count(session, eq(session.userId, captain.id));
    const before = await sessions();

    expect(await redirectTarget(signOutAction)).toBe("/login");
    // Only this session ends: the demo login above left its own.
    expect(await sessions()).toBe(before - 1);
    expect(await getCurrentUser()).toBeNull();
  });

  it("still returns to /login when there is no session", async () => {
    actAsNobody();
    expect(await redirectTarget(signOutAction)).toBe("/login");
  });
});
