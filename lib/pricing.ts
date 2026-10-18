import { formatCost, formatTime } from "@/lib/format";
import {
  addMinutes,
  choreCostCentsAt,
  dayKindForInstant,
  periodAtInstant,
  priceCentsPerKwh,
  torontoDate,
  torontoParts,
  type DayKind,
  type PlanId,
} from "@/lib/rates";
import { RATE_SET_2026_11_01 } from "@/lib/rates/2026-11-01";

export type ChoreId = "Laundry" | "Dishwasher" | "EV";

export type ChoreConfig = {
  id: string;
  label: string;
  kwh: number;
  durationMin: number;
  /** Absolute deadline as minutes from Toronto midnight of the advice “day” (may be >1440). null = none. */
  deadlineMin: number | null;
  enabled: boolean;
};

export const DEFAULT_CHORES: ChoreConfig[] = [
  { id: "laundry", label: "Laundry", kwh: 3, durationMin: 90, deadlineMin: null, enabled: true },
  { id: "dishwasher", label: "Dishwasher", kwh: 1.2, durationMin: 120, deadlineMin: null, enabled: true },
  {
    id: "ev",
    label: "EV charging",
    kwh: 28.8,
    durationMin: 240,
    deadlineMin: null,
    enabled: true,
  },
];

/** Legacy map for golden Checks / Landing sample. */
export const CHORES: Record<ChoreId, { kwh: number; durationMin: number; label: string }> = {
  Laundry: { kwh: 3, durationMin: 90, label: "Laundry" },
  Dishwasher: { kwh: 1.2, durationMin: 120, label: "Dishwasher" },
  EV: { kwh: 28.8, durationMin: 240, label: "EV charging" },
};

/** Sample demo clock used on Landing / golden checks: Wed Nov 18 2026, 5:30 PM. */
export const DEMO_NOW_MIN = 1050;
export const DEMO_DAY: DayKind = "weekday";
export const DEMO_INSTANT = torontoDate(2026, 11, 18, 17, 30);

export const TIERED_VERDICT = "Any time. Same price all day.";

/** Quiet hours: 10 PM–7 AM Toronto (start suggestions only). */
export const QUIET_START_MIN = 1320; // 10 PM
export const QUIET_END_MIN = 420; // 7 AM

export function isQuietMinuteOfDay(minuteOfDay: number): boolean {
  const m = ((Math.round(minuteOfDay) % 1440) + 1440) % 1440;
  return m >= QUIET_START_MIN || m < QUIET_END_MIN;
}

export function formatDeadlineLabel(deadlineMin: number): string {
  return formatTime(deadlineMin);
}

/**
 * Cost of a chore starting at `startMin` on a single day-kind (Checks algorithm).
 * Does not cross into a different day-kind — use `choreCostCentsAt` for live clocks.
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
    // When startMin+i crosses midnight within a single day-kind model, keep same day.
    c += priceCentsPerKwh(plan, m, day === "holiday" ? "weekend" : day) * (kwh / durationMin);
  }
  return Math.round(c);
}

export type BestWindow = {
  nowCostCents: number;
  bestStartMin: number;
  bestCostCents: number;
  savingCents: number;
};

export type SearchOpts = {
  /** Absolute deadline in minutes from the same origin as nowMin (may exceed 1440). */
  deadlineMin?: number | null;
  /** When true, exclude starts that fall in quiet hours. */
  quietHours?: boolean;
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
  opts: SearchOpts = {},
): BestWindow {
  const dayForPrice: DayKind = day === "holiday" ? "weekend" : day;
  const deadline = opts.deadlineMin ?? null;
  const quiet = opts.quietHours === true;

  const nowAsleep = quiet && isQuietMinuteOfDay(nowMin);
  const nowCostCents = nowAsleep
    ? Number.POSITIVE_INFINITY
    : choreCostCents(plan, nowMin, kwh, durationMin, dayForPrice);

  let bestStartMin = nowMin;
  let bestCostCents = nowCostCents;

  const last = nowMin + 1440 - durationMin;
  for (let t = nowMin; t <= last; t += 15) {
    if (deadline != null && t + durationMin > deadline) break;
    if (quiet && isQuietMinuteOfDay(t)) continue;
    const c = choreCostCents(plan, t, kwh, durationMin, dayForPrice);
    if (c < bestCostCents) {
      bestCostCents = c;
      bestStartMin = t;
    }
  }

  // If now was asleep and nothing found, fall back to first eligible
  if (!Number.isFinite(bestCostCents)) {
    bestStartMin = nowMin;
    bestCostCents = choreCostCents(plan, nowMin, kwh, durationMin, dayForPrice);
  }

  const displayNow = choreCostCents(plan, nowMin, kwh, durationMin, dayForPrice);
  return {
    nowCostCents: displayNow,
    bestStartMin,
    bestCostCents,
    savingCents: displayNow - bestCostCents,
  };
}

