"use client";

import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-btn border border-ink px-3 text-sm font-medium text-ink"
    >
      {dark ? "Light" : "Dark"}
    </button>
  );
}
