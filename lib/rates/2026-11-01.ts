/**
 * Ontario Energy Board (OEB) Regulated Price Plan rates.
 * Source: OEB RPP, effective November 1, 2026.
 * Keep all rate numbers in this file only — never scatter into components.
 */

export const RATES_EFFECTIVE = "2026-11-01" as const;
export const RATES_SOURCE = "Ontario Energy Board Regulated Price Plan" as const;

/** Cents per kWh */
export const TOU = {
  off: 9.1,
  mid: 14.6,
  on: 18.9,
} as const;

/** Cents per kWh */
export const ULO = {
  ultra: 3.7,
  off: 9.1,
  mid: 14.6,
  on: 37.7,
} as const;

/** Cents per kWh */
export const TIERED = {
  tier1: 11.2,
  tier2: 13.2,
} as const;

export type PlanId = "TOU" | "ULO" | "TIERED";
export type DayKind = "weekday" | "weekend";
export type PeriodKey = "ul" | "of" | "md" | "on";

/**
 * Period schedules (minutes from midnight), ported from Ribbon.dc.html / Checks.dc.html.
 *
 * TOU weekday: off if m < 420 || m >= 1140; mid if 660 ≤ m < 1020; else on.
 * TOU weekend: off all day.
 * ULO weekday: ultra if m >= 1380 || m < 420; on if 960 ≤ m < 1260; else mid.
 * ULO weekend: ultra overnight as above; else off.
 * Tiered: flat (displayed as off-peak band at tier1).
 */
export function periodAt(
  plan: PlanId,
  minuteOfDay: number,
  day: DayKind = "weekday",
): { key: PeriodKey; cents: number } {
  const m = ((Math.round(minuteOfDay) % 1440) + 1440) % 1440;
  const weekend = day === "weekend";

  if (plan === "TIERED") {
    return { key: "of", cents: TIERED.tier1 };
  }

  if (plan === "ULO") {
    if (m >= 1380 || m < 420) return { key: "ul", cents: ULO.ultra };
    if (weekend) return { key: "of", cents: ULO.off };
    if (m >= 960 && m < 1260) return { key: "on", cents: ULO.on };
    return { key: "md", cents: ULO.mid };
  }

  // TOU
  if (weekend) return { key: "of", cents: TOU.off };
  if (m < 420 || m >= 1140) return { key: "of", cents: TOU.off };
  if (m >= 660 && m < 1020) return { key: "md", cents: TOU.mid };
  return { key: "on", cents: TOU.on };
}

/**
 * Price-only function matching Checks.dc.html `mk(plan)` for weekday golden tests.
 * ULO weekday path (no weekend branch) matches Checks exactly.
 */
export function priceCentsPerKwh(
  plan: PlanId,
  minuteOfDay: number,
  day: DayKind = "weekday",
): number {
  return periodAt(plan, minuteOfDay, day).cents;
}
