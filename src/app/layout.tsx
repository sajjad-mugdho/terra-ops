import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { THEME_COOKIE } from "@/lib/theme";
import { cn } from "@/lib/utils";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Terra Supply Co.", template: "%s · Terra Supply Co." },
  description: "Orders, trips and reports for every planet.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const dark = (await cookies()).get(THEME_COOKIE)?.value === "dark";
  return (
    <html
      lang="en"
      className={cn(geistSans.variable, geistMono.variable, "h-full antialiased", dark && "dark")}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
