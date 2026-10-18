"use client";

import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex min-h-11 items-center rounded-btn border border-ink px-3 text-sm font-medium text-ink"
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
