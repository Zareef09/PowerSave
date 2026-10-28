"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppChrome } from "@/components/grid/AppChrome";
import { useTheme } from "@/components/ThemeProvider";
import { reportMailto } from "@/lib/contact";
import { ratesMonoTag } from "@/lib/format-rates";
import {
  clearGuestData,
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
import { rateSetForInstant, type PlanId } from "@/lib/rates";
import { createClient } from "@/lib/supabase/client";
import { deleteAccountAndData, pushSettings, readLocalAsCloud } from "@/lib/settings-sync";

const PLAN_OPTS: { id: PlanId; title: string; tag: string }[] = [
  { id: "TOU", title: "Time-of-Use", tag: "Default for most homes" },
  { id: "ULO", title: "Ultra-Low Overnight", tag: "Lowest overnight" },
  { id: "TIERED", title: "Tiered", tag: "Same price every hour" },
];

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { email, user, signOut, syncNow } = useAuth();
  const [plan, setPlan] = useState<PlanId>("TOU");
  const [chores, setChores] = useState<ChoreConfig[]>([]);
  const [quiet, setQuiet] = useState(false);
  const [units, setUnits] = useState<PriceUnits>("cents");
  const [themeMode, setThemeMode] = useState<"system" | "light" | "dark">("system");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState("");
  const [reportCat, setReportCat] = useState("A rate looks wrong");
  const [reportDetails, setReportDetails] = useState("");
  const [reportEmail, setReportEmail] = useState("");
  const [reported, setReported] = useState(false);
  const [ratesTag, setRatesTag] = useState("");

  const syncCloud = () => {
    if (!user) return;
    void syncNow();
  };

  useEffect(() => {
    const p = readStoredPlan();
    if (p) setPlan(p);
    setChores(readStoredChores());
    setQuiet(readStoredQuietHours());
    setUnits(readStoredUnits());
    setRatesTag(ratesMonoTag(rateSetForInstant(new Date())));
    try {
      const t = localStorage.getItem("powersave-theme");
      if (t === "light" || t === "dark") setThemeMode(t);
      else setThemeMode("system");
    } catch {
      setThemeMode("system");
    }
  }, []);

  const persistPlan = (next: PlanId) => {
    setPlan(next);
    writeStoredPlan(next);
    syncCloud();
  };

  const persistChores = (next: ChoreConfig[]) => {
    setChores(next);
    writeStoredChores(next);
    syncCloud();
  };

  const persistQuiet = (on: boolean) => {
    setQuiet(on);
    writeStoredQuietHours(on);
    syncCloud();
  };

  const persistUnits = (u: PriceUnits) => {
    setUnits(u);
    writeStoredUnits(u);
    syncCloud();
  };

  const applyThemeMode = (mode: "system" | "light" | "dark") => {
    setThemeMode(mode);
    if (mode === "system") {
      try {
        localStorage.removeItem("powersave-theme");
      } catch {
        /* ignore */
      }
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(dark ? "dark" : "light");
    } else {
      setTheme(mode);
    }
    if (user) {
      const supabase = createClient();
      if (supabase) {
        void pushSettings(supabase, user.id, {
          ...readLocalAsCloud(),
          theme: mode === "system" ? null : mode,
        });
      }
    }
  };

  const sampleNow = units === "cents" ? "57¢" : "$0.57";
  const sampleBest = units === "cents" ? "27¢" : "$0.27";

  return (
    <AppChrome current="Settings">
      <main
        id="main-content"
        className="mx-auto box-border flex w-full max-w-[1040px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:px-12 md:py-12"
      >
        <div className="font-mono-label flex flex-wrap justify-between gap-2 text-muted">
          <span>{email ? "[ SYNCED · ACCOUNT ]" : "[ SAVED ON THIS DEVICE ]"}</span>
          <span>{ratesTag || "[ RATES OEB ]"}</span>
        </div>
        <h1 className="m-0 text-[32px] font-light tracking-[-0.03em] sm:text-[40px] md:text-[56px]">
          Settings
        </h1>

        {/* Plan */}
        <section className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5 md:p-6">
          <div className="font-mono-label text-muted-strong">YOUR PLAN</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PLAN_OPTS.map((o) => (
              <button
                key={o.id}
                type="button"
                aria-pressed={plan === o.id}
                onClick={() => persistPlan(o.id)}
                className={`min-h-[88px] rounded-card border-2 p-4 text-left ${
                  plan === o.id ? "border-ink" : "border-hairline"
                }`}
              >
                <div className="font-medium">{o.title}</div>
                <div className="mt-1 text-sm text-muted-strong">{o.tag}</div>
              </button>
            ))}
          </div>
          <Link href="/plan" className="text-sm text-accent no-underline">
            Not sure? Find your plan on a bill →
          </Link>
        </section>

        {/* Chores */}
        <section className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5 md:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="font-mono-label text-muted-strong">YOUR CHORES</div>
            <span className="text-sm text-muted-strong">Typical estimates. Edit to match yours.</span>
          </div>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {chores.map((c) => {
              const editing = editingId === c.id;
              return (
                <li key={c.id} className="rounded-card border border-hairline p-4">
                  {!editing ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{c.label}</div>
                        <div className="font-mono-label mt-1 text-muted-strong">
                          {c.kwh} kWh ·{" "}
                          {c.durationMin % 60 === 0 && c.durationMin >= 60
                            ? `${c.durationMin / 60} h`
                            : `${c.durationMin} min`}
                          {!c.enabled ? " · off" : ""}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="min-h-11 rounded-btn border border-ink px-3 text-sm"
                          onClick={() => setEditingId(c.id)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="min-h-11 rounded-btn border border-ink px-3 text-sm"
                          aria-label={`Delete ${c.label}`}
                          onClick={() => persistChores(chores.filter((x) => x.id !== c.id))}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <label className="flex flex-col gap-1 text-sm text-muted-strong">
                        Name
                        <input
                          className="min-h-11 rounded-btn border border-hairline bg-page px-3 text-ink"
                          value={c.label}
                          onChange={(e) =>
                            persistChores(
                              chores.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)),
                            )
                          }
                        />
                      </label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <label className="flex flex-col gap-1 text-sm text-muted-strong">
                          Energy (kWh)
                          <input
                            type="number"
                            min={0.1}
                            step={0.1}
                            className="min-h-11 rounded-btn border border-hairline bg-page px-3 text-ink"
                            value={c.kwh}
                            onChange={(e) =>
                              persistChores(
                                chores.map((x) =>
                                  x.id === c.id
                                    ? { ...x, kwh: Math.max(0.1, Number(e.target.value) || 0.1) }
                                    : x,
                                ),
                              )
                            }
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-sm text-muted-strong">
                          Run time (min)
                          <input
                            type="number"
                            min={15}
                            step={15}
                            className="min-h-11 rounded-btn border border-hairline bg-page px-3 text-ink"
                            value={c.durationMin}
                            onChange={(e) =>
                              persistChores(
                                chores.map((x) =>
                                  x.id === c.id
                                    ? {
                                        ...x,
                                        durationMin: Math.max(
                                          15,
                                          Math.round((Number(e.target.value) || 15) / 15) * 15,
                                        ),
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                        </label>
                        <label className="flex min-h-11 items-center gap-2 text-sm text-ink sm:mt-6">
                          <input
                            type="checkbox"
                            checked={c.enabled}
                            className="h-5 w-5"
                            onChange={(e) =>
                              persistChores(
                                chores.map((x) =>
                                  x.id === c.id ? { ...x, enabled: e.target.checked } : x,
                                ),
                              )
                            }
                          />
                          Enabled on Today
                        </label>
                      </div>
                      <button
                        type="button"
                        className="inline-flex min-h-11 w-fit items-center rounded-btn bg-ink px-4 text-sm font-medium text-page"
                        onClick={() => setEditingId(null)}
                      >
                        Done
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="inline-flex min-h-11 w-fit items-center text-sm text-accent"
            onClick={() => {
              const id = `custom-${Date.now()}`;
              persistChores([
                ...chores,
                {
                  id,
                  label: "Custom chore",
                  kwh: 1,
                  durationMin: 60,
                  deadlineMin: null,
                  enabled: true,
                },
              ]);
              setEditingId(id);
            }}
          >
            Add custom chore
          </button>
        </section>

        {/* Preferences */}
        <section className="flex flex-col gap-5 rounded-card border border-hairline bg-surface p-5 md:p-6">
          <div className="font-mono-label text-muted-strong">PREFERENCES</div>
          <label className="flex min-h-11 cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={quiet}
              className="mt-1 h-5 w-5"
              onChange={(e) => persistQuiet(e.target.checked)}
            />
            <span>
              <span className="block font-medium">Only suggest times when I&apos;m awake</span>
              <span className="mt-1 block text-sm text-muted-strong">
                Quiet hours 10 PM–7 AM · {quiet ? "on" : "Off by default."}
              </span>
            </span>
          </label>
          {quiet ? (
            <p className="m-0 text-sm text-muted-strong">
              Delay-start appliances can still run overnight.
            </p>
          ) : null}

          <div>
            <div className="text-sm font-medium">Show prices in</div>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Price units">
              {(
                [
                  ["cents", "¢ cents"],
                  ["dollars", "$ dollars"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={units === id}
                  className={`min-h-11 rounded-btn border px-4 text-sm ${
                    units === id ? "border-ink bg-ink text-page" : "border-ink text-ink"
                  }`}
                  onClick={() => persistUnits(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-muted-strong">
              Example: laundry now costs {sampleNow}, at 7:00 PM {sampleBest}.{" "}
              <span className="font-mono-label">Sample data</span>
            </p>
          </div>

          <div>
            <div className="text-sm font-medium">Theme</div>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Theme">
              {(
                [
                  ["system", "System"],
                  ["light", "Light"],
                  ["dark", "Dark"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={themeMode === id}
                  className={`min-h-11 rounded-btn border px-4 text-sm ${
                    themeMode === id ? "border-ink bg-ink text-page" : "border-ink text-ink"
                  }`}
                  onClick={() => applyThemeMode(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-muted-strong">
              Current: {theme === "dark" ? "dark" : "light"}
              {themeMode === "system" ? " (system)" : ""}.
            </p>
          </div>
        </section>

        {/* Account */}
        <section className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5 md:p-6">
          <div className="font-mono-label text-muted-strong">ACCOUNT</div>
          {email ? (
            <p className="m-0 text-base leading-normal">
              Signed in as <b className="font-medium">{email}</b>. Plan and chores sync across
              devices when you change them here.
            </p>
          ) : (
            <p className="m-0 text-base leading-normal">
              You&apos;re using PowerSave as a guest. Everything works without an account. Signing
              in only saves your settings across devices.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {email ? (
              <button
                type="button"
                className="inline-flex min-h-12 items-center rounded-btn border border-ink px-5 font-medium"
                onClick={() => void signOut()}
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/app/signin"
                className="inline-flex min-h-12 items-center rounded-btn border border-ink px-5 font-medium text-ink no-underline"
              >
                Sign in
              </Link>
            )}
            <button
              type="button"
              className="inline-flex min-h-12 items-center rounded-btn border border-ink px-5 font-medium"
              onClick={() => {
                setConfirmDelete(true);
                setDeleted(false);
                setDeleteMsg("");
              }}
            >
              Delete my data
            </button>
          </div>
          {confirmDelete ? (
            <div
              role="alertdialog"
              aria-labelledby="delete-title"
              className="rounded-card border-2 border-ink p-4"
            >
              <div id="delete-title" className="font-medium">
                {email ? "Delete account and all saved settings?" : "Delete all saved settings?"}
              </div>
              <p className="mt-2 text-sm text-muted-strong">
                {email
                  ? "Clears this browser, deletes your synced settings and account. Cannot be undone."
                  : "Clears plan, chores and preferences from this browser. Cannot be undone."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="min-h-11 rounded-btn bg-ink px-4 text-sm font-medium text-page"
                  onClick={() => {
                    void (async () => {
                      if (user) {
                        const supabase = createClient();
                        if (supabase) {
                          const result = await deleteAccountAndData(supabase);
                          setDeleteMsg(result.message);
                        }
                      }
                      clearGuestData();
                      setPlan("TOU");
                      setChores([]);
                      setQuiet(false);
                      setUnits("cents");
                      setConfirmDelete(false);
                      setDeleted(true);
                    })();
                  }}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-btn border border-ink px-4 text-sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          {deleted ? (
            <p role="status" className="m-0 text-sm text-muted-strong">
              {deleteMsg || "Your data was deleted from this device."}
            </p>
          ) : null}
        </section>

        {/* Report */}
        <section className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5 md:p-6">
          <div className="font-mono-label text-muted-strong">REPORT A WRONG RATE OR BUG</div>
          <label className="flex flex-col gap-1.5 text-sm text-muted-strong">
            What&apos;s wrong?
            <select
              className="min-h-11 rounded-btn border border-hairline bg-page px-3 text-ink"
              value={reportCat}
              onChange={(e) => setReportCat(e.target.value)}
            >
              <option>A rate looks wrong</option>
              <option>The advice looks wrong</option>
              <option>Something is broken</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted-strong">
            Details
            <textarea
              className="min-h-[100px] rounded-btn border border-hairline bg-page px-3 py-2 text-ink"
              placeholder="Which plan, which time, what you expected."
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted-strong">
            Email, only if you want a reply (optional)
            <input
              type="email"
              className="min-h-11 rounded-btn border border-hairline bg-page px-3 text-ink"
              value={reportEmail}
              onChange={(e) => setReportEmail(e.target.value)}
            />
          </label>
          <a
            href={reportMailto({
              category: reportCat,
              details: reportDetails,
              replyEmail: reportEmail,
            })}
            className="inline-flex min-h-12 w-fit items-center rounded-btn bg-ink px-5 font-medium text-page no-underline"
            onClick={() => setReported(true)}
          >
            Send report
          </a>
          {reported ? (
            <p role="status" className="m-0 text-sm text-muted-strong">
              Thanks. Your email app should open with the report. Nothing is stored on our servers.
            </p>
          ) : null}
        </section>
      </main>
    </AppChrome>
  );
}
