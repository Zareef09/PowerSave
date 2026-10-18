"use client";

import { useEffect, useMemo, useState } from "react";
import { AppChrome } from "@/components/grid/AppChrome";
import { Ribbon } from "@/components/Ribbon";
import { formatCost, formatTime } from "@/lib/format";
import { ratesMonoTag } from "@/lib/format-rates";
import { readStoredChores, readStoredPlan } from "@/lib/guest-storage";
import { type ChoreConfig } from "@/lib/pricing";
import {
  addMinutes,
  choreCostCentsAt,
  dayKindForInstant,
  rateSetForInstant,
  seasonForInstant,
  torontoDate,
  torontoParts,
  type PlanId,
} from "@/lib/rates";

function tomorrowMidnight(now: Date) {
  const p = torontoParts(now);
  const todayStart = torontoDate(p.year, p.month, p.day, 0, 0, 0);
  return addMinutes(todayStart, 1440);
}

function planWindows(
  plan: PlanId,
  chore: ChoreConfig,
  dayStart: Date,
): { when: string; aboutCents: number; saveUpToCents: number; winStart: number } {
  const dayKind = dayKindForInstant(dayStart);
  if (plan === "TIERED" || (plan === "TOU" && (dayKind === "weekend" || dayKind === "holiday"))) {
    const about = choreCostCentsAt(plan, dayStart, chore.kwh, chore.durationMin);
    return {
      when: "Any time tomorrow.",
      aboutCents: about,
      saveUpToCents: 0,
      winStart: -1,
    };
  }

  let best = Number.POSITIVE_INFINITY;
  let bestStart = dayStart;
  let worst = 0;
  for (let m = 0; m <= 1440 - chore.durationMin; m += 15) {
    const start = addMinutes(dayStart, m);
    const c = choreCostCentsAt(plan, start, chore.kwh, chore.durationMin);
    if (c < best) {
      best = c;
      bestStart = start;
    }
    if (c > worst) worst = c;
  }
  const bp = torontoParts(bestStart);
  const when =
    plan === "ULO"
      ? `From ${formatTime(bp.minuteOfDay)}`
      : `Around ${formatTime(bp.minuteOfDay)}`;
  return {
    when,
    aboutCents: best,
    saveUpToCents: Math.max(0, worst - best),
    winStart: bp.minuteOfDay,
  };
}

export function TomorrowPage() {
  const [plan, setPlan] = useState<PlanId>("TOU"); // set from storage
  const [chores, setChores] = useState<ChoreConfig[]>([]);
  const [now, setNow] = useState<Date | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const p = readStoredPlan();
    if (p) setPlan(p);
    setChores(readStoredChores().filter((c) => c.enabled));
    setNow(new Date());
  }, []);

  const dayStart = now ? tomorrowMidnight(now) : null;
  const dayParts = dayStart ? torontoParts(dayStart) : null;
  const rates = now ? rateSetForInstant(addMinutes(now, 24 * 60)) : null;
  const season = dayStart ? seasonForInstant(dayStart) : "winter";
  const dayKind = dayStart ? dayKindForInstant(dayStart) : "weekday";
  const ribbonDay = dayKind === "weekday" ? "weekday" : "weekend";

  const rows = useMemo(() => {
    if (!dayStart) return [];
    return chores.map((c) => ({ chore: c, ...planWindows(plan, c, dayStart) }));
  }, [chores, plan, dayStart]);

  const copyPlan = async () => {
    const lines = rows.map(
      (r) =>
        `${r.chore.label}: ${r.when} · about ${formatCost(r.aboutCents)}` +
        (r.saveUpToCents >= 1 ? ` · save up to ${formatCost(r.saveUpToCents)}` : ""),
    );
    const text = [`PowerSave — tomorrow (${dayParts?.isoDate ?? ""})`, ...lines].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setToast("Plan copied.");
    } catch {
      setToast(text);
    }
    window.setTimeout(() => setToast(null), 3000);
  };

  const anyTime =
    plan === "TIERED" || (plan === "TOU" && (dayKind === "weekend" || dayKind === "holiday"));
  const firstWin = rows.find((r) => r.winStart >= 0)?.winStart ?? -1;

  return (
    <AppChrome current="Tomorrow">
      <main
        id="main-content"
        className="mx-auto box-border flex w-full max-w-[1040px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:px-12 md:py-12"
      >
        <div className="font-mono-label flex flex-wrap justify-between gap-x-5 gap-y-1.5 text-muted">
          <span>
            [ {plan}
            {season === "winter" ? " · WINTER" : " · SUMMER"}
            {dayKind === "weekend" ? " · WEEKEND" : dayKind === "holiday" ? " · HOLIDAY" : ""} ·
            TOMORROW ]
          </span>
          <span>{rates ? ratesMonoTag(rates) : ""}</span>
        </div>
        <h1 className="m-0 text-[32px] font-light tracking-[-0.03em] sm:text-[40px] md:text-[56px]">
          Tomorrow
          {dayParts ? (
            <span className="text-muted">
              {" "}
              {dayParts.isoDate}
            </span>
          ) : null}
        </h1>

        <div className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4 sm:p-6">
          <div className="font-mono-label text-muted-strong">TOMORROW&apos;S PRICE PERIODS</div>
          {dayStart ? (
            <Ribbon
              plan={plan}
              variant="full"
              day={ribbonDay}
              startMin={0}
              nowMin={-1}
              winStart={anyTime ? -1 : firstWin}
              winLen={anyTime ? 0 : 90}
              winLabel={anyTime ? "" : rows[0] ? `${rows[0].chore.label} · from ${formatTime(firstWin)}` : ""}
            />
          ) : null}
        </div>

        {anyTime ? (
          <div className="rounded-card border border-hairline bg-surface p-5">
            <div className="text-[28px] font-light tracking-[-0.03em]">Any time tomorrow.</div>
            <p className="mt-2 text-sm text-muted-strong">
              {plan === "TIERED"
                ? "Tiered plans charge the same price at every hour."
                : "Weekend or holiday on TOU: off-peak all day."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((r) => (
              <div
                key={r.chore.id}
                className="flex flex-col gap-2 rounded-card border border-hairline bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-lg font-medium">{r.chore.label}</div>
                  <div className="font-mono-label text-muted-strong">
                    {r.chore.kwh} kWh · {r.chore.durationMin} min
                  </div>
                  <div className="mt-1 text-base">{r.when}</div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-muted-strong">
                    about <b className="font-medium text-ink">{formatCost(r.aboutCents)}</b>
                  </span>
                  {r.saveUpToCents >= 1 ? (
                    <span className="inline-flex rounded-full bg-lime px-3 py-1 text-sm font-medium tabular text-ink">
                      Save up to {formatCost(r.saveUpToCents)}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
            <p className="m-0 text-[13px] text-muted-strong">
              “Save up to” compares the cheapest window with the most expensive start tomorrow.
              Estimates cover electricity cost only.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => void copyPlan()}
          className="inline-flex min-h-12 w-fit items-center rounded-btn border border-ink px-5 text-base font-medium"
        >
          Copy plan
        </button>
        {toast ? (
          <div role="status" className="whitespace-pre-wrap text-sm text-muted-strong">
            {toast}
          </div>
        ) : null}
      </main>
    </AppChrome>
  );
}
