import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { CONTACT_EMAIL } from "@/lib/contact";

/**
 * Privacy copy must match what the app actually does today.
 * Guest data in localStorage; no accounts; no analytics; no cookies; IESO public data; Vercel logs.
 * Written by AI — needs human review before launch (see docs/PROGRESS.md).
 */
export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-page text-ink">
      <SiteNav />
      <main id="main-content" className="mx-auto box-border max-w-content px-4 py-12 sm:px-6 md:px-10 md:py-16">
        <div className="font-mono-label text-muted">/PRIVACY</div>
        <h1 className="mt-6 text-balance text-[40px] font-light leading-none tracking-[-0.03em] sm:text-[48px] md:text-[72px]">
          Short and <span className="text-muted">plain.</span>
        </h1>
        <p className="mt-4 max-w-[560px] text-lg text-muted">
          PowerSave works without an account. This page describes what the app does today — nothing
          more.
        </p>

        <div className="mt-14 flex flex-col gap-10">
          <section>
            <div className="font-mono-label text-muted-strong">/01 [ GUESTS ]</div>
            <h2 className="mt-2 text-[28px] font-light tracking-[-0.02em]">Only on this device.</h2>
            <p className="mt-3 max-w-[640px] text-base leading-normal text-muted-strong">
              Your plan, chores, quiet hours, units and theme preference stay in this browser&apos;s{" "}
              <b className="font-medium text-ink">localStorage</b>. They do not leave your device to
              a PowerSave database. Clearing site data in your browser removes them. There is no
              account yet.
            </p>
          </section>

          <section>
            <div className="font-mono-label text-muted-strong">/02 [ ACCOUNTS ]</div>
            <h2 className="mt-2 text-[28px] font-light tracking-[-0.02em]">Not available yet.</h2>
            <p className="mt-3 max-w-[640px] text-base leading-normal text-muted-strong">
              Sign-in is listed in the app but is not wired. We do not store email addresses or sync
              settings across devices. When accounts ship, this page will be updated.
            </p>
          </section>

          <section>
            <div className="font-mono-label text-muted-strong">/03 [ TRACKING ]</div>
            <h2 className="mt-2 text-[28px] font-light tracking-[-0.02em]">No analytics. No cookies.</h2>
            <p className="mt-3 max-w-[640px] text-base leading-normal text-muted-strong">
              PowerSave does not run analytics, ads or tracking pixels. We do not set cookies for
              marketing. Theme and guest settings use localStorage only.
            </p>
          </section>

          <section>
            <div className="font-mono-label text-muted-strong">/04 [ GRID DATA ]</div>
            <h2 className="mt-2 text-[28px] font-light tracking-[-0.02em]">IESO public reports.</h2>
            <p className="mt-3 max-w-[640px] text-base leading-normal text-muted-strong">
              The Grid loads wholesale prices from IESO public reports. That data is public. Advice
              on Today still comes from your rate plan, not the wholesale price. Wherever a
              wholesale number appears, we label it: “Wholesale market price. Not what you pay.”
            </p>
          </section>

          <section>
            <div className="font-mono-label text-muted-strong">/05 [ HOSTING ]</div>
            <h2 className="mt-2 text-[28px] font-light tracking-[-0.02em]">Vercel logs.</h2>
            <p className="mt-3 max-w-[640px] text-base leading-normal text-muted-strong">
              The site is hosted on Vercel. Like most hosts, Vercel may keep short-lived request
              logs (for example IP address and URL) for operations and abuse prevention. We do not
              use those logs for advertising.
            </p>
          </section>

          <section>
            <div className="font-mono-label text-muted-strong">/06 [ REPORTS ]</div>
            <h2 className="mt-2 text-[28px] font-light tracking-[-0.02em]">Report a problem.</h2>
            <p className="mt-3 max-w-[640px] text-base leading-normal text-muted-strong">
              The Settings report form opens your email app and sends to{" "}
              <a className="text-accent" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              . Nothing from that form is stored on our servers.
            </p>
          </section>

          <section>
            <div className="font-mono-label text-muted-strong">/07 [ DELETING ]</div>
            <h2 className="mt-2 text-[28px] font-light tracking-[-0.02em]">One button on this device.</h2>
            <p className="mt-3 max-w-[640px] text-base leading-normal text-muted-strong">
              Settings → Delete my data clears guest settings from this browser.{" "}
              <Link href="/app/settings" className="text-accent">
                Open Settings →
              </Link>
            </p>
          </section>

          <div className="rounded-panel border border-hairline bg-panel p-6">
            <p className="m-0 text-base leading-normal">
              PowerSave is independent. It is not affiliated with or endorsed by the Ontario Energy
              Board, the IESO or any utility.
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
