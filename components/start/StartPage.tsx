"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  startFlowDefaultChores,
  writeSetupDone,
  writeStoredChores,
  writeStoredPlan,
  writeStoredQuietHours,
} from "@/lib/guest-storage";
import type { ChoreConfig } from "@/lib/pricing";
import type { PlanId } from "@/lib/rates/types";

type PlanChoice = PlanId | "unsure";

const PLAN_CARDS: { value: PlanChoice; title: string; tagline: string }[] = [
  {
    value: "TOU",
    title: "Time-of-Use",
    tagline: "Default for most Ontario homes. Cheaper evenings, nights and weekends.",
  },
  {
    value: "ULO",
    title: "Ultra-Low Overnight",
    tagline: "Lowest overnight. Popular with EV owners.",
  },
  {
    value: "TIERED",
    title: "Tiered",
    tagline: "One price at every hour. Timing doesn’t matter.",
  },
  {
    value: "unsure",
    title: "Not sure",
    tagline: "We’ll show you where to look on a bill.",
  },
];

export function StartPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [planChoice, setPlanChoice] = useState<PlanChoice>("TOU");
  const [chores, setChores] = useState<ChoreConfig[]>(() => startFlowDefaultChores());
  const [quiet, setQuiet] = useState(false);

  const finish = (asGuest: boolean) => {
    const plan: PlanId = planChoice === "unsure" ? "TOU" : planChoice;
    writeStoredPlan(plan);
    writeStoredChores(chores);
    writeStoredQuietHours(quiet);
    writeSetupDone(true);
    void asGuest;
    router.push("/app");
  };

  const skip = () => {
    writeSetupDone(true);
    router.push("/app");
  };

  const stepLabel = step === 1 ? "YOUR PLAN" : step === 2 ? "YOUR CHORES" : "PREFERENCES";

  return (
    <div className="min-h-screen bg-page text-ink">
      <div className="border-b border-hairline">
        <div className="mx-auto flex h-[72px] max-w-[640px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="text-[22px] font-medium tracking-[-0.03em] text-ink no-underline">
            PowerSave
          </Link>
          <button
            type="button"
            onClick={skip}
            className="inline-flex min-h-11 items-center text-sm text-muted-strong underline-offset-2 hover:underline"
          >
            Skip setup
          </button>
        </div>
      </div>

      <main id="main-content" className="mx-auto box-border w-full max-w-[640px] px-4 py-10 sm:px-6 md:py-14">
        <div className="font-mono-label flex flex-wrap justify-between gap-2 text-muted">
          <span>
            /START · STEP {step} OF 3
          </span>
          <span>[ {stepLabel} ]</span>
        </div>
        <div
          className="mt-4 flex gap-2"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={3}
          aria-label={`Setup step ${step} of 3`}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-ink" : "bg-hairline"}`}
            />
          ))}
        </div>

        {step === 1 ? (
          <div className="mt-10 flex flex-col gap-6">
            <div>
              <h1 className="m-0 text-[40px] font-light leading-none tracking-[-0.03em]">Your plan.</h1>
              <p className="mt-3 text-lg text-muted">
                Prices depend on your rate plan. Pick the one on your bill.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PLAN_CARDS.map((c) => {
                const on = planChoice === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPlanChoice(c.value)}
                    className={`flex min-h-[120px] flex-col gap-2 rounded-card border-2 p-4 text-left ${
                      on ? "border-ink bg-surface" : "border-hairline bg-surface"
                    }`}
                  >
                    <span className="text-lg font-medium">{c.title}</span>
                    <span className="text-sm leading-snug text-muted-strong">{c.tagline}</span>
                  </button>
                );
              })}
            </div>
            {planChoice === "unsure" ? (
              <div className="rounded-panel border border-hairline bg-panel p-5">
                <div className="font-mono-label text-muted-strong">WHERE TO FIND IT · GENERIC BILL</div>
                <div
                  className="mt-4 rounded-card border border-[#d6d5d1] bg-white p-4 text-[#1c1d24]"
                  aria-hidden
                >
                  <div className="text-sm font-medium">Your electricity bill</div>
                  <div className="mt-1 text-[11px] uppercase tracking-wide text-[#6b6e76]">Page 2</div>
                  <div className="mt-3 rounded border-2 border-[#2548f6] bg-[#dce3ff] px-3 py-2 text-sm">
                    Rate plan → Time-of-Use (TOU)
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-[#6b6e76]">
                    <div>On-peak · … kWh</div>
                    <div>Mid-peak · … kWh</div>
                    <div>Off-peak · … kWh</div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-normal text-muted-strong">
                  Look for “Rate plan” or “Price plan”. If you see on-peak, mid-peak and off-peak,
                  you&apos;re on TOU. Most Ontario homes are on TOU. You can change this any time.
                </p>
                <button
                  type="button"
                  className="mt-4 inline-flex min-h-12 items-center rounded-btn bg-ink px-5 font-medium text-page"
                  onClick={() => setPlanChoice("TOU")}
                >
                  Use TOU for now
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-10 flex flex-col gap-6">
            <div>
              <h1 className="m-0 text-[40px] font-light leading-none tracking-[-0.03em]">Your chores.</h1>
              <p className="mt-3 text-lg text-muted">Typical estimates. Edit to match yours.</p>
            </div>
            <div className="flex flex-col gap-3">
              {chores.map((c, idx) => (
                <div
                  key={c.id}
                  className={`rounded-card border-2 p-4 ${
                    c.enabled ? "border-ink bg-surface" : "border-hairline bg-surface"
                  }`}
                >
                  <label className="flex min-h-11 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={c.enabled}
                      className="h-5 w-5"
                      onChange={(e) => {
                        const next = [...chores];
                        next[idx] = { ...c, enabled: e.target.checked };
                        setChores(next);
                      }}
                    />
                    <span className="text-lg font-medium">{c.label}</span>
                  </label>
                  {c.enabled ? (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1 text-sm text-muted-strong">
                        Energy (kWh)
                        <input
                          type="number"
                          min={0.1}
                          step={0.1}
                          value={c.kwh}
                          className="min-h-11 rounded-btn border border-hairline bg-page px-3 text-ink"
                          onChange={(e) => {
                            const next = [...chores];
                            next[idx] = {
                              ...c,
                              kwh: Math.max(0.1, Number(e.target.value) || 0.1),
                            };
                            setChores(next);
                          }}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm text-muted-strong">
                        Run time (min)
                        <input
                          type="number"
                          min={15}
                          step={15}
                          value={c.durationMin}
                          className="min-h-11 rounded-btn border border-hairline bg-page px-3 text-ink"
                          onChange={(e) => {
                            const next = [...chores];
                            next[idx] = {
                              ...c,
                              durationMin: Math.max(
                                15,
                                Math.round((Number(e.target.value) || 15) / 15) * 15,
                              ),
                            };
                            setChores(next);
                          }}
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="inline-flex min-h-11 w-fit items-center text-sm text-accent"
              onClick={() =>
                setChores((prev) => [
                  ...prev,
                  {
                    id: `custom-${Date.now()}`,
                    label: "Custom chore",
                    kwh: 1,
                    durationMin: 60,
                    deadlineMin: null,
                    enabled: true,
                    allowOvernight: false,
                  },
                ])
              }
            >
              Add custom chore
            </button>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-10 flex flex-col gap-6">
            <div>
              <h1 className="m-0 text-[40px] font-light leading-none tracking-[-0.03em]">
                A few <span className="text-muted">preferences.</span>
              </h1>
            </div>
            <div className="rounded-card border border-hairline bg-surface p-5">
              <label className="flex min-h-11 cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={quiet}
                  className="mt-1 h-5 w-5"
                  onChange={(e) => setQuiet(e.target.checked)}
                />
                <span>
                  <span className="block text-base font-medium">Only suggest times when I&apos;m awake</span>
                  <span className="mt-1 block text-sm text-muted-strong">
                    Quiet hours 10 PM–7 AM · also applies to EV when on
                  </span>
                </span>
              </label>
              <p className="mt-3 text-sm text-muted-strong">
                Laundry and dishwasher already skip overnight. EV can still use ultra-low unless you
                turn this on.
              </p>
            </div>
            <div className="rounded-card border border-hairline bg-surface p-5">
              <div className="text-lg font-medium">Save across devices?</div>
              <p className="mt-2 text-sm text-muted-strong">
                Optional. Everything works without an account. Guest is first-class.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/app/signin"
                  className="inline-flex min-h-12 items-center rounded-btn border border-ink px-5 font-medium text-ink no-underline"
                >
                  Sign in
                </Link>
                <button
                  type="button"
                  onClick={() => finish(true)}
                  className="inline-flex min-h-12 items-center rounded-btn bg-ink px-5 font-medium text-page"
                >
                  Continue as guest
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            className="inline-flex min-h-11 items-center text-sm text-ink"
            onClick={() => {
              if (step === 1) router.push("/");
              else setStep((s) => s - 1);
            }}
          >
            ← Back
          </button>
          {step < 3 ? (
            <button
              type="button"
              className="inline-flex min-h-12 items-center rounded-btn bg-ink px-6 font-medium text-page"
              onClick={() => setStep((s) => s + 1)}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex min-h-12 items-center rounded-btn bg-lime px-6 font-medium text-ink"
              onClick={() => finish(true)}
            >
              See my cheapest times
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
