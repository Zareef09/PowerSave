import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-page text-ink">
      <SiteNav />
      <main className="mx-auto flex w-full max-w-content flex-1 flex-col justify-center gap-6 px-6 py-24 md:px-10">
        <p className="font-mono-label text-muted">[ COMING SOON ]</p>
        <h1 className="text-[40px] font-light leading-none tracking-[-0.03em] md:text-[56px]">
          {title}
          <span className="text-muted"> is on the way.</span>
        </h1>
        <p className="max-w-md text-lg text-muted">
          This page is out of scope for v1. Guest advice on the landing page and The Grid still
          work without an account.
        </p>
        <Link
          href="/"
          className="inline-flex min-h-12 w-fit items-center rounded-btn bg-lime px-6 text-base font-medium text-ink no-underline"
        >
          Back to PowerSave
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
