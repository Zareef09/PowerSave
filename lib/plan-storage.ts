import type { PlanId } from "@/lib/rates/2026-11-01";

const KEY = "powersave-plan";

export function readStoredPlan(): PlanId | null {
  try {
    if (typeof window === "undefined") return null;
    const v = window.localStorage.getItem(KEY);
    if (v === "TOU" || v === "ULO" || v === "TIERED") return v;
    return null;
  } catch {
    return null;
  }
}

export function writeStoredPlan(plan: PlanId): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, plan);
  } catch {
    // Page must work without localStorage.
  }
}
