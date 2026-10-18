import type { DayKind, PeriodKey, PlanId, RateSet, Season } from "@/lib/rates/types";

export type PeriodOpts = {
  day: DayKind;
  season: Season;
  rates: RateSet;
};

/**
 * Period + ¢/kWh for a minute-of-day.
 * TOU summer vs winter hours differ; ULO hours are year-round (OEB).
 * Weekend and holiday use off-peak all day for TOU; ULO keeps ultra overnight.
 */
export function periodAt(
  plan: PlanId,
  minuteOfDay: number,
  opts: PeriodOpts,
): { key: PeriodKey; cents: number } {
  const m = ((Math.round(minuteOfDay) % 1440) + 1440) % 1440;
  const { day, season, rates } = opts;
  const offDay = day === "weekend" || day === "holiday";
  const { tou, ulo, tiered } = rates.cents;

  if (plan === "TIERED") {
    return { key: "of", cents: tiered.tier1 };
  }

  if (plan === "ULO") {
    // Year-round: ultra 11 PM–7 AM; weekend/holiday off 7 AM–11 PM; else mid/on.
    if (m >= 1380 || m < 420) return { key: "ul", cents: ulo.ultra };
    if (offDay) return { key: "of", cents: ulo.off };
    if (m >= 960 && m < 1260) return { key: "on", cents: ulo.on };
    return { key: "md", cents: ulo.mid };
  }

  // TOU
  if (offDay) return { key: "of", cents: tou.off };
  // Off-peak weekdays: before 7 AM or from 7 PM (both seasons).
  if (m < 420 || m >= 1140) return { key: "of", cents: tou.off };

  if (season === "summer") {
    // Summer: on-peak 11 AM–5 PM; mid 7–11 AM and 5–7 PM.
    if (m >= 660 && m < 1020) return { key: "on", cents: tou.on };
    return { key: "md", cents: tou.mid };
  }

  // Winter: mid 11 AM–5 PM; on 7–11 AM and 5–7 PM (design / Checks).
  if (m >= 660 && m < 1020) return { key: "md", cents: tou.mid };
  return { key: "on", cents: tou.on };
}
