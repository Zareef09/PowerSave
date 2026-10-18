"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  {
    name: "Today",
    href: "/app",
    d: "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z",
  },
  {
    name: "Tomorrow",
    href: "/app/tomorrow",
    d: "M4 7h16v13H4zM4 11h16M8 4v4M16 4v4",
  },
  {
    name: "Grid",
    href: "/app/grid",
    d: "M4 20V12M10 20V5M16 20v-9M22 20H2",
  },
  {
    name: "Settings",
    href: "/app/settings",
    d: "M4 8h10M18 8h2M4 16h2M10 16h10M14 6v4M6 14v4",
  },
] as const;

export function AppChrome({ children, current = "Grid" }: { children: React.ReactNode; current?: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-page text-ink md:flex-row">
      <aside className="hidden w-[248px] shrink-0 flex-col gap-8 border-r border-hairline box-border p-4 md:flex">
        <Link
          href="/"
          className="px-3 text-[22px] font-medium tracking-[-0.03em] text-ink no-underline"
        >
          PowerSave
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => {
            const on = n.name === current;
            return (
              <Link
                key={n.name}
                href={n.href}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-base no-underline ${
                  on ? "bg-ink font-medium text-page" : "text-ink"
                }`}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d={n.d} />
                </svg>
                {n.name}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-2 px-3">
          <ThemeToggle />
          <span className="font-mono-label text-muted-strong">[ GUEST · THIS DEVICE ]</span>
          <Link href="/app/signin" className="text-sm text-accent">
            Save across devices →
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-4 sm:px-6 md:hidden">
          <Link href="/" className="shrink-0 text-xl font-medium tracking-[-0.03em] text-ink no-underline">
            PowerSave
          </Link>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <span className="font-mono-label text-muted-strong">[ GUEST ]</span>
          </div>
        </div>

        {children}

        <nav className="sticky bottom-0 grid grid-cols-4 border-t border-hairline bg-page md:hidden">
          {NAV.map((n) => {
            const on = n.name === current;
            return (
              <Link
                key={n.name}
                href={n.href}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-[60px] flex-col items-center justify-center gap-0.5 no-underline ${
                  on ? "bg-ink text-page" : "text-ink"
                }`}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d={n.d} />
                </svg>
                <span className="text-[11px]">{n.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
