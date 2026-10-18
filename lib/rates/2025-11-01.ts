/**
 * OEB Regulated Price Plan — prices set November 1, 2025.
 *
 * Source (current prices page, still in force through October 31, 2026):
 * https://www.oeb.ca/consumer-information-and-protection/electricity-rates
 * Also: OEB RPP Price Report Nov 1 2025–Oct 31 2026
 *   https://oeb.ca/sites/default/files/rpp-price-report-20251017.pdf
 *
 * TOU hours: summer May 1–Oct 31 vs winter Nov 1–Apr 30 (see lib/rates/index.ts).
 * ULO hours do not change by season (OEB: same all year).
 */

import type { RateSet } from "@/lib/rates/types";

export const RATE_SET_2025_11_01: RateSet = {
  effective: "2025-11-01",
  source:
    "OEB Electricity rates (Current prices, Nov 1 2025) + RPP Price Report 2025-10-17",
  verified: true,
  cents: {
    tou: { off: 9.8, mid: 15.7, on: 20.3 },
    ulo: { ultra: 3.9, off: 9.8, mid: 15.7, on: 39.1 },
    tiered: { tier1: 12.0, tier2: 14.2 },
  },
};
