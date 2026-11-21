import { redirectIfSignedIn } from "@/features/auth/guards";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  await redirectIfSignedIn();
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div>
        <p className="text-xl font-semibold">Terra Supply Co.</p>
        <p className="text-sm text-muted-foreground">Supplies from Earth to every planet.</p>
      </div>
      {children}
    </main>
  );
}
