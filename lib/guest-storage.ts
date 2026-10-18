/**
 * Guest persistence (localStorage). try/catch everywhere — pages work without it.
 */

import { DEFAULT_CHORES, type ChoreConfig } from "@/lib/pricing";
import type { PlanId } from "@/lib/rates/types";

const PLAN_KEY = "powersave-plan";
const CHORES_KEY = "powersave-chores";
const QUIET_KEY = "powersave-quiet-hours";

export function readStoredPlan(): PlanId | null {
  try {
    if (typeof window === "undefined") return null;
    const v = window.localStorage.getItem(PLAN_KEY);
    if (v === "TOU" || v === "ULO" || v === "TIERED") return v;
    return null;
  } catch {
    return null;
  }
}

export function writeStoredPlan(plan: PlanId): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PLAN_KEY, plan);
  } catch {
    /* guest mode without storage */
  }
}

export function readStoredQuietHours(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(QUIET_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeStoredQuietHours(on: boolean): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(QUIET_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function isChoreConfig(v: unknown): v is ChoreConfig {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.label === "string" &&
    typeof o.kwh === "number" &&
    typeof o.durationMin === "number" &&
    (o.deadlineMin === null || typeof o.deadlineMin === "number") &&
    typeof o.enabled === "boolean"
  );
}

export function readStoredChores(): ChoreConfig[] {
  try {
    if (typeof window === "undefined") return DEFAULT_CHORES.map((c) => ({ ...c }));
    const raw = window.localStorage.getItem(CHORES_KEY);
    if (!raw) return DEFAULT_CHORES.map((c) => ({ ...c }));
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || !parsed.every(isChoreConfig)) {
      return DEFAULT_CHORES.map((c) => ({ ...c }));
    }
    return parsed.map((c) => ({ ...c }));
  } catch {
    return DEFAULT_CHORES.map((c) => ({ ...c }));
  }
}

export function writeStoredChores(chores: ChoreConfig[]): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CHORES_KEY, JSON.stringify(chores));
  } catch {
    /* ignore */
  }
}

/** @deprecated use readStoredPlan from guest-storage */
export { readStoredPlan as readStoredPlanLegacy };
