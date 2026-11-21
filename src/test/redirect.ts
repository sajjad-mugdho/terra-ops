// next/navigation redirect() throws. This returns where it pointed, or null if nothing redirected.
export async function redirectTarget(run: () => Promise<unknown>): Promise<string | null> {
  try {
    await run();
    return null;
  } catch (error) {
    const digest = (error as { digest?: unknown }).digest;
    if (typeof digest !== "string" || !digest.startsWith("NEXT_REDIRECT;")) throw error;
    return digest.split(";")[2];
  }
}
