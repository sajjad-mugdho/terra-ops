// Fails when a secret or local agent file is tracked now or was ever committed.
import { execFileSync } from "node:child_process";

const FORBIDDEN = [
  /(^|\/)\.env(\.(?!example$)[^/]*)?$/,
  /\.pem$/,
  /(^|\/)(AGENTS|CLAUDE)\.md$/,
  /(^|\/)\.(claude|agents|zcode|vercel)\//,
  /(^|\/)skills-lock\.json$/,
];

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).split("\n").filter(Boolean);

const tracked = git("ls-files");
const everAdded = git("log", "--all", "--diff-filter=A", "--name-only", "--format=");
const bad = [...new Set([...tracked, ...everAdded])].filter((file) => FORBIDDEN.some((rule) => rule.test(file)));

if (bad.length > 0) {
  console.error("Files that must never be committed:");
  for (const file of bad) console.error(`  ${file}`);
  console.error("If one held a secret, rotate the secret. Deleting the file is not enough.");
  process.exit(1);
}
console.log(`Repo check passed: ${tracked.length} tracked files, no .env, key or agent file in the history.`);
