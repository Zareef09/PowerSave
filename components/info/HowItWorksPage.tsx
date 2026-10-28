"use client";

import Link from "next/link";
import { Ribbon, SAMPLE_RIBBON_RATES, SAMPLE_RIBBON_SEASON } from "@/components/Ribbon";
import { SampleDataTag } from "@/components/SampleDataTag";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { formatCost } from "@/lib/format";
import { ratesMonoTag } from "@/lib/format-rates";
import { DEMO_NOW_MIN, adviceForChore, choreCostCents } from "@/lib/pricing";
import { RATE_SET_2026_11_01, rateSetForInstant } from "@/lib/rates";

export function HowItWorksPage() {
  const liveRates = rateSetForInstant(new Date());
  // Worked example uses the design’s golden demo (Nov 18 2026 winter TOU) — Sample data.
  const laundryNow = choreCostCents("TOU", DEMO_NOW_MIN, 3, 90, "weekday");
  const laundryBest = choreCostCents("TOU", 1140, 3, 90, "weekday");
  const dishNow = choreCostCents("TOU", DEMO_NOW_MIN, 1.2, 120, "weekday");
  const laundryAdvice = adviceForChore("TOU", "Laundry", DEMO_NOW_MIN, "weekday");

  return (
    <div className="min-h-screen bg-page text-ink">
      <SiteNav />
      <main id="main-content" className="mx-auto box-border max-w-content px-4 py-12 sm:px-6 md:px-10 md:py-16">
        <div className="font-mono-label flex flex-wrap justify-between gap-2 text-muted">
          <span>/HOW-IT-WORKS</span>
          <span>{ratesMonoTag(liveRates)}</span>
        </div>
        <h1 className="mt-6 max-w-[900px] text-balance text-[40px] font-light leading-none tracking-[-0.03em] sm:text-[48px] md:text-[72px]">
          The maths, <span className="text-muted">in the open.</span>
        </h1>
        <p className="mt-4 max-w-[560px] text-lg text-muted">
          PowerSave picks a start time from your rate plan. Here is exactly how.
        </p>

        <section className="mt-16">
          <div className="font-mono-label text-muted">/01 [ THE METHOD ]</div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                t: "Price every minute",
                p: "We price each minute of the run across the periods it overlaps, then round to the nearest cent.",
              },
              {
                t: "Test every 15 minutes",
                p: "We try start times every 15 minutes over the next 24 hours (within any deadline you set).",
              },
              {
                t: "Cheapest, earliest on ties",
                p: "The cheapest start wins. If two starts cost the same, we pick the earlier one.",
              },
            ].map((c) => (
              <div key={c.t} className="rounded-card border border-hairline bg-surface p-6">
                <div className="text-[22px] font-light tracking-[-0.02em]">{c.t}</div>
                <p className="mt-3 text-base leading-normal text-muted-strong">{c.p}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-mono-label text-muted">/02 [ A WORKED EXAMPLE ]</div>
            <SampleDataTag />
          </div>
          <h2 className="mt-3 text-[28px] font-light tracking-[-0.03em] md:text-[36px]">
            Laundry at 5:30 PM on TOU
          </h2>
          <p className="mt-2 max-w-[640px] text-base text-muted-strong">
            Design example: Wed Nov 18 2026, winter weekday, rates effective Nov 1 2026 (
            {RATE_SET_2026_11_01.cents.tou.on}¢ on-peak · {RATE_SET_2026_11_01.cents.tou.off}¢
            off-peak). 3 kWh over 90 minutes.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-card border border-hairline bg-surface p-5">
              <div className="font-mono-label text-muted-strong">RUN NOW · 5:30 PM</div>
              <div className="mt-3 text-[40px] font-light tabular">{formatCost(laundryNow)}</div>
              <Ribbon
                plan="TOU"
                variant="compact"
                day="weekday"
                season={SAMPLE_RIBBON_SEASON}
                rates={SAMPLE_RIBBON_RATES}
                startMin={DEMO_NOW_MIN}
                nowMin={DEMO_NOW_MIN}
                winStart={DEMO_NOW_MIN}
                winLen={90}
              />
            </div>
            <div className="rounded-card border border-hairline bg-surface p-5">
              <div className="font-mono-label text-muted-strong">START AT 7:00 PM</div>
              <div className="mt-3 text-[40px] font-light tabular">{formatCost(laundryBest)}</div>
              <Ribbon
                plan="TOU"
                variant="compact"
                day="weekday"
                season={SAMPLE_RIBBON_SEASON}
                rates={SAMPLE_RIBBON_RATES}
                startMin={DEMO_NOW_MIN}
                nowMin={DEMO_NOW_MIN}
                winStart={1140}
                winLen={90}
              />
            </div>
          </div>
          {laundryAdvice.hasSave ? (
            <div className="mt-4">
              <span className="inline-flex rounded-full bg-lime px-3.5 py-1.5 text-base font-medium tabular text-ink">
                Save about {laundryAdvice.saveLabel}
              </span>
              <p className="mt-2 text-sm text-muted-strong">
                Round each cost to the cent, then subtract. Electricity cost only.
              </p>
            </div>
          ) : null}
          <div className="mt-6 rounded-card border border-hairline bg-surface p-5">
            <div className="font-medium">Boundary crossing</div>
            <p className="mt-2 text-sm text-muted-strong">
              Dishwasher 1.2 kWh / 2 h from 5:30 PM spans on-peak then off-peak →{" "}
              <b className="text-ink">{formatCost(dishNow)}</b> when run now. Sample data.
            </p>
          </div>
        </section>

        <section className="mt-20">
          <div className="font-mono-label text-muted">/03 [ THE SEARCH ]</div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              {
                t: "Ties",
                p: "Equal cost → earliest start.",
              },
              {
                t: "Deadlines and quiet hours",
                p: "Done-by limits the search. Quiet hours (10 PM–7 AM) only limit when we suggest you press start.",
              },
              {
                t: "When timing doesn’t matter",
                p: "TOU weekends and holidays, and Tiered plans: “Any time. Same price all day.” We never invent a saving.",
              },
              {
                t: "Holidays",
                p: "Ontario TOU/ULO holiday list from the OEB. If a holiday falls on a weekend, the next non-holiday weekday gets holiday prices.",
              },
            ].map((c) => (
              <div key={c.t} className="rounded-card border border-hairline bg-surface p-6">
                <div className="text-[22px] font-light">{c.t}</div>
                <p className="mt-2 text-base text-muted-strong">{c.p}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <div className="font-mono-label text-muted">/04 [ WHAT WE DON&apos;T KNOW ]</div>
          <div className="mt-6 rounded-panel border border-hairline bg-panel p-6 md:p-10">
            <p className="m-0 text-lg leading-normal">
              Estimates are not a bill. We don’t know your appliance’s exact draw, delivery charges,
              regulatory charges, HST, or the Ontario Electricity Rebate.
            </p>
          </div>
        </section>

        <section className="mt-20">
          <div className="font-mono-label text-muted">/05 [ WHOLESALE VS YOUR BILL ]</div>
          <h2 className="mt-3 text-[28px] font-light tracking-[-0.03em]">
            The grid price is not what you pay.
          </h2>
          <p className="mt-3 max-w-[640px] text-base text-muted-strong">
            Advice comes from your rate plan only. Wherever we show the wholesale market price, we
            label it: <b className="text-ink">Wholesale market price. Not what you pay.</b>
          </p>
          <Link href="/app/grid" className="mt-4 inline-flex min-h-11 items-center text-accent">
            Open The Grid →
          </Link>
        </section>

        <section className="mt-20 mb-8">
          <div className="font-mono-label text-muted">/06 [ DATA SOURCES ]</div>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="py-3 pr-4 font-medium">Source</th>
                  <th className="py-3 font-medium">Use</th>
                </tr>
              </thead>
              <tbody className="text-muted-strong">
                <tr className="border-b border-hairline">
                  <td className="py-3 pr-4 text-ink">Ontario Energy Board RPP</td>
                  <td className="py-3">Household rates (reviewed each Nov 1)</td>
                </tr>
                <tr className="border-b border-hairline">
                  <td className="py-3 pr-4 text-ink">IESO public reports</td>
                  <td className="py-3">Wholesale view on The Grid (~5 min)</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 text-ink">OEB holiday schedule</td>
                  <td className="py-3">TOU / ULO holiday pricing days</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-sm text-muted-strong">
            PowerSave is independent. It is not affiliated with the OEB, the IESO or any utility.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
