/** Verbatim from https://www.ieso.ca/terms-of-use — do not edit the year. */
export const IESO_COPYRIGHT =
  "Copyright © 2004-2022 Independent Electricity System Operator, all rights reserved. This information is subject to the Terms of Use set out in the IESO’s website (www.ieso.ca)";

export type FreshnessState = "live" | "delayed" | "stale" | "error";

export type WholesaleSeriesPoint = {
  minuteOfDay: number;
  interval: number;
  deliveryHour: number;
  mwH: number;
  centsKwh: number;
};

export type HourAverage = {
  hour: number;
  centsKwh: number | null;
  samples: number;
};

export type AveragesBlock = {
  status: "complete" | "partial" | "missing";
  daysUsed: number;
  daysRequested: number;
  daysFor3?: number;
  daysFor7?: number;
  showDay3: boolean;
  showDay7: boolean;
  showPartialNDay: boolean;
  day3: HourAverage[];
  day7: HourAverage[];
  partialNDay: HourAverage[];
  partialN: number | null;
  label: string;
  note: string | null;
  timedOut?: boolean;
  fromCache?: boolean;
};

export type WholesalePayload = {
  ok: boolean;
  error?: string;
  copyright: string;
  fetchedAt: string;
  deliveryDate?: string;
  deliveryHour?: number;
  lastInterval?: number;
  observationEnd?: string;
  freshness: {
    state: FreshnessState;
    ageSeconds: number | null;
    delayedAfterSeconds?: number;
    staleAfterSeconds?: number;
  };
  latest?: {
    mwH: number;
    centsKwh: number;
    displayCents: number;
    displayMwH: number;
  };
  countdownSeconds?: number;
  series?: WholesaleSeriesPoint[];
  averages?: AveragesBlock;
  budget?: {
    seconds: number;
    timedOut: boolean;
    maxDurationHobbySeconds: number;
  };
};

export const SAMPLE_TEASER = {
  centsKwh: 4.6,
  mwH: 46,
  series: [5.1, 5.5, 5.5, 5.3, 5.3, 5.1, 5.0, 4.9, 4.9, 4.6],
};
