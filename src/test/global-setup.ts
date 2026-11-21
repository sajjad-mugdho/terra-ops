import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { testDatabaseUrl } from "./database-url";

export default async function setup() {
  const url = new URL(testDatabaseUrl());
  const name = url.pathname.slice(1);

  const admin = new URL(url);
  admin.pathname = "/postgres";
  const server = new Client({ connectionString: admin.toString() });
  await server.connect();
  const found = await server.query("select 1 from pg_database where datname = $1", [name]);
  if (found.rowCount === 0) await server.query(`create database "${name}"`);
  await server.end();

  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  await client.end();
}
