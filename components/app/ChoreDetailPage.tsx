"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppChrome } from "@/components/grid/AppChrome";
import { Ribbon } from "@/components/Ribbon";
import { DONE_BY_OPTIONS, deadlineDateFromMin } from "@/lib/deadlines";
import { formatCost, formatTime } from "@/lib/format";
import { ratesMonoTag } from "@/lib/format-rates";
import {
  readStoredChores,
  readStoredPlan,
  readStoredQuietHours,
  writeStoredChores,
  writeStoredQuietHours,
} from "@/lib/guest-storage";
import {
  adviceForChoreAt,
  effectiveQuietHours,
  findBestWindowAt,
  type ChoreConfig,
} from "@/lib/pricing";
import {
  addMinutes,
  choreCostCentsAt,
  dayKindForInstant,
  rateSetForInstant,
  seasonForInstant,
  torontoParts,
  type PlanId,
} from "@/lib/rates";

export function ChoreDetailPage({ choreId }: { choreId: string }) {
  const [plan, setPlan] = useState<PlanId>("TOU");
  const [chore, setChore] = useState<ChoreConfig | null>(null);
  const [quiet, setQuiet] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [scrubOffset, setScrubOffset] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const p = readStoredPlan();
    if (p) setPlan(p);
    setQuiet(readStoredQuietHours());
    const list = readStoredChores();
    const found = list.find((c) => c.id === choreId) ?? null;
    setChore(found);
    setNow(new Date());
  }, [choreId]);

  const parts = now ? torontoParts(now) : null;
  const rates = now ? rateSetForInstant(now) : null;
  const season = now ? seasonForInstant(now) : "winter";
  const dayKind = now ? dayKindForInstant(now) : "weekday";
  const ribbonDay = dayKind === "weekday" ? "weekday" : "weekend";

  const advice = useMemo(() => {
    if (!now || !chore) return null;
    return adviceForChoreAt(
      plan,
      { label: chore.label, kwh: chore.kwh, durationMin: chore.durationMin },
      now,
      {
        deadline: deadlineDateFromMin(now, chore.deadlineMin),
        quietHours: effectiveQuietHours(chore, quiet),
      },
    );
  }, [now, chore, plan, quiet]);

  const best = useMemo(() => {
    if (!now || !chore) return null;
    return findBestWindowAt(plan, now, chore.kwh, chore.durationMin, {
      deadline: deadlineDateFromMin(now, chore.deadlineMin),
      quietHours: effectiveQuietHours(chore, quiet),
    });
  }, [now, chore, plan, quiet]);

  const maxOffset = chore ? 1440 - chore.durationMin : 0;
  const scrubStart = now && chore ? addMinutes(now, scrubOffset) : null;
  const scrubCost =
    scrubStart && chore ? choreCostCentsAt(plan, scrubStart, chore.kwh, chore.durationMin) : 0;

  const persist = (next: ChoreConfig) => {
    setChore(next);
    const list = readStoredChores().map((c) => (c.id === next.id ? next : c));
    if (!list.some((c) => c.id === next.id)) list.push(next);
    writeStoredChores(list);
  };

  if (!chore || !now || !advice || !parts) {
    return (
      <AppChrome current="Today">
        <main id="main-content" className="mx-auto max-w-[1040px] flex-1 px-6 py-12">
          <p className="text-muted-strong">Chore not found.</p>
          <Link href="/app" className="text-accent">
            ← Today
          </Link>
        </main>
      </AppChrome>
    );
  }

  const nowCost = advice.nowCostCents;
  const scrubNote =
    scrubCost < nowCost
      ? `Saves ${formatCost(nowCost - scrubCost)} vs starting now.`
      : scrubCost > nowCost
        ? `Costs ${formatCost(scrubCost - nowCost)} more than starting now.`
        : "Same cost as starting now.";

  return (
    <AppChrome current="Today">
      <main
        id="main-content"
        className="mx-auto box-border flex w-full max-w-[1040px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:px-12 md:py-12"
      >
        <Link href="/app" className="inline-flex min-h-11 w-fit items-center text-sm text-accent no-underline">
          ← Today
        </Link>

        <div className="font-mono-label flex flex-wrap justify-between gap-x-5 gap-y-1.5 text-muted">
          <span>
            [ {plan}
            {season === "winter" ? " · WINTER" : " · SUMMER"} ·{" "}
            {String(Math.floor(parts.minuteOfDay / 60)).padStart(2, "0")}:
            {String(parts.minuteOfDay % 60).padStart(2, "0")} · {chore.kwh} kWh · {chore.durationMin}{" "}
            min ]
          </span>
          <span>{rates ? ratesMonoTag(rates) : ""}</span>
        </div>

        <h1 className="m-0 text-[32px] font-light tracking-[-0.03em] sm:text-[40px]">{chore.label}</h1>

        <div className="flex flex-col gap-4 rounded-panel border border-hairline bg-panel p-5 md:p-8">
          <div className="font-mono-label text-muted-strong">THE ANSWER</div>
          <div className="text-[32px] font-light leading-[1.05] tracking-[-0.03em] md:text-[40px]">
            {advice.verdict}
          </div>
          {advice.hasSave ? (
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex rounded-full bg-lime px-3.5 py-1.5 text-base font-medium tabular text-ink">
                Save about {advice.saveLabel}
              </span>
              <span className="text-sm tabular text-muted-strong">
                Now {formatCost(advice.nowCostCents)} · {formatTime(advice.winStartMinOfDay)}{" "}
                {formatCost(advice.bestCostCents)}
              </span>
            </div>
          ) : (
            <p className="m-0 text-sm text-muted-strong">{advice.sub}</p>
          )}
          <Ribbon
            plan={plan}
            variant="full"
            day={ribbonDay}
            season={season}
            rates={rates!}
            startMin={0}
            nowMin={parts.minuteOfDay}
            winStart={advice.winStartMinOfDay}
            winLen={chore.durationMin}
            winLabel={
              advice.winStartMinOfDay >= 0
                ? `Start ${formatTime(advice.winStartMinOfDay)}`
                : ""
            }
          />
          <p className="m-0 text-[13px] text-muted-strong">
            Next 24 hours from {formatTime(parts.minuteOfDay)}
            {parts.isoDate === "2026-11-01"
              ? " · Daylight saving time ends today in Ontario."
              : ""}
            .
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5 md:p-6">
          <div className="text-lg font-medium">Try a different start</div>
          <label className="flex flex-col gap-2 text-sm text-muted-strong">
            Start time (15-minute steps)
            <input
              type="range"
              min={0}
              max={maxOffset}
              step={15}
              value={scrubOffset}
              aria-valuetext={`${formatTime(torontoParts(scrubStart!).minuteOfDay)} · ${formatCost(scrubCost)}`}
              onChange={(e) => setScrubOffset(Number(e.target.value))}
              className="min-h-11 w-full accent-[var(--bl)]"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-11 rounded-btn border border-ink px-3 text-sm"
              onClick={() => setScrubOffset((o) => Math.max(0, o - 15))}
            >
              − 15 min
            </button>
            <button
              type="button"
              className="min-h-11 rounded-btn border border-ink px-3 text-sm"
              onClick={() => setScrubOffset((o) => Math.min(maxOffset, o + 15))}
            >
              + 15 min
            </button>
            <button
              type="button"
              className="min-h-11 rounded-btn border border-ink px-3 text-sm"
              onClick={() => {
                if (!best || !now) return;
                const mins = Math.round((best.bestStart.getTime() - now.getTime()) / 60_000);
                setScrubOffset(Math.max(0, Math.min(maxOffset, Math.round(mins / 15) * 15)));
              }}
            >
              Jump to best
            </button>
          </div>
          <div className="text-[40px] font-light tabular tracking-[-0.04em]">
            {formatCost(scrubCost)}
          </div>
          <p className="m-0 text-sm text-muted-strong">{scrubNote}</p>
        </div>

        <div className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5 md:p-6">
          <div className="text-lg font-medium">Settings for this chore</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm text-muted-strong">
              Energy (kWh)
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={chore.kwh}
                className="min-h-11 rounded-btn border border-hairline bg-page px-3 text-ink"
                onChange={(e) => persist({ ...chore, kwh: Math.max(0.1, Number(e.target.value) || 0.1) })}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-muted-strong">
              Run time (minutes)
              <input
                type="number"
                min={15}
                step={15}
                value={chore.durationMin}
                className="min-h-11 rounded-btn border border-hairline bg-page px-3 text-ink"
                onChange={(e) =>
                  persist({
                    ...chore,
                    durationMin: Math.max(15, Math.round((Number(e.target.value) || 15) / 15) * 15),
                  })
                }
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-muted-strong">
              Must be done by
              <select
                className="min-h-11 rounded-btn border border-hairline bg-page px-3 text-ink"
                value={chore.deadlineMin ?? ""}
                onChange={(e) =>
                  persist({
                    ...chore,
                    deadlineMin: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              >
                {DONE_BY_OPTIONS.map((o) => (
                  <option key={o.label} value={o.deadlineMin ?? ""}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={quiet}
                className="h-5 w-5"
                onChange={(e) => {
                  setQuiet(e.target.checked);
                  writeStoredQuietHours(e.target.checked);
                }}
              />
              Only suggest times when I&apos;m awake (quiet hours 10 PM–7 AM)
            </label>
          </div>
          <p className="m-0 text-[13px] text-muted-strong">
            Quiet hours only limit when we suggest you press start. Delay-start appliances can still
            run overnight.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="text-sm text-muted-strong">Did you follow this?</div>
          <div className="flex flex-wrap gap-2">
            {(["Yes", "No", "Not today"] as const).map((label) => (
              <button
                key={label}
                type="button"
                className="min-h-11 rounded-btn border border-ink px-4 text-sm"
                onClick={() => {
                  setToast(label === "Not today" ? "Okay. Skipped for today." : `Thanks. Logged: ${label}.`);
                  window.setTimeout(() => setToast(null), 2500);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {toast ? (
            <div role="status" className="text-sm text-muted-strong">
              {toast}
            </div>
          ) : null}
        </div>
      </main>
    </AppChrome>
  );
}
