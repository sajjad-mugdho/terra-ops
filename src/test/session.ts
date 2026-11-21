import { DEMO_PASSWORD } from "@/features/auth/demo-users";

export const requestHeaders = { current: new Headers() };

// Signs in for real and makes the next service calls carry that session cookie.
export async function actAs(email: string, password: string = DEMO_PASSWORD) {
  const { auth } = await import("@/lib/auth");
  const { headers } = await auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
  const cookie = headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  requestHeaders.current = new Headers({ cookie });
}

export function actAsNobody() {
  requestHeaders.current = new Headers();
}

const saved = new Map<string, Headers>();

// Signs in each account once, so tests can switch users without a new sign-in.
export async function signInAll(emails: string[]) {
  for (const email of emails) {
    await actAs(email);
    saved.set(email, requestHeaders.current);
  }
}

// Not async on purpose: parallel calls can each start as a different user.
export function switchTo(email: string) {
  const headers = saved.get(email);
  if (!headers) throw new Error(`${email} is not signed in. Call signInAll first.`);
  requestHeaders.current = headers;
}
