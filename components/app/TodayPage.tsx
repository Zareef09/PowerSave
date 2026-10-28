"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppChrome } from "@/components/grid/AppChrome";
import { Ribbon } from "@/components/Ribbon";
import { DONE_BY_OPTIONS, deadlineDateFromMin } from "@/lib/deadlines";
import { formatCost, formatTime } from "@/lib/format";
import { planDisplayName, ratesAsOfLabel, ratesMonoTag } from "@/lib/format-rates";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  readFirstVisitDismissed,
  readSetupDone,
  readStoredChores,
  readStoredPlan,
  readStoredQuietHours,
  writeFirstVisitDismissed,
  writeStoredChores,
  writeStoredPlan,
} from "@/lib/guest-storage";
import {
  adviceForChoreAt,
  type ChoreConfig,
} from "@/lib/pricing";
import {
  dayKindForInstant,
  periodAtInstant,
  rateSetForInstant,
  seasonForInstant,
  torontoParts,
  type PlanId,
} from "@/lib/rates";

type UiState = "ready" | "loading" | "empty" | "error" | "offline";

function dateHeading(iso: string, weekday: number): string {
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [, m, d] = iso.split("-");
  return `${names[weekday]}, ${months[Number(m) - 1]} ${Number(d)}`;
}

export function TodayPage() {
  const { email } = useAuth();
  const [plan, setPlan] = useState<PlanId>("TOU");
  const [chores, setChores] = useState<ChoreConfig[]>([]);
  const [quiet, setQuiet] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [ui, setUi] = useState<UiState>("loading");
  const [tick, setTick] = useState(0);
  const [showFirstVisit, setShowFirstVisit] = useState(false);

  useEffect(() => {
    const storedPlan = readStoredPlan();
    if (storedPlan) setPlan(storedPlan);
    setQuiet(readStoredQuietHours());
    const c = readStoredChores();
    setChores(c);
    setNow(new Date());
    setUi(c.filter((x) => x.enabled).length === 0 ? "empty" : "ready");
    setShowFirstVisit(!readSetupDone() && !readFirstVisitDismissed());

    const onOnline = () => setTick((t) => t + 1);
    const onOffline = () => setUi("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", () => {
      onOffline();
    });
    if (typeof navigator !== "undefined" && navigator.onLine === false) setUi("offline");

    const id = window.setInterval(() => {
      setNow(new Date());
      setTick((t) => t + 1);
    }, 60_000);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (ui === "loading") return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setUi("offline");
      return;
    }
    if (chores.filter((c) => c.enabled).length === 0) setUi("empty");
    else if (ui !== "error") setUi("ready");
  }, [chores, ui, tick]);

  const parts = now ? torontoParts(now) : null;
  const rates = now ? rateSetForInstant(now) : null;
  const season = now ? seasonForInstant(now) : "winter";
  const dayKind = now ? dayKindForInstant(now) : "weekday";
  const period = now ? periodAtInstant(plan, now) : null;

  const enabled = useMemo(() => chores.filter((c) => c.enabled), [chores]);

  const onPlan = (next: PlanId) => {
    setPlan(next);
    writeStoredPlan(next);
  };

  const setDeadline = (id: string, deadlineMin: number | null) => {
    const next = chores.map((c) => (c.id === id ? { ...c, deadlineMin } : c));
    setChores(next);
    writeStoredChores(next);
  };

  const ribbonDay = dayKind === "weekday" ? "weekday" : "weekend";

  return (
    <AppChrome current="Today">
      <main
        id="main-content"
        className="mx-auto box-border flex w-full max-w-[1040px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:px-12 md:py-12"
      >
        <div className="flex flex-col gap-3">
          <div className="font-mono-label flex flex-wrap justify-between gap-x-5 gap-y-1.5 text-muted">
            <span>
              [ {plan}
              {season === "winter" ? " · WINTER" : " · SUMMER"}
              {dayKind === "weekend" ? " · WEEKEND" : dayKind === "holiday" ? " · HOLIDAY" : ""}
              {parts ? ` · ${String(Math.floor(parts.minuteOfDay / 60)).padStart(2, "0")}:${String(parts.minuteOfDay % 60).padStart(2, "0")}` : ""}{" "}
              ]
            </span>
            <span>{rates ? ratesMonoTag(rates) : "[ RATES OEB ]"}</span>
          </div>
          <h1 className="m-0 break-words text-[32px] font-light leading-none tracking-[-0.03em] sm:text-[40px] md:text-[56px]">
            Today
            {parts ? (
              <span className="text-muted"> {dateHeading(parts.isoDate, parts.weekday)}</span>
            ) : null}
          </h1>
        </div>

        {showFirstVisit && !email ? (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 rounded-xl border border-hairline bg-surface px-4 py-3.5"
          >
            <span className="text-[15px]">New here? Pick your plan in about 30 seconds.</span>
            <span className="flex flex-wrap gap-2">
              <Link
                href="/start"
                className="inline-flex min-h-11 items-center rounded-btn bg-ink px-[18px] text-base font-medium text-page no-underline"
              >
                Set up
              </Link>
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-btn border border-ink px-[18px] text-base font-medium text-ink"
                onClick={() => {
                  writeFirstVisitDismissed(true);
                  setShowFirstVisit(false);
                }}
              >
                Not now
              </button>
            </span>
          </div>
        ) : email ? (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-hairline bg-surface px-4 py-3.5"
          >
            <span className="font-mono-label break-all text-muted-strong">
              [ SIGNED IN · {email} ]
            </span>
            <Link href="/app/settings" className="text-sm text-accent no-underline">
              Manage →
            </Link>
          </div>
        ) : (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-hairline bg-surface px-4 py-3.5"
          >
            <span className="font-mono-label text-muted-strong">[ GUEST · THIS DEVICE ]</span>
            <Link href="/app/signin" className="text-sm text-accent no-underline">
              Save across devices →
            </Link>
          </div>
        )}

        {ui === "offline" ? (
          <div role="status" className="rounded-xl border border-ink px-4 py-3 text-sm">
            <b className="font-medium">You&apos;re offline.</b> Showing advice from rates stored on
            this device. Advice still comes from your rate plan, not the wholesale market.
          </div>
        ) : null}

        {ui === "error" ? (
          <div role="alert" className="rounded-xl border border-ink px-4 py-3 text-sm">
            <b className="font-medium">Couldn&apos;t load your rates.</b>{" "}
            <button
              type="button"
              className="min-h-11 text-accent underline"
              onClick={() => {
                setUi("ready");
                setNow(new Date());
              }}
            >
              Retry
            </button>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-medium">
                {period
                  ? plan === "TIERED"
                    ? `Tier 1 · ${period.cents}¢ · all day`
                    : `${period.key === "ul" ? "Ultra-low" : period.key === "of" ? "Off-peak" : period.key === "md" ? "Mid-peak" : "On-peak"} · ${period.cents}¢`
                  : "—"}
              </div>
              <div className="mt-1 text-sm text-muted-strong">
                {planDisplayName(plan)}
                {rates ? ` · ${ratesAsOfLabel(rates)}` : ""}
              </div>
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <span className="text-muted-strong">Plan</span>
              <select
                className="min-h-11 rounded-btn border border-hairline bg-page px-3 font-medium"
                value={plan}
                aria-label="Your electricity rate plan"
                onChange={(e) => onPlan(e.target.value as PlanId)}
              >
                <option value="TOU">TOU</option>
                <option value="ULO">ULO</option>
                <option value="TIERED">Tiered</option>
              </select>
            </label>
          </div>
          {!rates?.verified ? (
            <p className="m-0 text-sm text-muted-strong">
              Rates for this date are not yet confirmed by the OEB in this app.
            </p>
          ) : null}
        </div>

        {ui === "loading" || !now ? (
          <div
            role="status"
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
            aria-label="Loading your advice"
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="min-h-[220px] animate-pulse rounded-card border border-hairline bg-surface p-5"
              />
            ))}
          </div>
        ) : null}

        {ui === "empty" ? (
          <div className="rounded-panel border border-dashed border-muted px-6 py-16 text-center">
            <p className="m-0 text-xl font-light">No chores yet.</p>
            <Link
              href="/app/settings"
              className="mt-6 inline-flex min-h-12 items-center rounded-btn bg-ink px-6 font-medium text-page no-underline"
            >
              Add a chore
            </Link>
          </div>
        ) : null}

        {(ui === "ready" || ui === "offline") && now ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {enabled.map((chore) => {
              const deadline = deadlineDateFromMin(now, chore.deadlineMin);
              const advice = adviceForChoreAt(
                plan,
                { label: chore.label, kwh: chore.kwh, durationMin: chore.durationMin },
                now,
                { deadline, quietHours: quiet },
              );
              const spec = `${chore.kwh} kWh · ${
                chore.durationMin >= 60 && chore.durationMin % 60 === 0
                  ? `${chore.durationMin / 60} h`
                  : `${chore.durationMin} min`
              }`;
              return (
                <div
                  key={chore.id}
                  className="flex min-w-0 flex-col gap-3.5 rounded-card border border-hairline bg-surface p-4 sm:p-5"
                >
                  <div>
                    <div className="text-lg font-medium">{chore.label}</div>
                    <div className="font-mono-label mt-1 text-muted-strong">{spec}</div>
                  </div>
                  <div className="text-[26px] font-light leading-[1.05] tracking-[-0.03em] sm:text-[28px]">
                    {advice.verdict}
                  </div>
                  {advice.hasSave ? (
                    <span className="inline-flex w-fit rounded-full bg-lime px-3.5 py-1.5 text-base font-medium tabular text-ink">
                      Save about {advice.saveLabel}
                    </span>
                  ) : null}
                  {advice.sub ? (
                    <p className="m-0 text-sm leading-snug text-muted-strong">{advice.sub}</p>
                  ) : null}
                  {advice.kind === "wait" ? (
                    <div className="flex gap-5 text-sm tabular text-muted-strong">
                      <span>
                        Now <b className="font-medium text-ink">{formatCost(advice.nowCostCents)}</b>
                      </span>
                      <span>
                        {formatTime(advice.winStartMinOfDay)}{" "}
                        <b className="font-medium text-ink">{formatCost(advice.bestCostCents)}</b>
                      </span>
                    </div>
                  ) : null}
                  <Ribbon
                    plan={plan}
                    variant="compact"
                    day={ribbonDay}
                    startMin={parts!.minuteOfDay}
                    nowMin={parts!.minuteOfDay}
                    winStart={advice.winStartMinOfDay}
                    winLen={chore.durationMin}
                  />
                  <label className="flex flex-col gap-1.5 text-[13px] text-muted-strong">
                    Must be done by
                    <select
                      className="min-h-11 rounded-btn border border-hairline bg-page px-3 text-ink"
                      value={chore.deadlineMin ?? ""}
                      aria-label={`Done-by deadline for ${chore.label}`}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDeadline(chore.id, v === "" ? null : Number(v));
                      }}
                    >
                      {DONE_BY_OPTIONS.map((o) => (
                        <option key={o.label} value={o.deadlineMin ?? ""}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Link
                    href={`/app/chore/${chore.id}`}
                    className="text-sm text-accent no-underline"
                  >
                    Open details →
                  </Link>
                </div>
              );
            })}
          </div>
        ) : null}

        <p className="m-0 text-[13px] leading-normal text-muted-strong">
          Estimates cover electricity cost only. Delivery, regulatory charges, HST and the Ontario
          Electricity Rebate are not included.{" "}
          <Link href="/how-it-works" className="text-accent">
            How we calculate →
          </Link>
        </p>
      </main>
    </AppChrome>
  );
}
