"use client";

import type { AveragesBlock, HourAverage, WholesaleSeriesPoint } from "@/lib/ieso";

function X(minuteOfDay: number) {
  return 40 + (minuteOfDay / 1440) * 740;
}
function Y(cents: number, yMin: number, yMax: number) {
  return 240 - ((cents - yMin) / (yMax - yMin)) * 220;
}

function hh(index: number) {
  const m = index * 5;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

type Props = {
  series: WholesaleSeriesPoint[];
  averages: AveragesBlock | null;
  showAverages: boolean;
  idx: number;
  onIdx: (i: number) => void;
};

export function PriceLineChart({ series, averages, showAverages, idx, onIdx }: Props) {
  const byMinute = new Map(series.map((p) => [p.minuteOfDay, p.centsKwh]));
  const maxIdx = 217;
  const values: number[] = [];
  for (let i = 0; i <= maxIdx; i++) {
    const m = i * 5;
    const v = byMinute.get(m);
    values.push(v ?? Number.NaN);
  }

  const known = values.filter((v) => !Number.isNaN(v));
  const yMin = known.length ? Math.min(3.5, ...known) - 0.2 : 3.5;
  const yMax = known.length ? Math.max(7, ...known) + 0.2 : 7;

  const pt = values
    .map((v, i) => (Number.isNaN(v) ? null : `${X(i * 5).toFixed(1)},${Y(v, yMin, yMax).toFixed(1)}`))
    .filter(Boolean)
    .join(" ");

  const lineFromAvg = (avgs: HourAverage[]) =>
    avgs
      .filter((a) => a.centsKwh != null)
      .map((a) => `${X(a.hour * 60).toFixed(1)},${Y(a.centsKwh as number, yMin, yMax).toFixed(1)}`)
      .join(" ");

  const show3 = Boolean(showAverages && averages?.showDay3 && averages.day3.length);
  const show7 = Boolean(showAverages && averages?.showDay7 && averages.day7.length);
  const showN = Boolean(
    showAverages && averages?.showPartialNDay && averages.partialNDay.length,
  );

  const p3 = show3 ? lineFromAvg(averages!.day3) : "";
  const p7 = show7 ? lineFromAvg(averages!.day7) : "";
  const pN = showN ? lineFromAvg(averages!.partialNDay) : "";

  const safeIdx = Math.max(0, Math.min(maxIdx, idx));
  const curVal = values[safeIdx];
  const curX = X(safeIdx * 5);
  const curY = Number.isNaN(curVal) ? 240 : Y(curVal, yMin, yMax);
  const lastKnown = [...values].map((v, i) => ({ v, i })).reverse().find((x) => !Number.isNaN(x.v));
  const nowX = lastKnown ? X(lastKnown.i * 5) : X(0);

  const hour = Math.floor((safeIdx * 5) / 60);
  const a3 = show3 ? averages!.day3.find((a) => a.hour === hour)?.centsKwh : null;
  const a7 = show7 ? averages!.day7.find((a) => a.hour === hour)?.centsKwh : null;
  const aN = showN ? averages!.partialNDay.find((a) => a.hour === hour)?.centsKwh : null;
  const tipVal = Number.isNaN(curVal) ? "—" : curVal.toFixed(1);
  const tipMw = Number.isNaN(curVal) ? "—" : String(Math.round(curVal * 10));

  let avgTip = "";
  if (show3 || show7) {
    avgTip = ` · 3-day avg for this hour ${a3 != null ? a3.toFixed(1) : "—"}¢ · 7-day avg ${
      a7 != null ? a7.toFixed(1) : "—"
    }¢`;
  } else if (showN && averages?.partialN) {
    avgTip = ` · ${averages.partialN}-day avg for this hour ${aN != null ? aN.toFixed(1) : "—"}¢ (partial)`;
  } else if (averages?.status === "missing") {
    avgTip = " · history averages unavailable";
  }

  const tip = `${hh(safeIdx)} · ${tipVal}¢/kWh equivalent ($${tipMw}/MWh)${avgTip}. Wholesale market price. Not what you pay.`;

  const yTicks = [Math.ceil(yMin), Math.round((yMin + yMax) / 2), Math.floor(yMax)];
  const uniqueY = [...new Set(yTicks)];

  const onHover = (e: React.MouseEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = (e.clientX - r.left) / r.width;
    onIdx(Math.max(0, Math.min(maxIdx, Math.round((f * 1440) / 5))));
  };

  return (
    <div className="flex flex-col gap-3.5 overflow-hidden rounded-card border border-hairline bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div>
          <div className="text-lg font-medium sm:text-xl">Today, every five minutes</div>
          <div className="mt-0.5 text-xs text-muted-strong">
            Wholesale market price. Not what you pay. ¢/kWh equivalent.
          </div>
        </div>
      </div>
      {averages?.note ? (
        <div role="status" className="rounded-lg border border-hairline bg-page px-3 py-2 text-sm text-muted-strong">
          {averages.note}
        </div>
      ) : null}
      <div
        className="min-h-11 rounded-lg border border-hairline bg-page px-3 py-2 text-sm tabular leading-snug"
        aria-live="polite"
        role="status"
      >
        {tip}
      </div>
      <svg
        viewBox="0 0 800 280"
        className="block h-auto w-full max-w-full touch-none"
        role="img"
        aria-label="Wholesale price chart for today with same-hour average lines when available. Use the scrub slider below for keyboard access."
      >
        {uniqueY.map((v) => (
          <g key={v}>
            <line x1="40" x2="780" y1={Y(v, yMin, yMax)} y2={Y(v, yMin, yMax)} stroke="var(--hl)" />
            <text
              x="34"
              y={Y(v, yMin, yMax) + 4}
              textAnchor="end"
              fontSize="11"
              fill="var(--m2)"
              fontFamily="var(--font-geist-mono), monospace"
            >
              {v}¢
            </text>
          </g>
        ))}
        {[0, 6, 12, 18, 24].map((h) => (
          <g key={h}>
            <line
              x1={X(h * 60)}
              x2={X(h * 60)}
              y1="20"
              y2="240"
              stroke="var(--hl)"
              strokeDasharray="2 4"
            />
            <text
              x={X(h * 60)}
              y="262"
              textAnchor="middle"
              fontSize="11"
              fill="var(--m2)"
              fontFamily="var(--font-geist-mono), monospace"
            >
              {String(h).padStart(2, "0")}:00
            </text>
          </g>
        ))}
        {p3 ? (
          <polyline points={p3} fill="none" stroke="var(--mu)" strokeWidth="2" strokeDasharray="7 5" />
        ) : null}
        {p7 ? (
          <polyline
            points={p7}
            fill="none"
            stroke="var(--mu)"
            strokeWidth="2"
            strokeDasharray="1 5"
            strokeLinecap="round"
          />
        ) : null}
        {pN ? (
          <polyline points={pN} fill="none" stroke="var(--mu)" strokeWidth="2" strokeDasharray="4 4" />
        ) : null}
        {pt ? (
          <polyline points={pt} fill="none" stroke="var(--bl)" strokeWidth="2.5" strokeLinejoin="round" />
        ) : null}
        <line x1={nowX} x2={nowX} y1="20" y2="240" stroke="var(--bl)" strokeWidth="1.5" />
        {!Number.isNaN(curVal) ? (
          <circle cx={curX} cy={curY} r="5" fill="var(--bl)" stroke="var(--sf)" strokeWidth="2" />
        ) : null}
        <rect
          x="40"
          y="20"
          width="740"
          height="220"
          fill="transparent"
          onMouseMove={onHover}
          onClick={onHover}
        />
      </svg>
      <label className="flex flex-col gap-1.5 text-[13px] text-muted-strong">
        Scrub the chart (keyboard friendly)
        <input
          type="range"
          min={0}
          max={maxIdx}
          step={1}
          value={safeIdx}
          onChange={(e) => onIdx(Number(e.target.value))}
          aria-valuemin={0}
          aria-valuemax={maxIdx}
          aria-valuenow={safeIdx}
          aria-valuetext={tip}
          aria-label="Scrub wholesale price chart by five-minute interval"
          className="min-h-11 w-full accent-[var(--bl)]"
        />
      </label>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted-strong">
        <span>
          <b className="text-accent">━</b> Today, 5 min
        </span>
        {show3 ? <span>╍╍ 3-day average for this hour</span> : null}
        {show7 ? <span>··· 7-day average for this hour</span> : null}
        {showN && averages?.partialN ? (
          <span>┈┈ {averages.partialN}-day average for this hour (partial)</span>
        ) : null}
        {averages?.status === "missing" ? <span>Average lines hidden — history not loaded</span> : null}
      </div>
    </div>
  );
}
