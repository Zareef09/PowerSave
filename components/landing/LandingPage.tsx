"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IesoCopyright } from "@/components/IesoCopyright";
import { Ribbon } from "@/components/Ribbon";
import { SampleDataTag } from "@/components/SampleDataTag";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { formatCost, formatTime } from "@/lib/format";
import { SAMPLE_TEASER } from "@/lib/ieso";
import { readStoredPlan, writeStoredPlan } from "@/lib/plan-storage";
import {
  CHORES,
  DEMO_NOW_MIN,
  adviceForChore,
  choreCostCents,
  type ChoreId,
} from "@/lib/pricing";
import type { PlanId } from "@/lib/rates/2026-11-01";
import { fetchWholesale } from "@/lib/wholesale-client";

const GRID_SAMPLE = SAMPLE_TEASER.series;

const STEPS = [
  {
    i: "/01",
    t: "Pick your plan.",
    p: "TOU, ULO or Tiered. Not sure? We start you on TOU, the default for most Ontario homes.",
    d: "M4 8h10M18 8h2M4 16h2M10 16h10M14 6v4M6 14v4",
  },
  {
    i: "/02",
    t: "Add your chores.",
    p: "Laundry, dishwasher, EV charging, or your own. Edit the kWh and run time to match yours.",
    d: "M5 6h14M5 12h14M5 18h8M18 16v4M16 18h4",
  },
  {
    i: "/03",
    t: "Get the cheapest start.",
    p: "One verdict per chore: run now, or wait until a time. The saving is an estimate.",
    d: "M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z",
  },
] as const;

const PLAN_COLS: { name: string; plan: PlanId; prices: string; line: string }[] = [
  {
    name: "TOU",
    plan: "TOU",
    prices: "9.1¢ · 14.6¢ · 18.9¢",
    line: "Cheap after 7 PM and all weekend. Mornings and early evenings cost the most.",
  },
  {
    name: "ULO",
    plan: "ULO",
    prices: "3.7¢ · 9.1¢ · 14.6¢ · 37.7¢",
    line: "Overnight is 3.7¢. The 4 to 9 PM window is 37.7¢. Built for EVs and delay-start habits.",
  },
  {
    name: "Tiered",
    plan: "TIERED",
    prices: "11.2¢ · 13.2¢ above the monthly tier",
    line: "Timing doesn’t change your price.",
  },
];

const PROOF = [
  "RATES FROM THE OEB",
  "GRID DATA FROM IESO PUBLIC REPORTS",
  "UPDATED EVERY ~5 MIN",
  "NO ACCOUNT NEEDED",
];

const CHORE_ORDER: ChoreId[] = ["Laundry", "Dishwasher", "EV"];

function gx(i: number) {
  return 20 + i * (360 / 9);
}
function gy(v: number) {
  return 110 - ((v - 4.2) / (5.8 - 4.2)) * 90;
}

