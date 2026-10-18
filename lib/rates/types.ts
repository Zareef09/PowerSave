/** Shared rate-plan types. */

export type PlanId = "TOU" | "ULO" | "TIERED";

/** Calendar day class for TOU/ULO period lookup. Holidays use weekend-style periods. */
export type DayKind = "weekday" | "weekend" | "holiday";

export type Season = "summer" | "winter";

export type PeriodKey = "ul" | "of" | "md" | "on";

export type RateCents = {
  tou: { off: number; mid: number; on: number };
  ulo: { ultra: number; off: number; mid: number; on: number };
  tiered: { tier1: number; tier2: number };
};

export type RateSet = {
  /** ISO date YYYY-MM-DD when these prices take effect. */
  effective: string;
  /** Human source citation for code comments / UI. */
  source: string;
  /** Whether OEB has officially published these figures. */
  verified: boolean;
  cents: RateCents;
};
