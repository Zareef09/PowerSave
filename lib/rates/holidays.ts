/**
 * Ontario TOU / ULO holiday pricing days.
 *
 * Official 2026 list (and weekend-observation rule):
 * https://oeb.ca/consumer-information-and-protection/electricity-rates/holiday-schedule-time-use-and-ultra-low
 *
 * OEB rule: if a holiday falls on a weekend, the next weekday that is not also a
 * holiday has holiday prices in effect all day.
 *
 * 2027 dates below are DERIVED from the same named holidays + that rule — not an
 * OEB-published 2027 table (none available when this was written). After 2027,
 * only weekday/weekend applies until the table is updated (see docs/PROGRESS.md).
 */

/** YYYY-MM-DD in America/Toronto calendar dates that get holiday TOU/ULO pricing. */
const HOLIDAY_PRICING_DAYS: ReadonlySet<string> = new Set([
  // --- 2026: official OEB schedule ---
  "2026-01-01", // New Year’s Day
  "2026-02-16", // Family Day
  "2026-04-03", // Good Friday
  "2026-05-18", // Victoria Day
  "2026-07-01", // Canada Day
  "2026-08-03", // Civic Holiday
  "2026-09-07", // Labour Day
  "2026-10-12", // Thanksgiving Day
  "2026-12-25", // Christmas Day
  "2026-12-28", // Boxing Day (Dec 26 Sat → observed Mon Dec 28)

  // --- 2027: DERIVED (same names + OEB weekend rule) — not OEB-published ---
  "2027-01-01", // New Year’s Day (Fri)
  "2027-02-15", // Family Day (3rd Monday Feb)
  "2027-03-26", // Good Friday
  "2027-05-24", // Victoria Day (Monday before May 25)
  "2027-07-01", // Canada Day (Thu)
  "2027-08-02", // Civic Holiday (1st Monday Aug)
  "2027-09-06", // Labour Day (1st Monday Sep)
  "2027-10-11", // Thanksgiving (2nd Monday Oct)
  "2027-12-27", // Christmas Day observed (Sat Dec 25 → Mon Dec 27)
  "2027-12-28", // Boxing Day observed (Sun Dec 26 → Tue Dec 28; Mon is Christmas obs)
]);

export function isTouHolidayIso(isoDate: string): boolean {
  return HOLIDAY_PRICING_DAYS.has(isoDate);
}

export function holidayIsoDatesForTests(): string[] {
  return [...HOLIDAY_PRICING_DAYS].sort();
}
