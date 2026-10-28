import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { CONTACT_EMAIL } from "@/lib/contact";

/**
 * Privacy copy must match what the app actually does.
 * Guests: localStorage only. Signed-in: email + settings in Supabase.
 * Written for Session 7 — human review before launch (see docs/PROGRESS.md).
 */
export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-page text-ink">
      <SiteNav />
      <main id="main-content" className="mx-auto box-border max-w-content px-4 py-12 sm:px-6 md:px-10 md:py-16">
        <div className="font-mono-label flex flex-wrap justify-between gap-2 text-muted">
          <span>/PRIVACY</span>
          <span>[ CONFIRM BEFORE LAUNCH ]</span>
        </div>
        <h1 className="mt-6 text-balance text-[40px] font-light leading-none tracking-[-0.03em] sm:text-[48px] md:text-[72px]">
          Short and <span className="text-muted">plain.</span>
        </h1>
        <p className="mt-4 max-w-[560px] text-lg text-muted">
          PowerSave works without an account. Here is what is kept, and where.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2">
          <section className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-6">
            <div className="font-mono-label text-muted-strong">/01 [ GUESTS ]</div>
            <h2 className="m-0 text-[28px] font-light tracking-[-0.02em]">Only on this device.</h2>
            <p className="m-0 text-base leading-normal text-muted-strong">
              Your plan, chores and preferences stay in this browser&apos;s localStorage. They do
              not leave your device to a PowerSave database. Clear site data and they&apos;re gone.
            </p>
          </section>

          <section className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-6">
            <div className="font-mono-label text-muted-strong">/02 [ SIGNED-IN ]</div>
            <h2 className="m-0 text-[28px] font-light tracking-[-0.02em]">Email, plan and chores.</h2>
            <p className="m-0 text-base leading-normal text-muted-strong">
              If you choose to sign in with a magic link, we store your email address, plan, chores,
              quiet hours, units and theme so they follow you across devices. That&apos;s all. Auth
              is handled by Supabase.
            </p>
          </section>

          <section className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-6">
            <div className="font-mono-label text-muted-strong">/03 [ SELLING ]</div>
            <h2 className="m-0 text-[28px] font-light tracking-[-0.02em]">We don&apos;t sell your data.</h2>
            <p className="m-0 text-base leading-normal text-muted-strong">
              Not your email, not your plan, not your chores. There are no ads in PowerSave. No
              analytics pixels, no marketing cookies.
            </p>
          </section>

          <section className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-6">
            <div className="font-mono-label text-muted-strong">/04 [ DELETING ]</div>
            <h2 className="m-0 text-[28px] font-light tracking-[-0.02em]">One button.</h2>
            <p className="m-0 text-base leading-normal text-muted-strong">
              Settings → Delete my data clears what&apos;s on this device and, if you signed in,
              your synced settings and account.
            </p>
            <Link
              href="/app/settings"
              className="inline-flex min-h-11 w-fit items-center rounded-btn border border-ink px-5 text-sm font-medium text-ink no-underline"
            >
              Open Settings
            </Link>
          </section>
        </div>

        <div className="mt-4 flex flex-col gap-6">
          <section className="rounded-card border border-hairline bg-surface p-6">
            <div className="font-mono-label text-muted-strong">/05 [ GRID DATA ]</div>
            <h2 className="mt-2 text-[22px] font-light tracking-[-0.02em]">IESO public reports.</h2>
            <p className="mt-2 max-w-[720px] text-base leading-normal text-muted-strong">
              The Grid loads wholesale prices from IESO public reports. Advice on Today still comes
              from your rate plan, not the wholesale price. Wherever a wholesale number appears, we
              label it: “Wholesale market price. Not what you pay.”
            </p>
          </section>

          <section className="rounded-card border border-hairline bg-surface p-6">
            <div className="font-mono-label text-muted-strong">/06 [ HOSTING ]</div>
            <h2 className="mt-2 text-[22px] font-light tracking-[-0.02em]">Vercel + Supabase.</h2>
            <p className="mt-2 max-w-[720px] text-base leading-normal text-muted-strong">
              The site is hosted on Vercel (short-lived request logs for operations). Optional
              accounts and synced settings use a dedicated Supabase project. Report a problem opens
              your email app to{" "}
              <a className="text-accent" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              — nothing from that form is stored on our servers.
            </p>
          </section>
        </div>

        <div className="mt-6 rounded-panel border border-hairline bg-panel p-6">
          <p className="m-0 text-base leading-normal">
            <b className="font-medium">Independent.</b> PowerSave is not affiliated with or endorsed
            by the Ontario Energy Board, the IESO or any utility. Questions about this page: use
            “Report a wrong rate or bug” in Settings.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
