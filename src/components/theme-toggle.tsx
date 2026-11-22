"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { THEME_COOKIE } from "@/lib/theme";

// The root layout reads the cookie, so the next server render keeps the choice.
function toggleTheme() {
  const dark = document.documentElement.classList.toggle("dark");
  document.cookie = `${THEME_COOKIE}=${dark ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
}

export function ThemeToggle() {
  return (
    <Button type="button" variant="ghost" size="icon-sm" onClick={toggleTheme}>
      <Sun className="hidden dark:block" aria-hidden />
      <Moon className="dark:hidden" aria-hidden />
      <span className="sr-only">Switch between light and dark theme</span>
    </Button>
  );
}
