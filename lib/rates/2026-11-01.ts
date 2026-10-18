/**
 * OEB Regulated Price Plan — prices effective November 1, 2026.
 *
 * Source (verified):
 * - OEB newsroom Oct 16, 2026:
 *   https://www.oeb.ca/newsroom/2026/ontario-energy-board-announces-changes-electricity-prices-households-small-businesses
 * - OEB RPP Price Report Nov 1 2026–Oct 31 2027:
 *   https://www.oeb.ca/sites/default/files/rpp-price-report-20261016.pdf
 *
 * Design golden checks (Checks.dc.html) use these winter weekday rates.
 * ULO hours do not change by season (OEB: same all year).
 */

import type { RateSet } from "@/lib/rates/types";

export const RATE_SET_2026_11_01: RateSet = {
  effective: "2026-11-01",
  source:
    "OEB newsroom 2026-10-16 + RPP Price Report https://www.oeb.ca/sites/default/files/rpp-price-report-20261016.pdf",
  verified: true,
  cents: {
    tou: { off: 9.1, mid: 14.6, on: 18.9 },
    ulo: { ultra: 3.7, off: 9.1, mid: 14.6, on: 37.7 },
    tiered: { tier1: 11.2, tier2: 13.2 },
  },
};

/** @deprecated Prefer RATE_SET_2026_11_01.cents — kept for Landing/golden imports. */
export const TOU = RATE_SET_2026_11_01.cents.tou;
export const ULO = RATE_SET_2026_11_01.cents.ulo;
export const TIERED = RATE_SET_2026_11_01.cents.tiered;
export const RATES_EFFECTIVE = RATE_SET_2026_11_01.effective;
export const RATES_SOURCE = RATE_SET_2026_11_01.source;

export type { DayKind, PeriodKey, PlanId } from "@/lib/rates/types";

import type { DayKind, PeriodKey, PlanId } from "@/lib/rates/types";
import { periodAt as periodAtCore } from "@/lib/rates/period";

/**
 * Back-compat for golden Checks: winter weekday/weekend with Nov 1 2026 rates.
 * Prefer `periodAtInstant` / `priceCentsAt` from `@/lib/rates` for live clocks.
 */
export function periodAt(
  plan: PlanId,
  minuteOfDay: number,
  day: DayKind = "weekday",
): { key: PeriodKey; cents: number } {
  return periodAtCore(plan, minuteOfDay, {
    day: day === "holiday" ? "holiday" : day,
    season: "winter",
    rates: RATE_SET_2026_11_01,
  });
}

export function priceCentsPerKwh(
  plan: PlanId,
  minuteOfDay: number,
  day: DayKind = "weekday",
): number {
  return periodAt(plan, minuteOfDay, day).cents;
}
