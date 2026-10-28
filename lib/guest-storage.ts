/**
 * Guest persistence (localStorage). try/catch everywhere — pages work without it.
 */

import { DEFAULT_CHORES, type ChoreConfig } from "@/lib/pricing";
import type { PlanId } from "@/lib/rates/types";

const PLAN_KEY = "powersave-plan";
const CHORES_KEY = "powersave-chores";
const QUIET_KEY = "powersave-quiet-hours";
const UNITS_KEY = "powersave-units";
const SETUP_KEY = "powersave-setup-done";
const FIRST_VISIT_KEY = "powersave-first-visit-dismissed";

export type PriceUnits = "cents" | "dollars";

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

export function readStoredUnits(): PriceUnits {
  try {
    if (typeof window === "undefined") return "cents";
    const v = window.localStorage.getItem(UNITS_KEY);
    return v === "dollars" ? "dollars" : "cents";
  } catch {
    return "cents";
  }
}

export function writeStoredUnits(units: PriceUnits): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(UNITS_KEY, units);
  } catch {
    /* ignore */
  }
}

export function readSetupDone(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SETUP_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSetupDone(done: boolean): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SETUP_KEY, done ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function readFirstVisitDismissed(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(FIRST_VISIT_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeFirstVisitDismissed(done: boolean): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FIRST_VISIT_KEY, done ? "1" : "0");
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
    typeof o.enabled === "boolean" &&
    (o.allowOvernight === undefined || typeof o.allowOvernight === "boolean")
  );
}

function withOvernightDefault(c: ChoreConfig): ChoreConfig {
  if (typeof c.allowOvernight === "boolean") return c;
  return { ...c, allowOvernight: c.id === "ev" };
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
    return parsed.map((c) => withOvernightDefault({ ...c }));
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

/** Wipe guest settings on this device (Settings → Delete my data). */
export function clearGuestData(): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(PLAN_KEY);
    window.localStorage.removeItem(CHORES_KEY);
    window.localStorage.removeItem(QUIET_KEY);
    window.localStorage.removeItem(UNITS_KEY);
    window.localStorage.removeItem(SETUP_KEY);
    window.localStorage.removeItem(FIRST_VISIT_KEY);
    // Theme key is owned by ThemeProvider — clear too.
    window.localStorage.removeItem("powersave-theme");
  } catch {
    /* ignore */
  }
}

/** Start-flow defaults: Laundry + Dishwasher on (awake hours), EV off (overnight OK when enabled). */
export function startFlowDefaultChores(): ChoreConfig[] {
  return [
    {
      id: "laundry",
      label: "Laundry",
      kwh: 3,
      durationMin: 90,
      deadlineMin: null,
      enabled: true,
      allowOvernight: false,
    },
    {
      id: "dishwasher",
      label: "Dishwasher",
      kwh: 1.2,
      durationMin: 120,
      deadlineMin: null,
      enabled: true,
      allowOvernight: false,
    },
    {
      id: "ev",
      label: "EV charging",
      kwh: 28.8,
      durationMin: 240,
      deadlineMin: null,
      enabled: false,
      allowOvernight: true,
    },
  ];
}
