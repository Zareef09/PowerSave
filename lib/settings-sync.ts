/**
 * Cloud sync for signed-in users. Guest localStorage stays source of truth on device;
 * when signed in we upsert to `user_settings` and pull on session start.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  readStoredChores,
  readStoredPlan,
  readStoredQuietHours,
  readStoredUnits,
  writeStoredChores,
  writeStoredPlan,
  writeStoredQuietHours,
  writeStoredUnits,
  type PriceUnits,
} from "@/lib/guest-storage";
import type { ChoreConfig } from "@/lib/pricing";
import type { PlanId } from "@/lib/rates/types";

export type CloudSettings = {
  plan: PlanId;
  chores: ChoreConfig[];
  quiet_hours: boolean;
  units: PriceUnits;
  theme: "light" | "dark" | null;
};

function isPlan(v: unknown): v is PlanId {
  return v === "TOU" || v === "ULO" || v === "TIERED";
}

function isChore(v: unknown): v is ChoreConfig {
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

export function readLocalAsCloud(): CloudSettings {
  let theme: "light" | "dark" | null = null;
  try {
    const t = localStorage.getItem("powersave-theme");
    if (t === "light" || t === "dark") theme = t;
  } catch {
    /* ignore */
  }
  return {
    plan: readStoredPlan() ?? "TOU",
    chores: readStoredChores(),
    quiet_hours: readStoredQuietHours(),
    units: readStoredUnits(),
    theme,
  };
}

export function applyCloudToLocal(row: CloudSettings): void {
  writeStoredPlan(row.plan);
  writeStoredChores(row.chores);
  writeStoredQuietHours(row.quiet_hours);
  writeStoredUnits(row.units);
  try {
    if (row.theme === "light" || row.theme === "dark") {
      localStorage.setItem("powersave-theme", row.theme);
      document.documentElement.classList.toggle("dark", row.theme === "dark");
    } else {
      localStorage.removeItem("powersave-theme");
    }
  } catch {
    /* ignore */
  }
}

function parseRow(data: Record<string, unknown>): CloudSettings | null {
  if (!isPlan(data.plan)) return null;
  if (!Array.isArray(data.chores) || !data.chores.every(isChore)) return null;
  const units: PriceUnits = data.units === "dollars" ? "dollars" : "cents";
  const theme =
    data.theme === "light" || data.theme === "dark" ? data.theme : null;
  return {
    plan: data.plan,
    chores: data.chores as ChoreConfig[],
    quiet_hours: Boolean(data.quiet_hours),
    units,
    theme,
  };
}

/** Pull cloud row into localStorage. If none, push current local up. */
export async function hydrateFromCloud(
  supabase: SupabaseClient,
  userId: string,
): Promise<"pulled" | "pushed" | "error"> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("plan, chores, quiet_hours, units, theme")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return "error";

  if (data) {
    const parsed = parseRow(data as Record<string, unknown>);
    if (parsed) {
      applyCloudToLocal(parsed);
      return "pulled";
    }
  }

  const local = readLocalAsCloud();
  const ok = await pushSettings(supabase, userId, local);
  return ok ? "pushed" : "error";
}

export async function pushSettings(
  supabase: SupabaseClient,
  userId: string,
  settings: CloudSettings = readLocalAsCloud(),
): Promise<boolean> {
  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: userId,
      plan: settings.plan,
      chores: settings.chores,
      quiet_hours: settings.quiet_hours,
      units: settings.units,
      theme: settings.theme,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  return !error;
}

/** Delete cloud settings + auth user (RPC) + sign out. */
export async function deleteAccountAndData(
  supabase: SupabaseClient,
): Promise<{ ok: boolean; message: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not signed in." };

  await supabase.from("user_settings").delete().eq("user_id", user.id);

  const { error: rpcError } = await supabase.rpc("delete_own_account");
  if (rpcError) {
    // Fallback: clear settings + sign out even if auth.users delete isn't available.
    await supabase.auth.signOut();
    return {
      ok: true,
      message:
        "Your synced settings were deleted and you were signed out. If an account still exists, contact us via the report form.",
    };
  }

  await supabase.auth.signOut();
  return { ok: true, message: "Your account and synced data were deleted." };
}
