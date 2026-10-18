/**
 * Rate resolution for live clocks (America/Toronto).
 * Never present a future rate set as “current” before its effective date.
 */

import { RATE_SET_2025_11_01 } from "@/lib/rates/2025-11-01";
import { RATE_SET_2026_11_01 } from "@/lib/rates/2026-11-01";
import { isTouHolidayIso } from "@/lib/rates/holidays";
import { periodAt } from "@/lib/rates/period";
import {
  addMinutes,
  isSummerSeason,
  torontoParts,
  type TorontoParts,
} from "@/lib/rates/toronto";
import type { DayKind, PeriodKey, PlanId, RateSet, Season } from "@/lib/rates/types";

export type { DayKind, PeriodKey, PlanId, RateSet, Season } from "@/lib/rates/types";
export { periodAt } from "@/lib/rates/period";
export {
  RATE_SET_2025_11_01,
  RATE_SET_2026_11_01,
};
export {
  TOU,
  ULO,
  TIERED,
  RATES_EFFECTIVE,
  RATES_SOURCE,
  periodAt as periodAtWinter2026,
  priceCentsPerKwh,
} from "@/lib/rates/2026-11-01";
export { isTouHolidayIso, holidayIsoDatesForTests } from "@/lib/rates/holidays";
export {
  TORONTO_TZ,
  torontoParts,
  torontoDate,
  addMinutes,
  isSummerSeason,
} from "@/lib/rates/toronto";

/** Chronological rate sets (oldest → newest). */
export const RATE_SETS: readonly RateSet[] = [
  RATE_SET_2025_11_01,
  RATE_SET_2026_11_01,
];

/** Pick the latest rate set whose effective date is ≤ the Toronto calendar date. */
export function rateSetForInstant(at: Date): RateSet {
  const { isoDate } = torontoParts(at);
  let chosen: RateSet = RATE_SETS[0]!;
  for (const set of RATE_SETS) {
    if (set.effective <= isoDate) chosen = set;
  }
  return chosen;
}

export function seasonForInstant(at: Date): Season {
  return isSummerSeason(torontoParts(at).isoDate) ? "summer" : "winter";
}

export function dayKindForInstant(at: Date): DayKind {
  const { isoDate, weekday } = torontoParts(at);
  if (isTouHolidayIso(isoDate)) return "holiday";
  if (weekday === 0 || weekday === 6) return "weekend";
  return "weekday";
}

/** True when the active set is verified for this Toronto date. */
export function ratesVerifiedForInstant(at: Date): boolean {
  return rateSetForInstant(at).verified;
}

export function periodAtInstant(
  plan: PlanId,
  at: Date,
): { key: PeriodKey; cents: number; rates: RateSet; day: DayKind; season: Season; parts: TorontoParts } {
  const parts = torontoParts(at);
  const rates = rateSetForInstant(at);
  const day = dayKindForInstant(at);
  const season = seasonForInstant(at);
  const { key, cents } = periodAt(plan, parts.minuteOfDay, { day, season, rates });
  return { key, cents, rates, day, season, parts };
}

export function priceCentsAt(plan: PlanId, at: Date): number {
  return periodAtInstant(plan, at).cents;
}

/** Price each wall-clock minute of a run starting at `start` (DST-safe via UTC deltas). */
export function choreCostCentsAt(
  plan: PlanId,
  start: Date,
  kwh: number,
  durationMin: number,
): number {
  let c = 0;
  const perMin = kwh / durationMin;
  for (let i = 0; i < durationMin; i++) {
    c += priceCentsAt(plan, addMinutes(start, i)) * perMin;
  }
  return Math.round(c);
}
