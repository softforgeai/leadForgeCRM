"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";

/** Script inlined in <head> so the right theme is applied before first paint. */
export const themeScript = `(function(){try{var t=localStorage.getItem('lf-theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}})()`;

export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("lf-theme", next);
    } catch {
      // Storage unavailable (private mode); the theme still applies for this visit.
    }
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg",
        className,
      )}
    >
      <Sun aria-hidden className="hidden size-4 dark:block" />
      <Moon aria-hidden className="size-4 dark:hidden" />
    </button>
  );
}
