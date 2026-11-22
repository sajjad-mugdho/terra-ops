import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const valid = {
  DATABASE_URL: "postgresql://terra:terra@localhost:5434/terra_ops",
  BETTER_AUTH_SECRET: "a-secret-that-is-at-least-32-characters",
  BETTER_AUTH_URL: "http://localhost:3000",
};

function messageOf(source: Record<string, string | undefined>): string {
  try {
    parseEnv(source);
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("parseEnv did not throw");
}

describe("parseEnv", () => {
  it("returns the three variables and nothing else", () => {
    expect(parseEnv({ ...valid, PATH: "/usr/bin" })).toEqual(valid);
  });

  it("accepts the postgres:// scheme and an https URL", () => {
    const source = {
      ...valid,
      DATABASE_URL: "postgres://user:pass@host.neon.tech/db?sslmode=require",
      BETTER_AUTH_URL: "https://terra.example.com",
    };
    expect(parseEnv(source)).toEqual(source);
  });

  it.each(["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL"] as const)("names %s when it is missing", (key) => {
    expect(messageOf({ ...valid, [key]: undefined })).toBe(`Invalid environment: ${key} is missing. See .env.example.`);
  });

  it("treats an empty value as missing", () => {
    expect(messageOf({ ...valid, BETTER_AUTH_SECRET: "" })).toContain("BETTER_AUTH_SECRET is missing");
  });

  it("lists every problem at once", () => {
    const message = messageOf({});
    expect(message).toContain("DATABASE_URL is missing");
    expect(message).toContain("BETTER_AUTH_SECRET is missing");
    expect(message).toContain("BETTER_AUTH_URL is missing");
  });

  it("rejects a secret shorter than 32 characters without printing it", () => {
    const message = messageOf({ ...valid, BETTER_AUTH_SECRET: "short-secret-value" });
    expect(message).toContain("BETTER_AUTH_SECRET is invalid");
    expect(message).not.toContain("short-secret-value");
  });

  it("rejects a database URL that is not Postgres without printing it", () => {
    const message = messageOf({ ...valid, DATABASE_URL: "mysql://root:hunter2@db.internal/app" });
    expect(message).toContain("DATABASE_URL is invalid");
    expect(message).not.toContain("hunter2");
    expect(message).not.toContain("db.internal");
  });

  it("rejects an auth URL that is not http or https", () => {
    expect(messageOf({ ...valid, BETTER_AUTH_URL: "ftp://terra.example.com" })).toContain("BETTER_AUTH_URL is invalid");
    expect(messageOf({ ...valid, BETTER_AUTH_URL: "terra.example.com" })).toContain("BETTER_AUTH_URL is invalid");
  });

  it.each(["http://localhost:3000", "http://127.0.0.1:3000", "http://[::1]:3000"])(
    "rejects %s as the auth URL on Vercel",
    (url) => {
      expect(messageOf({ ...valid, BETTER_AUTH_URL: url, VERCEL: "1" })).toContain("points to localhost on Vercel");
    },
  );

  it("accepts a deployed auth URL on Vercel and localhost everywhere else", () => {
    expect(parseEnv({ ...valid, BETTER_AUTH_URL: "https://terra.example.com", VERCEL: "1" }).BETTER_AUTH_URL).toBe(
      "https://terra.example.com",
    );
    expect(parseEnv({ ...valid, VERCEL: undefined }).BETTER_AUTH_URL).toBe("http://localhost:3000");
  });
});