export function LandingPage() {
  const [plan, setPlan] = useState<PlanId>("TOU");
  const [tick, setTick] = useState(1);
  const [prog, setProg] = useState(1);
  const [teaserLive, setTeaserLive] = useState(false);
  const [teaserCents, setTeaserCents] = useState(SAMPLE_TEASER.centsKwh);
  const [teaserMw, setTeaserMw] = useState(SAMPLE_TEASER.mwH);
  const [teaserSeries, setTeaserSeries] = useState<number[]>(GRID_SAMPLE);
  const [teaserUpdated, setTeaserUpdated] = useState("6:05 PM");

  useEffect(() => {
    const stored = readStoredPlan();
    if (stored) setPlan(stored);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const payload = await fetchWholesale();
      if (cancelled) return;
      if (payload?.ok && payload.latest) {
        setTeaserLive(true);
        setTeaserCents(payload.latest.displayCents);
        setTeaserMw(payload.latest.displayMwH);
        if (payload.series && payload.series.length >= 2) {
          const last = payload.series.slice(-10).map((p) => p.centsKwh);
          setTeaserSeries(last.length ? last : GRID_SAMPLE);
        }
        if (payload.observationEnd) {
          try {
            setTeaserUpdated(
              new Date(payload.observationEnd).toLocaleTimeString("en-CA", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
                timeZone: "America/Toronto",
              }),
            );
          } catch {
            /* keep default */
          }
        }
      } else {
        setTeaserLive(false);
        setTeaserCents(SAMPLE_TEASER.centsKwh);
        setTeaserMw(SAMPLE_TEASER.mwH);
        setTeaserSeries(GRID_SAMPLE);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let reduce = false;
    try {
      reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      /* ignore */
    }
    if (reduce) {
      setTick(1);
      return;
    }
    const t0 = performance.now() + 1100;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.max(0, Math.min(1, (t - t0) / 1300));
      setTick(0.3 + 0.7 * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const el = document.getElementById("psmoment");
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const sc = vh < r.height ? r.height - vh * 0.6 : 1;
      const p = Math.max(0, Math.min(1, (vh * 0.35 - r.top - 100) / Math.max(sc, 1)));
      setProg(p);
    };
    window.addEventListener("scroll", onScroll, true);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);

  const onPlanChange = (next: PlanId) => {
    setPlan(next);
    writeStoredPlan(next);
  };

  const cards = useMemo(
    () => CHORE_ORDER.map((c) => adviceForChore(plan, c, DEMO_NOW_MIN, "weekday", tick)),
    [plan, tick],
  );

  const heroWin = plan === "TIERED" ? -1 : cards[0]?.winStart ?? -1;
  const heroWinLabel =
    plan === "TIERED" ? "" : plan === "ULO" ? "Laundry · 11:00 PM" : "Laundry · 7:00 PM";

  const mStart = Math.round((1050 + 90 * prog) / 15) * 15;
  const mCostC = choreCostCents("TOU", mStart, CHORES.Laundry.kwh, CHORES.Laundry.durationMin);
  const mSaveC = 57 - mCostC;

  const lines = [
    ["Same ", "laundry."],
    ["Same ", "dishes."],
    ["Smaller ", "bill."],
  ] as const;

  const teaserPts = teaserSeries;
  const gpts = teaserPts.map((v, i) => `${gx(i).toFixed(0)},${gy(v).toFixed(0)}`).join(" ");
  const lastTeaser = teaserPts[teaserPts.length - 1] ?? teaserCents;
  const planName = plan === "TIERED" ? "TIERED" : plan;

  return (
    <div className="min-h-screen bg-page text-ink">
      <SiteNav />

      {/* hero */}
      <div className="mx-auto box-border max-w-content px-6 pt-12 md:px-10 md:pt-24">
        <div className="font-mono-label flex flex-wrap justify-between gap-x-6 gap-y-2 text-muted">
          <span>/00 [ TOU · WINTER · 17:30 ]</span>
          <span>[ RATES OEB · NOV 1 2026 ]</span>
        </div>
        <h1 className="mb-5 mt-8 max-w-[1000px] text-balance text-[48px] font-light leading-none tracking-[-0.03em] md:mt-14 md:text-[88px]">
          <span className="text-muted">Run it when </span>it’s cheap.
        </h1>
        <p className="m-0 max-w-[640px] text-lg leading-snug text-muted md:text-xl">
          PowerSave reads your Ontario rate plan and tells you exactly when to start the laundry,
          the dishwasher or the EV.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <label className="flex min-h-12 items-center gap-2.5 rounded-btn border border-hairline bg-surface py-0 pl-4 pr-1.5 text-base">
            <span className="text-muted">Your plan:</span>
            <select
              value={plan}
              onChange={(e) => onPlanChange(e.target.value as PlanId)}
              className="min-h-11 cursor-pointer border-0 bg-transparent font-medium text-ink"
              aria-label="Your electricity rate plan"
            >
              <option value="TOU">TOU</option>
              <option value="ULO">ULO</option>
              <option value="TIERED">Tiered</option>
            </select>
          </label>
          <Link
            href="/start"
            className="inline-flex min-h-12 items-center rounded-btn bg-lime px-6 text-base font-medium text-ink no-underline"
          >
            Find my cheapest time
          </Link>
        </div>

        <div
          className="mt-10 flex flex-col gap-4 rounded-panel border border-hairline p-4 md:mt-[72px] md:gap-6 md:p-10"
          style={{
            backgroundColor: "var(--pn)",
            backgroundImage: "radial-gradient(var(--dot) 1px, transparent 1.3px)",
            backgroundSize: "16px 16px",
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <span className="font-mono-label text-muted-strong">
              [ {planName} · WED NOV 18 · 17:30 ]
            </span>
            <SampleDataTag />
          </div>
          <div className="rounded-card border border-hairline bg-surface p-3 md:p-6">
            <Ribbon
              plan={plan}
              variant="hero"
              startMin={0}
              nowMin={DEMO_NOW_MIN}
              winStart={heroWin}
              winLen={90}
              winLabel={heroWinLabel}
              animate
            />
          </div>
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
            {cards.map((c, i) => (
              <div
                key={c.chore}
                className={`flex min-w-0 flex-col gap-3.5 rounded-card border border-hairline bg-surface p-5 ${
                  i === 1 ? "md:mt-7" : i === 2 ? "md:mt-2" : ""
                }`}
                style={{
                  animation: "psrise .5s ease-out both",
                  animationDelay: `${1.0 + i * 0.15}s`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-lg font-medium">{c.label}</div>
                    <div className="font-mono-label mt-1 text-muted-strong">{c.spec}</div>
                  </div>
                  <SampleDataTag />
                </div>
                <div className="text-[28px] font-light leading-[1.05] tracking-[-0.03em]">
                  {c.verdict}
                </div>
                {c.hasSave ? (
                  <div>
                    <span className="inline-block rounded-full bg-lime px-3.5 py-1.5 text-base font-medium tabular text-ink">
                      Save about {c.saveLabel}
                    </span>
                  </div>
                ) : null}
                <div className="flex gap-5 text-sm tabular text-muted-strong">
                  <span>
                    {c.nowLabel}{" "}
                    <b className="font-medium text-ink">{c.nowCost}</b>
                  </span>
                  <span>
                    {c.bestLabel}{" "}
                    <b className="font-medium text-ink">{c.bestCost}</b>
                  </span>
                </div>
                <Ribbon
                  plan={plan}
                  variant="compact"
                  startMin={DEMO_NOW_MIN}
                  nowMin={DEMO_NOW_MIN}
                  winStart={c.winStart}
                  winLen={c.durationMin}
                />
              </div>
            ))}
          </div>
          <div className="text-[13px] leading-normal text-muted-strong">
            Estimates cover electricity cost only. Delivery, regulatory charges, HST and the Ontario
            Electricity Rebate are not included.{" "}
            <Link href="/how-it-works" className="text-accent">
              How we calculate →
            </Link>
          </div>
        </div>
      </div>

      {/* proof strip */}
      <div className="mt-24 border-y border-hairline md:mt-40">
        <div className="mx-auto grid max-w-content grid-cols-2 md:grid-cols-4">
          {PROOF.map((t, i) => (
            <div
              key={t}
              className={`font-mono-label px-4 py-6 text-muted-strong md:px-6 ${
                i % 2 === 0 ? "border-r border-hairline" : ""
              } ${i < 2 ? "border-b border-hairline md:border-b-0" : ""} ${
                i < 3 ? "md:border-r md:border-hairline" : ""
              }`}
            >
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* scroll moment */}
      <div id="psmoment" className="mx-auto box-border max-w-content px-6 pt-24 md:px-10 md:pt-40">
        <div className="font-mono-label text-muted">/01 [ ONE LOAD · TWO START TIMES ]</div>
        <div className="mt-8 flex flex-col items-start gap-8 md:flex-row md:gap-16">
          <div className="order-2 min-w-0 flex-1 md:order-1">
            {lines.map(([a, b], i) => (
              <div key={b} className="flex min-h-[220px] items-center md:min-h-[440px]">
                <div
                  className="text-[48px] font-light leading-none tracking-[-0.03em] transition-opacity duration-250 md:text-[88px]"
                  style={{ opacity: prog >= i * 0.3 - 0.01 ? 1 : 0.25 }}
                >
                  <span className="text-muted">{a}</span>
                  {b}
                </div>
              </div>
            ))}
          </div>
          <div className="sticky top-2 order-1 w-full min-w-0 self-start md:top-[120px] md:order-2 md:flex-1">
            <div className="flex flex-col gap-5 rounded-panel border border-hairline bg-surface p-5 md:p-8">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-mono-label text-muted-strong">
                  [ LAUNDRY · 3 kWh · 90 MIN ]
                </span>
                <SampleDataTag />
              </div>
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
                <span className="text-[72px] font-light leading-none tracking-[-0.04em] tabular md:text-[112px]">
                  {formatCost(mCostC)}
                </span>
                <span className="font-mono-label text-muted-strong">
                  Start {formatTime(mStart)}
                </span>
              </div>
              <Ribbon
                plan="TOU"
                variant="full"
                startMin={0}
                nowMin={DEMO_NOW_MIN}
                winStart={mStart}
                winLen={90}
                winLabel={`Start ${formatTime(mStart)}`}
              />
              <div className="min-h-10">
                {mSaveC >= 1 ? (
                  <span className="inline-block rounded-full bg-lime px-3.5 py-1.5 text-base font-medium tabular text-ink">
                    Save about {formatCost(mSaveC)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* how it works */}
      <div className="mx-auto box-border max-w-content px-6 pt-24 md:px-10 md:pt-40">
        <div className="font-mono-label text-muted">/02 [ HOW IT WORKS ]</div>
        <h2 className="mt-3 text-[32px] font-light leading-[1.05] tracking-[-0.03em] md:text-[40px]">
          Three steps. <span className="text-muted">No account.</span>
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((st) => (
            <div
              key={st.i}
              className="flex min-h-[260px] flex-col justify-between gap-14 rounded-card border border-hairline bg-surface px-6 py-7"
            >
              <div className="flex items-start justify-between">
                <span className="font-mono-label text-muted-strong">{st.i}</span>
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--bl)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d={st.d} />
                </svg>
              </div>
              <div>
                <div className="text-[28px] font-light leading-[1.05] tracking-[-0.03em]">
                  {st.t}
                </div>
                <p className="mt-2.5 text-base leading-normal text-muted">{st.p}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* plans */}
      <div className="mx-auto box-border max-w-content px-6 pt-24 md:px-10 md:pt-40">
        <div className="rounded-panel border border-hairline bg-panel p-4 md:p-10">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <div>
              <div className="font-mono-label text-muted-strong">
                /03 [ PLANS · RATES OEB · NOV 1 2026 ]
              </div>
              <h2 className="mt-3 text-[32px] font-light leading-[1.05] tracking-[-0.03em] md:text-[40px]">
                Your plan <span className="text-muted-strong">sets the answer.</span>
              </h2>
            </div>
            <Link href="/plan" className="text-base text-accent">
              Which plan am I on? →
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {PLAN_COLS.map((pc) => (
              <div
                key={pc.plan}
                className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-6"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-[28px] font-light tracking-[-0.03em]">{pc.name}</span>
                  <span className="font-mono-label text-muted-strong">WEEKDAY</span>
                </div>
                <Ribbon plan={pc.plan} variant="mini" startMin={0} nowMin={-1} winStart={-1} />
                <div className="font-mono-label text-muted-strong">{pc.prices}</div>
                <p className="m-0 text-base leading-normal">{pc.line}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* grid teaser */}
      <div className="mx-auto box-border max-w-content px-6 pt-24 md:px-10 md:pt-40">
        <div className="font-mono-label text-muted">/04 [ THE GRID ]</div>
        <div className="mt-6 grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-16">
          <div>
            <h2 className="text-[32px] font-light leading-[1.05] tracking-[-0.03em] md:text-[40px]">
              Ontario&apos;s grid, <span className="text-muted">live.</span>
            </h2>
            <p className="mb-6 mt-4 max-w-[460px] text-lg leading-normal text-muted">
              The wholesale price shows when the system is under stress. Your bill still uses your
              plan&apos;s fixed prices.
            </p>
            <Link
              href="/app/grid"
              className="inline-flex min-h-11 items-center rounded-btn border border-ink px-5 text-base font-medium text-ink no-underline"
            >
              Open The Grid
            </Link>
          </div>
          <div
            className="rounded-panel border border-hairline bg-surface p-5 md:p-8"
            style={{
              backgroundImage:
                "linear-gradient(var(--hl) 1px, transparent 1px), linear-gradient(90deg, var(--hl) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
              backgroundPosition: "-1px -1px",
            }}
          >
            <div className="flex flex-col gap-3 bg-surface py-1">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-mono-label rounded-btn border border-hairline bg-surface px-2 py-1 text-muted-strong">
                  [ WHOLESALE · NOT YOUR BILL ]
                </span>
                {!teaserLive ? <SampleDataTag className="bg-surface" /> : null}
              </div>
              <div className="text-sm font-medium">
                Wholesale market price. Not what you pay.
              </div>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
                <span className="text-[56px] font-light leading-none tracking-[-0.04em] tabular">
                  {teaserCents.toFixed(1)}¢
                </span>
                <span className="font-mono-label text-muted-strong">
                  /kWh equivalent · ${teaserMw}/MWh
                </span>
              </div>
              <svg
                viewBox="0 0 400 130"
                className="block h-auto w-full bg-surface"
                role="img"
                aria-label={
                  teaserLive
                    ? "Wholesale price over recent five-minute readings"
                    : "Sample wholesale price over the last ten five-minute readings"
                }
              >
                <line x1="0" y1="110" x2="400" y2="110" stroke="var(--hl)" />
                <polyline points={gpts} fill="none" stroke="var(--bl)" strokeWidth="2.5" />
                <circle
                  cx={gx(Math.max(0, teaserPts.length - 1))}
                  cy={gy(lastTeaser)}
                  r="5"
                  fill="var(--bl)"
                />
              </svg>
              <div className="font-mono-label flex flex-wrap justify-between gap-1.5 text-muted-strong">
                <span>Last updated {teaserUpdated}</span>
                <span>{teaserLive ? "Live from IESO" : "Sample data"}</span>
              </div>
              {teaserLive ? <IesoCopyright /> : null}
            </div>
          </div>
        </div>
      </div>

      {/* method */}
      <div className="mx-auto box-border max-w-content px-6 pt-24 md:px-10 md:pt-40">
        <div className="font-mono-label text-muted">/05 [ THE METHOD ]</div>
        <div className="mt-6 flex flex-col gap-8 rounded-panel border border-hairline bg-surface p-6 md:p-14">
          <div className="text-balance text-[26px] font-light leading-[1.1] tracking-[-0.03em] md:text-[40px]">
            <span className="text-muted">“</span>3 kWh × 90 min, priced minute by minute across the
            periods it overlaps.{" "}
            <span className="text-muted">Start times tested every 15 minutes.”</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono-label text-muted-strong">
              [ NO TESTIMONIALS. JUST THE MATHS. ]
            </span>
            <Link href="/how-it-works" className="text-base text-accent">
              How it works →
            </Link>
          </div>
        </div>
      </div>

      {/* final cta */}
      <div className="mt-24 border-t border-hairline md:mt-40">
        <div className="mx-auto flex max-w-content flex-col items-start gap-10 box-border px-6 py-24 md:px-10 md:py-40">
          <h2 className="m-0 text-balance text-[48px] font-light leading-none tracking-[-0.03em] md:text-[88px]">
            <span className="text-muted">Know when to </span>press start.
          </h2>
          <Link
            href="/start"
            className="inline-flex min-h-12 items-center rounded-btn bg-lime px-6 text-base font-medium text-ink no-underline"
          >
            Find my cheapest time
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
