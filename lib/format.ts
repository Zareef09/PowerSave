/** Format cost in cents: under $1 as "N¢", otherwise "$X.YY". Matches Checks.dc.html `fm`. */
export function formatCost(cents: number): string {
  if (cents < 100) return `${cents}¢`;
  return `$${(cents / 100).toFixed(2)}`;
}

/** Format minute-of-day as "7:00 PM". Matches Checks.dc.html `fmt`. */
export function formatTime(minuteOfDay: number): string {
  const m = ((Math.round(minuteOfDay) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/** Format as 24h "17:30". */
export function formatTime24(minuteOfDay: number): string {
  const m = ((Math.round(minuteOfDay) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Format hour tick as "7 PM". */
export function formatHourTick(minuteOfDay: number): string {
  const m = ((Math.round(minuteOfDay) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  return `${h % 12 || 12} ${h >= 12 ? "PM" : "AM"}`;
}
