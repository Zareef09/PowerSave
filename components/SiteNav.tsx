"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteNav() {
  return (
    <div className="border-b border-hairline">
      <div className="mx-auto flex h-[72px] max-w-content items-center justify-between gap-4 box-border px-6 md:px-10">
        <Link
          href="/"
          className="text-[22px] font-medium tracking-[-0.03em] text-ink no-underline"
        >
          PowerSave
        </Link>
        <nav className="hidden gap-8 text-[15px] md:flex">
          <Link href="/how-it-works" className="text-ink no-underline">
            How it works
          </Link>
          <Link href="/plan" className="text-ink no-underline">
            Plans
          </Link>
          <Link href="/app/grid" className="text-ink no-underline">
            The Grid
          </Link>
        </nav>
        <div className="flex items-center gap-3 md:gap-5">
          <span className="font-mono-label hidden items-center gap-2 text-muted-strong md:flex">
            <span
              className="inline-block h-2 w-2 rounded-full bg-accent"
              style={{ animation: "pspulse 1.6s infinite" }}
              aria-hidden
            />
            [ LIVE · ONTARIO GRID ]
          </span>
          <ThemeToggle />
          <Link
            href="/app"
            className="inline-flex min-h-11 items-center rounded-btn bg-ink px-5 text-base font-medium text-page no-underline"
          >
            Open app
          </Link>
        </div>
      </div>
    </div>
  );
}
