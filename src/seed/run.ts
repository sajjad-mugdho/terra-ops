import "dotenv/config";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  const target = `${url.hostname}${url.pathname}`;

  if (!process.argv.includes("--yes")) {
    console.error(`This wipes ALL data in ${target} and reseeds it.`);
    console.error("Run again with --yes to continue:  npm run db:seed -- --yes");
    process.exit(1);
  }

  // Imported after the check so nothing connects before the user agreed.
  const { seedReference } = await import("./reference");
  console.log(`Seeding ${target} ...`);
  await seedReference();
  console.log("Done.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
