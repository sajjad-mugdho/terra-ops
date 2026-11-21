import "dotenv/config";

// Same server as the dev database, different database name. Tests never touch terra_ops.
export function testDatabaseUrl(): string {
  const url = new URL(process.env.DATABASE_URL ?? "postgresql://terra:terra@localhost:5434/terra_ops");
  url.pathname = "/terra_ops_test";
  return url.toString();
}
