import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { testDatabaseUrl } from "./src/test/database-url.ts";

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path("./src"),
      "server-only": path("./src/test/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
    globalSetup: "./src/test/global-setup.ts",
    setupFiles: ["./src/test/setup.ts"],
    // Service tests share one database, so files run one at a time.
    fileParallelism: false,
    hookTimeout: 60_000,
    env: {
      DATABASE_URL: testDatabaseUrl(),
      BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters",
      BETTER_AUTH_URL: "http://localhost:3000",
    },
  },
});
