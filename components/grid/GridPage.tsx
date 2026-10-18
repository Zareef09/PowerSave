"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IesoCopyright } from "@/components/IesoCopyright";
import { SampleDataTag } from "@/components/SampleDataTag";
import { AppChrome } from "@/components/grid/AppChrome";
import { PriceLineChart } from "@/components/grid/PriceLineChart";
import type { WholesalePayload } from "@/lib/ieso";
import { fetchWholesale } from "@/lib/wholesale-client";

function formatClock(isoOrDate: string | undefined): string {
  if (!isoOrDate) return "—";
  try {
    const d = new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("en-CA", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/Toronto",
    });
  } catch {
    return "—";
  }
}

function fmtCountdown(sec: number): string {
  const s = Math.max(0, sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const GHOST = ["M", "T", "W", "T", "F", "S", "S"].map((d, i) => ({
  d,
  h: 30 + ((i * 17) % 30),
}));

export function GridPage() {
  const [data, setData] = useState<WholesalePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAvg, setShowAvg] = useState(true);
  const [idx, setIdx] = useState(217);
  const [sec, setSec] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const payload = await fetchWholesale();
      if (cancelled) return;
      setData(payload);
      setLoading(false);
      if (payload?.ok && payload.series?.length) {
        const last = payload.series[payload.series.length - 1];
        setIdx(Math.round(last.minuteOfDay / 5));
      }
      if (payload?.ok && typeof payload.countdownSeconds === "number") {
        setSec(payload.countdownSeconds);
      }
    };
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (!data?.ok || data.freshness.state !== "live") return;
    const t = setInterval(() => setSec((c) => (c > 0 ? c - 1 : 299)), 1000);
    return () => clearInterval(t);
  }, [data?.ok, data?.freshness.state]);

  const state = data?.ok ? data.freshness.state : data ? data.freshness.state : "error";
  const live = state === "live";
  const delayed = state === "delayed" || state === "stale" || state === "error";
  const lastUpdated = formatClock(data?.observationEnd);
  const cents = data?.ok && data.latest ? data.latest.displayCents : null;
  const mw = data?.ok && data.latest ? data.latest.displayMwH : null;

  const series = data?.ok && data.series ? data.series : [];
  const averages = data?.ok && data.averages ? data.averages : null;

  const delayHead =
    state === "stale"
      ? "Data is over 20 minutes old."
      : state === "error"
        ? "Grid data unavailable."
        : "Update delayed.";
  const delayBody =
    state === "stale"
      ? `Showing data from ${lastUpdated}. Your advice on Today still works; it doesn’t depend on the grid.`
      : state === "error"
        ? "We could not load IESO public reports. Try again in a few minutes. Advice from your rate plan still works."
        : `Showing data from ${lastUpdated}. Your advice on Today still works.`;

  const pullLabel = useMemo(() => {
    if (!data?.ok) return "[ SOURCE IESO PUBLIC REPORTS ]";
    const next = data.countdownSeconds != null ? fmtCountdown(data.countdownSeconds) : "—";
    return `[ LAST OBS ${lastUpdated.toUpperCase()} · NEXT ~${next} ]`;
  }, [data, lastUpdated]);

  return (
    <AppChrome current="Grid">
      <main className="mx-auto box-border flex w-full max-w-[1040px] flex-1 flex-col gap-6 px-6 py-6 md:px-12 md:py-12">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border-2 border-ink px-[18px] py-3.5">
          <span className="text-lg font-medium">Wholesale market price. Not what you pay.</span>
          <span className="font-mono-label text-muted-strong">[ WHOLESALE · NOT YOUR BILL ]</span>
        </div>

        <div className="flex flex-col gap-3">
          <div className="font-mono-label flex flex-wrap justify-between gap-x-5 gap-y-1.5 text-muted">
            <span>{pullLabel}</span>
            <span>[ SOURCE IESO PUBLIC REPORTS ]</span>
          </div>
          <h1 className="m-0 text-[40px] font-light leading-none tracking-[-0.03em] md:text-[56px]">
            The Grid<span className="text-muted"> Ontario, now.</span>
          </h1>
        </div>

        {(delayed || loading) && !loading ? (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl border border-ink px-4 py-3 text-sm"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M12 8v5M12 16.5v.5M10.3 3.9L2.6 17.5A2 2 0 004.3 20.5h15.4a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
            </svg>
            <span>
              <b className="font-medium">{delayHead}</b> {delayBody}
            </span>
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-card border border-hairline bg-surface p-6 text-muted-strong">
            Loading Ontario grid data…
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-3.5 rounded-card border border-hairline bg-surface p-6">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-mono-label flex items-center gap-2 text-muted-strong">
                <span
                  className="inline-block h-2 w-2 rounded-full bg-accent"
                  style={
                    live
                      ? { animation: "pspulse 1.6s infinite" }
                      : { opacity: 0.4 }
                  }
                  aria-hidden
                />
                Latest five-minute price
              </span>
              {!data?.ok ? <SampleDataTag /> : null}
            </div>
            <div className="text-xs font-medium text-muted-strong">
              Wholesale market price. Not what you pay.
            </div>
            {data?.ok && cents != null ? (
              <>
                <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5">
                  <span className="text-[72px] font-light leading-none tracking-[-0.04em] tabular md:text-[96px]">
                    {cents.toFixed(1)}¢
                  </span>
                  <span className="font-mono-label text-muted-strong">/kWh equivalent</span>
                </div>
                <div className="font-mono-label text-muted-strong">${mw} / MWh</div>
              </>
            ) : (
              <div className="text-muted-strong">No live price. Showing error state — not sample as live.</div>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-3.5 rounded-card border border-hairline bg-surface p-6">
            <div className="font-mono-label text-muted-strong">UPDATES</div>
            <div className="text-base">
              Last updated <b className="font-medium tabular">{lastUpdated}</b>
            </div>
            {live ? (
              <div className="text-[22px] font-light leading-tight tracking-[-0.03em] tabular md:text-[28px]">
                Next update expected in <b className="font-medium">{fmtCountdown(sec)}</b>
              </div>
            ) : (
              <div className="text-[22px] font-light leading-tight tracking-[-0.03em] md:text-[28px]">
                Update delayed.
                <br />
                <span className="text-muted-strong">Showing data from {lastUpdated}.</span>
              </div>
            )}
            <div className="text-sm leading-normal text-muted-strong">
              Grid data refreshes about every 5 minutes. Your advice on Today doesn&apos;t depend on
              it.
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowAvg((v) => !v)}
              aria-pressed={showAvg}
              className="min-h-11 rounded-btn border border-ink bg-transparent px-3.5 text-sm font-medium text-ink"
            >
              Average lines: {showAvg ? "on" : "off"}
            </button>
          </div>
          <PriceLineChart
            series={series}
            averages={averages}
            showAverages={showAvg}
            idx={idx}
            onIdx={setIdx}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3.5 rounded-card border border-hairline bg-surface p-6">
            <div className="font-mono-label text-muted-strong">WHY SHOW THIS?</div>
            <div className="text-xl font-light leading-snug tracking-[-0.02em]">
              The grid price shows when Ontario&apos;s system is under stress. Your bill uses your
              plan&apos;s fixed prices.
            </div>
            <Link href="/how-it-works" className="text-sm text-accent">
              How it works →
            </Link>
          </div>
          <div className="flex flex-col gap-3.5 rounded-card border border-hairline bg-surface p-6">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-mono-label text-muted-strong">FORECAST ACCURACY</span>
              <SampleDataTag />
            </div>
            <div className="text-sm leading-snug">
              Last 7 days: forecast error vs. a simple &quot;same hour yesterday&quot; guess.
            </div>
            <div className="flex h-[84px] items-end gap-2">
              {GHOST.map((b) => (
                <div key={b.d + b.h} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded border border-dashed border-muted"
                    style={{ height: b.h }}
                  />
                  <span className="font-mono-label text-[9px] text-muted-strong">{b.d}</span>
                </div>
              ))}
            </div>
            <div className="text-[13px] text-muted-strong">
              Placeholder. Measured error appears here once we have seven days of data.
            </div>
          </div>
        </div>

        <div className="border-t border-hairline pt-4 text-[13px] leading-normal text-muted-strong">
          Grid data: IESO public reports, credited in text only. PowerSave is not affiliated with the
          IESO. Wholesale prices are not your bill.
          <IesoCopyright className="mt-3" />
        </div>
      </main>
    </AppChrome>
  );
}
