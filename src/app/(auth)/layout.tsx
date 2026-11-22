import { Rocket } from "lucide-react";
import Link from "next/link";
import { LiquidNebula } from "@/components/ui/liquid-nebula";
import { redirectIfSignedIn } from "@/features/auth/guards";

// Dark like the landing page a visitor comes from (D67). Form on the left, a moving sky on the right.
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  await redirectIfSignedIn();
  return (
    <div className="landing dark grid flex-1 bg-background text-foreground lg:grid-cols-2">
      <main className="flex flex-col justify-center px-6 py-10">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <Link href="/" className="flex items-center gap-3 self-start rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Rocket className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block text-xl">Terra Supply Co.</span>
              <span className="block text-sm text-muted-foreground">Supplies from Earth to every planet.</span>
            </span>
          </Link>
          {children}
        </div>
      </main>

      <aside className="relative hidden border-l lg:block">
        <div className="sticky top-0 h-svh overflow-hidden">
          <LiquidNebula />
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent p-10 pt-24">
            <p className="font-mono text-sm tracking-[0.1em] uppercase">Earth to every planet</p>
            <p className="mt-4 max-w-md text-[2rem] leading-9 tracking-[-0.019em]">
              Every order has one owner at each step, from Earth to the last stop.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 text-sm text-body">
              <span className="size-2 rounded-full bg-success" />
              All rockets nominal
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
