import type { PlanId, RateSet } from "@/lib/rates/types";

export function planDisplayName(plan: PlanId): string {
  if (plan === "TOU") return "Time-of-Use (TOU)";
  if (plan === "ULO") return "Ultra-Low Overnight (ULO)";
  return "Tiered plan";
}

export function ratesAsOfLabel(rates: RateSet): string {
  const d = rates.effective;
  // effective is YYYY-MM-DD
  const [y, m, day] = d.split("-");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const mi = Number(m) - 1;
  return `Rates as of ${months[mi]} ${Number(day)}, ${y}`;
}

export function ratesMonoTag(rates: RateSet): string {
  const [y, m, day] = rates.effective.split("-");
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  return `[ RATES OEB · ${months[Number(m) - 1]} ${Number(day)} ${y} ]`;
}
