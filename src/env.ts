import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }),
});

export type Env = z.infer<typeof envSchema>;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

// Messages name the variable and the rule only, so a secret never reaches a build log.
export function parseEnv(source: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) =>
      source[String(issue.path[0])] ? `${issue.path.join(".")} is invalid` : `${issue.path.join(".")} is missing`,
    );
    throw new Error(`Invalid environment: ${[...new Set(problems)].join(", ")}. See .env.example.`);
  }
  if (source.VERCEL === "1" && LOCAL_HOSTS.has(new URL(parsed.data.BETTER_AUTH_URL).hostname)) {
    throw new Error("Invalid environment: BETTER_AUTH_URL points to localhost on Vercel. Set it to the deployed URL.");
  }
  return parsed.data;
}

export const env = parseEnv(process.env);
