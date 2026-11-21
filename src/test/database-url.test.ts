import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { testDatabaseUrl } from "./database-url";

afterEach(() => vi.unstubAllEnvs());

describe("testDatabaseUrl", () => {
  it.each([
    ["postgresql://terra:terra@localhost:5434/terra_ops", "localhost:5434"],
    ["postgresql://u:p@db.example.com/live?sslmode=require", "db.example.com"],
  ])("swaps the database of %s for terra_ops_test", (devUrl, host) => {
    vi.stubEnv("DATABASE_URL", devUrl);
    const url = new URL(testDatabaseUrl());
    expect(url.pathname).toBe("/terra_ops_test");
    expect(url.host).toBe(host);
  });
});

describe("the test run", () => {
  it("is connected to terra_ops_test, never the dev database", async () => {
    const { rows } = await db.execute<{ name: string }>(sql`select current_database() as name`);
    expect(rows[0].name).toBe("terra_ops_test");
  });
});
