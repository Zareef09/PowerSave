"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Ribbon } from "@/components/Ribbon";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { ratesAsOfLabel, ratesMonoTag } from "@/lib/format-rates";
import {
  RATE_SET_2026_11_01,
  rateSetForInstant,
  seasonForInstant,
  type DayKind,
  type PlanId,
  type RateSet,
  type Season,
} from "@/lib/rates";
import { periodAt } from "@/lib/rates/period";

type DayToggle = "weekday" | "weekend";

function periodRows(plan: PlanId, day: DayKind, season: Season, rates: RateSet) {
  const samples = [0, 480, 720, 1080, 1200, 1320];
  const seen = new Map<string, { key: string; cents: number; label: string }>();
  for (const m of samples) {
    const p = periodAt(plan, m, { day, season, rates });
    const label =
      p.key === "ul"
        ? "Ultra-low"
        : p.key === "of"
          ? "Off-peak"
          : p.key === "md"
            ? "Mid-peak"
            : "On-peak";
    if (plan === "TIERED") {
      seen.set("t1", { key: "of", cents: rates.cents.tiered.tier1, label: "Tier 1" });
      seen.set("t2", { key: "on", cents: rates.cents.tiered.tier2, label: "Tier 2" });
      break;
    }
    if (!seen.has(p.key)) seen.set(p.key, { key: p.key, cents: p.cents, label });
  }
  return [...seen.values()];
}

function PlanColumn({
  plan,
  title,
  long,
  day,
  season,
  rates,
  blurb,
}: {
  plan: PlanId;
  title: string;
  long: string;
  day: DayToggle;
  season: Season;
  rates: RateSet;
  blurb: string;
}) {
  const dayKind: DayKind = day === "weekend" ? "weekend" : "weekday";
  const rows = useMemo(
    () => periodRows(plan, dayKind, season, rates),
    [plan, dayKind, season, rates],
  );
  return (
    <div className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5 md:p-6">
      <div>
        <div className="text-[28px] font-light tracking-[-0.03em]">{title}</div>
        <div className="mt-1 text-sm text-muted-strong">{long}</div>
      </div>
      <Ribbon plan={plan} variant="mini" day={dayKind === "weekday" ? "weekday" : "weekend"} />
      <div className="font-mono-label flex justify-between text-muted-strong">
        <span>12 AM</span>
        <span>12 PM</span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-sm border border-hairline"
                style={{
                  background:
                    r.key === "ul"
                      ? "var(--ul)"
                      : r.key === "of"
                        ? "var(--of)"
                        : r.key === "md"
                          ? "var(--md)"
                          : "var(--on)",
                }}
                aria-hidden
              />
              {r.label}
            </span>
            <span className="tabular font-medium">{r.cents}¢</span>
          </li>
        ))}
      </ul>
      <p className="m-0 text-sm leading-normal text-muted-strong">{blurb}</p>
    </div>
  );
}

