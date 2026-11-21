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
