import { formatCost, formatTime } from "@/lib/format";
import {
  type DayKind,
  type PlanId,
  priceCentsPerKwh,
} from "@/lib/rates/2026-11-01";

export type ChoreId = "Laundry" | "Dishwasher" | "EV";

export const CHORES: Record<ChoreId, { kwh: number; durationMin: number; label: string }> = {
  Laundry: { kwh: 3, durationMin: 90, label: "Laundry" },
  Dishwasher: { kwh: 1.2, durationMin: 120, label: "Dishwasher" },
  EV: { kwh: 28.8, durationMin: 240, label: "EV charging" },
};

/** Sample demo clock used on Landing / golden checks: Wed Nov 18 2026, 5:30 PM. */
export const DEMO_NOW_MIN = 1050;
export const DEMO_DAY: DayKind = "weekday";

/**
 * Cost of a chore starting at `startMin`, in whole cents.
 * Prices each minute; energy per minute = kWh / duration.
 * Matches Checks.dc.html `cost`.
 */
export function choreCostCents(
  plan: PlanId,
  startMin: number,
  kwh: number,
  durationMin: number,
  day: DayKind = "weekday",
): number {
  let c = 0;
  for (let i = 0; i < durationMin; i++) {
    const m = (startMin + i) % 1440;
    c += priceCentsPerKwh(plan, m, day) * (kwh / durationMin);
  }
  return Math.round(c);
}

export type BestWindow = {
  nowCostCents: number;
  bestStartMin: number;
  bestCostCents: number;
  savingCents: number;
};

/**
 * Search starts every 15 minutes from nowMin through nowMin + 1440 - duration.
 * Cheapest wins; earliest on ties. Matches Checks.dc.html search loop.
 */
export function findBestWindow(
  plan: PlanId,
  nowMin: number,
  kwh: number,
  durationMin: number,
  day: DayKind = "weekday",
): BestWindow {
  const nowCostCents = choreCostCents(plan, nowMin, kwh, durationMin, day);
  let bestStartMin = nowMin;
  let bestCostCents = nowCostCents;

  for (let t = nowMin; t <= nowMin + 1440 - durationMin; t += 15) {
    const c = choreCostCents(plan, t, kwh, durationMin, day);
    if (c < bestCostCents) {
      bestCostCents = c;
      bestStartMin = t;
    }
  }

  return {
    nowCostCents,
    bestStartMin,
    bestCostCents,
    savingCents: nowCostCents - bestCostCents,
  };
}

export type ChoreAdvice = {
  chore: ChoreId;
  label: string;
  spec: string;
  verdict: string;
  hasSave: boolean;
  saveLabel: string;
  nowLabel: string;
  bestLabel: string;
  nowCost: string;
  bestCost: string;
  winStart: number;
  durationMin: number;
};

export function adviceForChore(
  plan: PlanId,
  chore: ChoreId,
  nowMin: number = DEMO_NOW_MIN,
  day: DayKind = DEMO_DAY,
  saveScale: number = 1,
): ChoreAdvice {
  const meta = CHORES[chore];

  if (plan === "TIERED") {
    return {
      chore,
      label: meta.label,
      spec:
        chore === "Laundry"
          ? "3 kWh · 90 min"
          : chore === "Dishwasher"
            ? "1.2 kWh · 2 h"
            : "28.8 kWh · 4 h",
      verdict: "Any time. Same price all day.",
      hasSave: false,
      saveLabel: "",
      nowLabel: "Tier 1",
      bestLabel: "Tier 2",
      nowCost: "11.2¢/kWh",
      bestCost: "13.2¢/kWh",
      winStart: -1,
      durationMin: meta.durationMin,
    };
  }

  const w = findBestWindow(plan, nowMin, meta.kwh, meta.durationMin, day);
  const bestAt = formatTime(w.bestStartMin);
  const scaledSave = Math.round(w.savingCents * saveScale);

  return {
    chore,
    label: meta.label,
    spec:
      chore === "Laundry"
        ? "3 kWh · 90 min"
        : chore === "Dishwasher"
          ? "1.2 kWh · 2 h"
          : "28.8 kWh · 4 h",
    verdict: `Wait until ${bestAt}.`,
    hasSave: scaledSave >= 1,
    saveLabel: formatCost(scaledSave),
    nowLabel: "Now",
    bestLabel: bestAt,
    nowCost: formatCost(w.nowCostCents),
    bestCost: formatCost(w.bestCostCents),
    winStart: w.bestStartMin,
    durationMin: meta.durationMin,
  };
}

export const TIERED_VERDICT = "Any time. Same price all day.";
