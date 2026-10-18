import { addMinutes, torontoDate, torontoParts } from "@/lib/rates/toronto";

/** Done-by presets as minutes from local midnight (7 AM next day = 1440+420). */
export const DONE_BY_OPTIONS: { label: string; deadlineMin: number | null }[] = [
  { label: "No deadline", deadlineMin: null },
  { label: "6:00 PM", deadlineMin: 18 * 60 },
  { label: "7:30 PM", deadlineMin: 18 * 60 + 30 },
  { label: "9:00 PM", deadlineMin: 21 * 60 },
  { label: "7:00 AM", deadlineMin: 24 * 60 + 7 * 60 },
];

/** Resolve a deadlineMin (from midnight of `now`'s Toronto day) to an absolute Date. */
export function deadlineDateFromMin(now: Date, deadlineMin: number | null): Date | null {
  if (deadlineMin == null) return null;
  const p = torontoParts(now);
  const midnight = torontoDate(p.year, p.month, p.day, 0, 0, 0);
  return addMinutes(midnight, deadlineMin);
}
