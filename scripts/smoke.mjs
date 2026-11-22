// Smoke test for a running, seeded deployment: node scripts/smoke.mjs [base-url]
const base = (process.argv[2] ?? process.env.SMOKE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const PASSWORD = "terra-demo-2026";
const ROLES = [
  { email: "admiral@terra.demo", home: "/admiral" },
  { email: "manager.mars@terra.demo", home: "/manager" },
  { email: "captain1@terra.demo", home: "/captain" },
  { email: "customer1@terra.demo", home: "/customer" },
];

let failed = 0;

function check(name, ok, detail = "") {
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `  (${detail})`}`);
}

function get(path, cookie) {
  return fetch(base + path, { redirect: "manual", headers: cookie ? { cookie } : {} });
}

function redirectPath(response) {
  const location = response.headers.get("location");
  return location ? new URL(location, base).pathname : null;
}

async function waitUntilUp() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      await fetch(`${base}/api/auth/ok`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`No answer from ${base} after 30 seconds`);
}

// Better Auth allows 3 sign-ins per 10 seconds per IP in production, so a 429 waits and retries.
async function signIn(email, password = PASSWORD) {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(`${base}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: base },
      body: JSON.stringify({ email, password }),
    });
    if (response.status === 429 && attempt < 3) {
      const seconds = Number(response.headers.get("x-retry-after")) || 10;
      await new Promise((resolve) => setTimeout(resolve, (seconds + 1) * 1000));
      continue;
    }
    const cookie = response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    return { status: response.status, cookie };
  }
}

async function main() {
  console.log(`Smoke test against ${base}`);
  await waitUntilUp();

  const ok = await get("/api/auth/ok");
  check("auth handler answers", ok.status === 200, `status ${ok.status}`);

  const login = await get("/login");
  const loginHtml = await login.text();
  check("login page loads", login.status === 200, `status ${login.status}`);
  check("login page lists the demo accounts", loginHtml.includes("admiral@terra.demo"));

  const signUp = await get("/sign-up");
  check("sign-up page loads", signUp.status === 200, `status ${signUp.status}`);

  const landing = await get("/");
  const landingHtml = await landing.text();
  check("landing page loads for a visitor", landing.status === 200, `status ${landing.status}`);
  check("landing page lists the planets (database reachable)", landingHtml.includes("Neptune"));
  check("landing page never shows a fuel or making cost", !/fuel cost|making cost/i.test(landingHtml));

  for (const path of ["/admiral", "/manager", "/captain", "/customer"]) {
    const response = await get(path);
    check(`visitor on ${path} goes to /login`, redirectPath(response) === "/login", `status ${response.status}`);
  }

  const cookies = {};
  for (const { email, home } of ROLES) {
    const session = await signIn(email);
    cookies[email] = session.cookie;
    check(`${email} signs in (database reachable, seed present)`, session.status === 200 && session.cookie !== "", `status ${session.status}`);

    const root = await get("/", session.cookie);
    check(`${email} lands on ${home}`, redirectPath(root) === home, `location ${redirectPath(root)}`);

    const page = await get(home, session.cookie);
    check(`${email} can open ${home}`, page.status === 200, `status ${page.status}`);
  }

  const customer = cookies["customer1@terra.demo"];
  for (const path of ["/admiral", "/manager", "/captain"]) {
    const response = await get(path, customer);
    check(`customer on ${path} is sent home`, redirectPath(response) === "/customer", `status ${response.status}, location ${redirectPath(response)}`);
  }

  const wrong = await signIn("admiral@terra.demo", "not-the-password");
  check("wrong password is refused", wrong.status === 401, `status ${wrong.status}`);

  console.log(failed === 0 ? "\nAll checks passed." : `\n${failed} check(s) failed.`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(`FAIL  ${error.message}`);
  process.exit(1);
});
