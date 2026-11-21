import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { planets, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { seedReference } from "@/seed/reference";
import { DEMO_PASSWORD } from "./demo-users";
import { demoLogin, signIn, signUp } from "./service";

beforeAll(seedReference);

describe("signUp", () => {
  it("creates a customer", async () => {
    await signUp({ name: "New Person", email: "new@example.com", password: "long-enough" });
    const [row] = await db.select().from(user).where(eq(user.email, "new@example.com"));
    expect(row.role).toBe("customer");
  });

  it("still creates a plain customer when the request body asks for more", async () => {
    const body = { name: "Sneaky", email: "sneaky@example.com", password: "long-enough" };
    await auth.api.signUpEmail({ body: { ...body, role: "admiral", planetId: "x" } as typeof body });

    const [row] = await db.select().from(user).where(eq(user.email, body.email));
    expect(row.role).toBe("customer");
    expect(await db.$count(planets, eq(planets.managerId, row.id))).toBe(0);
    expect(await db.$count(user, eq(user.role, "admiral"))).toBe(1);
  });

  it("rejects an email that is already used, in any letter case", async () => {
    const input = { name: "Copy", email: "customer1@terra.demo", password: "long-enough" };
    await expect(signUp(input)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(signUp({ ...input, email: "CUSTOMER1@terra.demo" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});

describe("signIn", () => {
  it("returns the role of the user", async () => {
    await expect(signIn({ email: "admiral@terra.demo", password: DEMO_PASSWORD })).resolves.toBe("admiral");
    await expect(signIn({ email: "captain2@terra.demo", password: DEMO_PASSWORD })).resolves.toBe("captain");
  });

  it("gives the same message for a wrong password and an unknown email", async () => {
    const wrongPassword = signIn({ email: "admiral@terra.demo", password: "wrong-password" });
    const unknownEmail = signIn({ email: "nobody@terra.demo", password: DEMO_PASSWORD });
    const expected = { code: "INVALID", message: "Invalid email or password" };
    await expect(wrongPassword).rejects.toMatchObject(expected);
    await expect(unknownEmail).rejects.toMatchObject(expected);
  });
});

describe("demoLogin", () => {
  it("logs in an account from the demo list", async () => {
    await expect(demoLogin("manager.mars@terra.demo")).resolves.toBe("manager");
  });

  it("refuses an email outside the list, even a real account", async () => {
    await signUp({ name: "Real Person", email: "real@example.com", password: DEMO_PASSWORD });
    await expect(demoLogin("real@example.com")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("says the seed is missing when a demo user is not in the database", async () => {
    await db.execute("truncate table session, account, verification");
    await expect(demoLogin("customer4@terra.demo")).rejects.toMatchObject({
      message: "Demo data is missing. Run the seed.",
    });
  });
});
