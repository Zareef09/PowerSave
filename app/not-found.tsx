import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-page text-ink">
      <SiteNav />
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-content flex-1 flex-col justify-center gap-6 px-4 py-24 sm:px-6 md:px-10"
      >
        <p className="font-mono-label text-muted">[ 404 ]</p>
        <h1 className="text-[40px] font-light leading-none tracking-[-0.03em] md:text-[56px]">
          Page not found.
        </h1>
        <p className="max-w-md text-lg text-muted">
          That URL is not part of PowerSave. The landing page and The Grid still work without an
          account.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center rounded-btn bg-ink px-6 text-base font-medium text-page no-underline"
          >
            Back to PowerSave
          </Link>
          <Link
            href="/app/grid"
            className="inline-flex min-h-12 items-center rounded-btn border border-ink px-6 text-base font-medium text-ink no-underline"
          >
            Open The Grid
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
