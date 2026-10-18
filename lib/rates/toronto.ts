/**
 * America/Toronto clock helpers. All household “now” logic uses this zone,
 * never the browser’s local zone alone.
 */

export const TORONTO_TZ = "America/Toronto";

export type TorontoParts = {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** YYYY-MM-DD */
  isoDate: string;
  /** Minutes from local midnight (0–1439 typically; DST quirks handled via Date). */
  minuteOfDay: number;
  /** 0 = Sunday … 6 = Saturday (Toronto calendar). */
  weekday: number;
};

const dtf = new Intl.DateTimeFormat("en-CA", {
  timeZone: TORONTO_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

const WEEKDAY_NUM: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function torontoParts(at: Date): TorontoParts {
  const parts = dtf.formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const second = Number(get("second"));
  const wd = WEEKDAY_NUM[get("weekday")] ?? 0;
  const isoDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    isoDate,
    minuteOfDay: hour * 60 + minute,
    weekday: wd,
  };
}

/** True if this Toronto calendar date is in summer TOU season (May 1 – Oct 31). */
export function isSummerSeason(isoDate: string): boolean {
  const md = isoDate.slice(5); // MM-DD
  return md >= "05-01" && md <= "10-31";
}

/**
 * Build a Date for a Toronto wall-clock civil time.
 * Uses noon UTC binary search so DST transitions resolve to the local wall time.
 */
export function torontoDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  // Rough UTC guess, then nudge until Toronto parts match.
  let ms = Date.UTC(year, month - 1, day, hour + 5, minute, second);
  for (let i = 0; i < 48; i++) {
    const p = torontoParts(new Date(ms));
    if (
      p.year === year &&
      p.month === month &&
      p.day === day &&
      p.hour === hour &&
      p.minute === minute
    ) {
      return new Date(ms);
    }
    const targetTod = hour * 3600 + minute * 60 + second;
    const haveTod = p.hour * 3600 + p.minute * 60 + p.second;
    let deltaSec = targetTod - haveTod;
    // Cross-midnight / date mismatch: adjust by whole days first.
    const targetDay = Date.UTC(year, month - 1, day) / 86_400_000;
    const haveDay = Date.UTC(p.year, p.month - 1, p.day) / 86_400_000;
    deltaSec += (targetDay - haveDay) * 86_400;
    ms += deltaSec * 1000;
  }
  return new Date(ms);
}

/** Add whole minutes in real UTC time (correct across DST spring/fall). */
export function addMinutes(at: Date, minutes: number): Date {
  return new Date(at.getTime() + minutes * 60_000);
}