/** Live-clock search: DST-safe, season/holiday aware. Returns best start as Date. */
export function findBestWindowAt(
  plan: PlanId,
  now: Date,
  kwh: number,
  durationMin: number,
  opts: { deadline?: Date | null; quietHours?: boolean } = {},
): {
  nowCostCents: number;
  bestStart: Date;
  bestCostCents: number;
  savingCents: number;
  cannotMeetDeadline: boolean;
} {
  const quiet = opts.quietHours === true;
  const deadline = opts.deadline ?? null;

  if (deadline && now.getTime() + durationMin * 60_000 > deadline.getTime()) {
    const nowCost = choreCostCentsAt(plan, now, kwh, durationMin);
    return {
      nowCostCents: nowCost,
      bestStart: now,
      bestCostCents: nowCost,
      savingCents: 0,
      cannotMeetDeadline: true,
    };
  }

  const nowAsleep = quiet && isQuietMinuteOfDay(torontoParts(now).minuteOfDay);
  let bestStart = now;
  let bestCost = nowAsleep
    ? Number.POSITIVE_INFINITY
    : choreCostCentsAt(plan, now, kwh, durationMin);

  const lastOffset = 1440 - durationMin;
  for (let offset = 0; offset <= lastOffset; offset += 15) {
    const start = addMinutes(now, offset);
    if (deadline && start.getTime() + durationMin * 60_000 > deadline.getTime()) break;
    if (quiet && isQuietMinuteOfDay(torontoParts(start).minuteOfDay)) continue;
    const c = choreCostCentsAt(plan, start, kwh, durationMin);
    if (c < bestCost) {
      bestCost = c;
      bestStart = start;
    }
  }

  if (!Number.isFinite(bestCost)) {
    bestStart = now;
    bestCost = choreCostCentsAt(plan, now, kwh, durationMin);
  }

  const nowCost = choreCostCentsAt(plan, now, kwh, durationMin);
  return {
    nowCostCents: nowCost,
    bestStart,
    bestCostCents: bestCost,
    savingCents: nowCost - bestCost,
    cannotMeetDeadline: false,
  };
}

export type AdviceKind =
  | "any-time"
  | "run-now"
  | "wait"
  | "cant-meet-deadline"
  | "run-now-deadline";

export type ChoreAdvice = {
  chore: ChoreId;
  label: string;
  spec: string;
  verdict: string;
  sub: string;
  kind: AdviceKind;
  hasSave: boolean;
  saveLabel: string;
  nowLabel: string;
  bestLabel: string;
  nowCost: string;
  bestCost: string;
  winStart: number;
  durationMin: number;
};

function choreSpec(chore: ChoreId): string {
  if (chore === "Laundry") return "3 kWh · 90 min";
  if (chore === "Dishwasher") return "1.2 kWh · 2 h";
  return "28.8 kWh · 4 h";
}

/**
 * Golden / Landing advice (fixed demo day, Nov 1 2026 winter rates via priceCentsPerKwh).
 */