export function PlanPage() {
  const [day, setDay] = useState<DayToggle>("weekday");
  const now = new Date();
  const current = rateSetForInstant(now);
  const future = RATE_SET_2026_11_01;
  const showFuture = current.effective < future.effective;

  const currentSeason: Season = seasonForInstant(now);

  return (
    <div className="min-h-screen bg-page text-ink">
      <SiteNav />
      <main id="main-content" className="mx-auto box-border max-w-content px-4 py-12 sm:px-6 md:px-10 md:py-16">
        <div className="font-mono-label flex flex-wrap justify-between gap-2 text-muted">
          <span>/PLAN</span>
          <span>{ratesMonoTag(current)}</span>
        </div>
        <h1 className="mt-6 text-balance text-[40px] font-light leading-none tracking-[-0.03em] sm:text-[48px] md:text-[72px]">
          Which plan <span className="text-muted">am I on?</span>
        </h1>
        <p className="mt-4 max-w-[560px] text-lg text-muted">
          Three Ontario rate plans. Advice always uses the rates in force on the day you ask —
          never future rates as if they were current.
        </p>

        <section className="mt-14">
          <div className="font-mono-label text-muted-strong">
            /01 [ RATES IN FORCE · {ratesAsOfLabel(current).toUpperCase()} ]
          </div>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Day type">
            {(
              [
                ["weekday", "Weekday"],
                ["weekend", "Weekend or holiday"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={day === id}
                className={`min-h-11 rounded-btn border px-4 text-sm ${
                  day === id ? "border-ink bg-ink text-page" : "border-ink text-ink"
                }`}
                onClick={() => setDay(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <PlanColumn
              plan="TOU"
              title="TOU"
              long="Time-of-Use"
              day={day}
              season={currentSeason}
              rates={current}
              blurb={
                currentSeason === "summer"
                  ? "Summer hours (May 1–Oct 31): on-peak midday."
                  : "Winter hours (Nov 1–Apr 30): on-peak mornings and early evenings."
              }
            />
            <PlanColumn
              plan="ULO"
              title="ULO"
              long="Ultra-Low Overnight"
              day={day}
              season={currentSeason}
              rates={current}
              blurb="ULO hours are the same all year. Overnight is lowest."
            />
            <PlanColumn
              plan="TIERED"
              title="Tiered"
              long="Tiered plan"
              day={day}
              season={currentSeason}
              rates={current}
              blurb="Timing doesn’t change your price. We say any time."
            />
          </div>
          <p className="mt-4 text-sm text-muted-strong">
            {day === "weekday"
              ? "Weekday periods shown for the current season."
              : "Weekend and holiday: TOU is off-peak all day; ULO keeps ultra overnight."}
          </p>
        </section>

        {showFuture ? (
          <section className="mt-16">
            <div className="font-mono-label text-muted-strong">
              /01B [ COMING · EFFECTIVE NOV 1 2026 ]
            </div>
            <p className="mt-3 max-w-[640px] text-base text-muted-strong">
              These rates are published by the OEB but are <b className="text-ink">not yet in
              force</b>. PowerSave will switch automatically on Nov 1 2026. Until then, advice uses{" "}
              {ratesAsOfLabel(current)}.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <PlanColumn
                plan="TOU"
                title="TOU"
                long="Time-of-Use"
                day={day}
                season="winter"
                rates={future}
                blurb={`Off ${future.cents.tou.off}¢ · Mid ${future.cents.tou.mid}¢ · On ${future.cents.tou.on}¢`}
              />
              <PlanColumn
                plan="ULO"
                title="ULO"
                long="Ultra-Low Overnight"
                day={day}
                season="winter"
                rates={future}
                blurb={`Ultra ${future.cents.ulo.ultra}¢ · On ${future.cents.ulo.on}¢`}
              />
              <PlanColumn
                plan="TIERED"
                title="Tiered"
                long="Tiered plan"
                day={day}
                season="winter"
                rates={future}
                blurb={`Tier 1 ${future.cents.tiered.tier1}¢ · Tier 2 ${future.cents.tiered.tier2}¢`}
              />
            </div>
          </section>
        ) : null}

        <section className="mt-20">
          <div className="font-mono-label text-muted">/02 [ FIND IT ON YOUR BILL ]</div>
          <div className="mt-6 grid grid-cols-1 items-start gap-8 md:grid-cols-2">
            <div
              className="rounded-card border border-[#d6d5d1] bg-white p-5 text-[#1c1d24]"
              aria-hidden
            >
              <div className="text-sm font-medium">Your electricity bill</div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-[#6b6e76]">Page 2</div>
              <div className="mt-3 rounded border-2 border-[#2548f6] bg-[#dce3ff] px-3 py-2 text-sm">
                Rate plan → Time-of-Use (TOU)
              </div>
              <div className="mt-2 space-y-1 text-xs text-[#6b6e76]">
                <div>On-peak · … kWh</div>
                <div>Mid-peak · … kWh</div>
                <div>Off-peak · … kWh</div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {[
                ["/01", "Open your electricity bill (often page 2)."],
                ["/02", "Find “Rate plan” or “Price plan”."],
                ["/03", "On-, mid- and off-peak usually means TOU."],
              ].map(([n, t]) => (
                <div key={n}>
                  <div className="font-mono-label text-muted-strong">{n}</div>
                  <p className="mt-1 text-base">{t}</p>
                </div>
              ))}
              <p className="m-0 text-sm text-muted-strong">
                Still not sure? Most Ontario homes are on TOU. You can change later in Settings.
              </p>
              <Link
                href="/start"
                className="inline-flex min-h-12 w-fit items-center rounded-btn bg-lime px-6 font-medium text-ink no-underline"
              >
                Set up my plan
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-20 mb-8">
          <div className="font-mono-label text-muted">/03 [ SWITCHING ]</div>
          <p className="mt-4 max-w-[640px] text-base text-muted-strong">
            Changing plans happens with your utility, not PowerSave. We don’t recommend a plan —
            we only show when each hour costs under the plan you pick. Current rates in this app:{" "}
            {ratesAsOfLabel(current)}
            {showFuture ? `. Next published set takes effect Nov 1 2026.` : "."}
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
