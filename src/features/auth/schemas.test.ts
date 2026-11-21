import { describe, expect, it } from "vitest";
import { signInSchema, signUpSchema } from "./schemas";

const valid = { name: "Mira Chen", email: "mira@example.com", password: "long-enough" };

describe("signUpSchema", () => {
  it("accepts a valid sign-up and trims the name", () => {
    expect(signUpSchema.parse({ ...valid, name: "  Mira Chen " })).toEqual(valid);
  });

  it("treats the same email in another letter case as the same email", () => {
    expect(signUpSchema.parse({ ...valid, email: "  Mira@Example.COM " }).email).toBe("mira@example.com");
  });

  it.each([
    ["name", "   "],
    ["name", "a"],
    ["name", "a".repeat(61)],
    ["email", "not-an-email"],
    ["email", ""],
    ["password", "short"],
    ["password", "a".repeat(129)],
  ])("rejects %s = %j", (field, value) => {
    const result = signUpSchema.safeParse({ ...valid, [field]: value });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual([field]);
  });

  it("drops fields a client must not set", () => {
    const parsed = signUpSchema.parse({ ...valid, role: "admiral", planetId: "x" });
    expect(parsed).toEqual(valid);
  });
});

describe("signInSchema", () => {
  it("trims and lowercases the email", () => {
    expect(signInSchema.parse({ email: " Admiral@Terra.Demo ", password: "x" }).email).toBe(
      "admiral@terra.demo",
    );
  });

  it("rejects an empty password", () => {
    expect(signInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});