export function adviceForChore(
  plan: PlanId,
  chore: ChoreId,
  nowMin: number = DEMO_NOW_MIN,
  day: DayKind = DEMO_DAY,
  saveScale: number = 1,
  opts: SearchOpts = {},
): ChoreAdvice {
  const meta = CHORES[chore];
  const spec = choreSpec(chore);
  const offFlat = plan === "TIERED" || (plan === "TOU" && (day === "weekend" || day === "holiday"));

  if (offFlat) {
    const rates = RATE_SET_2026_11_01.cents;
    return {
      chore,
      label: meta.label,
      spec,
      verdict: TIERED_VERDICT,
      sub:
        plan === "TIERED"
          ? "Tiered plans charge the same price at every hour."
          : "Weekend or holiday on TOU: off-peak all day.",
      kind: "any-time",
      hasSave: false,
      saveLabel: "",
      nowLabel: plan === "TIERED" ? "Tier 1" : "Off-peak",
      bestLabel: plan === "TIERED" ? "Tier 2" : "All day",
      nowCost:
        plan === "TIERED" ? `${rates.tiered.tier1}¢/kWh` : `${rates.tou.off}¢/kWh`,
      bestCost:
        plan === "TIERED" ? `${rates.tiered.tier2}¢/kWh` : `${rates.tou.off}¢/kWh`,
      winStart: -1,
      durationMin: meta.durationMin,
    };
  }

  const deadline = opts.deadlineMin ?? null;
  if (deadline != null && nowMin + meta.durationMin > deadline) {
    const endMin = nowMin + meta.durationMin;
    return {
      chore,
      label: meta.label,
      spec,
      verdict: `Can't finish by ${formatDeadlineLabel(deadline)}.`,
      sub: `Even starting now, it runs until ${formatTime(endMin)}. Run now to get as close as you can.`,
      kind: "cant-meet-deadline",
      hasSave: false,
      saveLabel: "",
      nowLabel: "Now",
      bestLabel: "Now",
      nowCost: formatCost(choreCostCents(plan, nowMin, meta.kwh, meta.durationMin, day)),
      bestCost: formatCost(choreCostCents(plan, nowMin, meta.kwh, meta.durationMin, day)),
      winStart: nowMin,
      durationMin: meta.durationMin,
    };
  }

  const unconstrained = findBestWindow(plan, nowMin, meta.kwh, meta.durationMin, day, {
    quietHours: opts.quietHours,
  });
  const w = findBestWindow(plan, nowMin, meta.kwh, meta.durationMin, day, opts);
  const scaledSave = Math.round(w.savingCents * saveScale);
  const bestIsNow = w.bestStartMin === nowMin || scaledSave < 1;

  if (bestIsNow) {
    const cheaperOutsideDeadline =
      deadline != null &&
      unconstrained.bestStartMin !== nowMin &&
      unconstrained.savingCents >= 1 &&
      unconstrained.bestStartMin + meta.durationMin > deadline;

    return {
      chore,
      label: meta.label,
      spec,
      verdict: "Run now.",
      sub: cheaperOutsideDeadline
        ? `Can't finish by ${formatDeadlineLabel(deadline)} at a cheaper time, so run now.`
        : "You're already at the cheapest time.",
      kind: cheaperOutsideDeadline ? "run-now-deadline" : "run-now",
      hasSave: false,
      saveLabel: "",
      nowLabel: "Now",
      bestLabel: "Now",
      nowCost: formatCost(w.nowCostCents),
      bestCost: formatCost(w.bestCostCents),
      winStart: nowMin,
      durationMin: meta.durationMin,
    };
  }

  const tomorrow = w.bestStartMin >= 1440;
  const bestAt = formatTime(w.bestStartMin);
  return {
    chore,
    label: meta.label,
    spec,
    verdict: tomorrow ? `Wait until ${bestAt} tomorrow.` : `Wait until ${bestAt}.`,
    sub: tomorrow
      ? "Cheapest window is tomorrow."
      : deadline != null
        ? `Done by ${formatDeadlineLabel(deadline)} at the latest.`
        : meta.durationMin >= 90
          ? `Runs for ${meta.durationMin >= 120 ? `${meta.durationMin / 60} h` : `${meta.durationMin} min`}.`
          : "",
    kind: "wait",
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

export type LiveAdvice = {
  kind: AdviceKind;
  verdict: string;
  sub: string;
  hasSave: boolean;
  saveLabel: string;
  nowCostCents: number;
  bestCostCents: number;
  bestStart: Date;
  winStartMinOfDay: number;
  cannotMeetDeadline: boolean;
  day: DayKind;
  periodLabel: string;
};

export function adviceForChoreAt(
  plan: PlanId,
  chore: { label: string; kwh: number; durationMin: number },
  now: Date,
  opts: { deadline?: Date | null; quietHours?: boolean } = {},
): LiveAdvice {
  const day = dayKindForInstant(now);
  const period = periodAtInstant(plan, now);
  const rates = period.rates.cents;

  if (plan === "TIERED" || (plan === "TOU" && (day === "weekend" || day === "holiday"))) {
    return {
      kind: "any-time",
      verdict: TIERED_VERDICT,
      sub:
        plan === "TIERED"
          ? `Tier 1 ${rates.tiered.tier1}¢, Tier 2 ${rates.tiered.tier2}¢.`
          : "Weekend or holiday on TOU: off-peak all day.",
      hasSave: false,
      saveLabel: "",
      nowCostCents: 0,
      bestCostCents: 0,
      bestStart: now,
      winStartMinOfDay: -1,
      cannotMeetDeadline: false,
      day,
      periodLabel:
        plan === "TIERED"
          ? `Tier 1 · ${rates.tiered.tier1}¢ · all day`
          : `Off-peak · ${rates.tou.off}¢ · all day`,
    };
  }

  const result = findBestWindowAt(plan, now, chore.kwh, chore.durationMin, opts);
  const bestParts = torontoParts(result.bestStart);
  const nowParts = torontoParts(now);

  if (result.cannotMeetDeadline && opts.deadline) {
    const end = addMinutes(now, chore.durationMin);
    const dl = torontoParts(opts.deadline);
    return {
      kind: "cant-meet-deadline",
      verdict: `Can't finish by ${formatTime(dl.minuteOfDay)}.`,
      sub: `Even starting now, it runs until ${formatTime(torontoParts(end).minuteOfDay)}. Run now to get as close as you can.`,
      hasSave: false,
      saveLabel: "",
      nowCostCents: result.nowCostCents,
      bestCostCents: result.bestCostCents,
      bestStart: now,
      winStartMinOfDay: nowParts.minuteOfDay,
      cannotMeetDeadline: true,
      day,
      periodLabel: periodChipLabel(plan, period),
    };
  }

  const save = result.savingCents;
  const bestIsNow =
    Math.abs(result.bestStart.getTime() - now.getTime()) < 60_000 || save < 1;

  if (bestIsNow) {
    let sub = "You're already at the cheapest time.";
    let kind: AdviceKind = "run-now";
    if (opts.deadline) {
      const unconstrained = findBestWindowAt(plan, now, chore.kwh, chore.durationMin, {
        quietHours: opts.quietHours,
      });
      if (
        unconstrained.savingCents >= 1 &&
        unconstrained.bestStart.getTime() + chore.durationMin * 60_000 > opts.deadline.getTime()
      ) {
        const dl = torontoParts(opts.deadline);
        sub = `Can't finish by ${formatTime(dl.minuteOfDay)} at a cheaper time, so run now.`;
        kind = "run-now-deadline";
      }
    }
    return {
      kind,
      verdict: "Run now.",
      sub,
      hasSave: false,
      saveLabel: "",
      nowCostCents: result.nowCostCents,
      bestCostCents: result.bestCostCents,
      bestStart: now,
      winStartMinOfDay: nowParts.minuteOfDay,
      cannotMeetDeadline: false,
      day,
      periodLabel: periodChipLabel(plan, period),
    };
  }

  const bestTomorrow = bestParts.isoDate > nowParts.isoDate;
  const bestLabel = formatTime(bestParts.minuteOfDay);
  return {
    kind: "wait",
    verdict: bestTomorrow ? `Wait until ${bestLabel} tomorrow.` : `Wait until ${bestLabel}.`,
    sub: bestTomorrow
      ? "Cheapest window is tomorrow."
      : opts.deadline
        ? `Done by ${formatTime(torontoParts(opts.deadline).minuteOfDay)} at the latest.`
        : "",
    hasSave: save >= 1,
    saveLabel: formatCost(save),
    nowCostCents: result.nowCostCents,
    bestCostCents: result.bestCostCents,
    bestStart: result.bestStart,
    winStartMinOfDay: bestParts.minuteOfDay,
    cannotMeetDeadline: false,
    day,
    periodLabel: periodChipLabel(plan, period),
  };
}

function periodChipLabel(
  plan: PlanId,
  period: ReturnType<typeof periodAtInstant>,
): string {
  const name =
    period.key === "ul"
      ? "Ultra-low"
      : period.key === "of"
        ? "Off-peak"
        : period.key === "md"
          ? "Mid-peak"
          : "On-peak";
  if (plan === "TIERED") return period.parts ? `Tier 1 · ${period.cents}¢ · all day` : "";
  return `${name} · ${period.cents}¢`;
}
