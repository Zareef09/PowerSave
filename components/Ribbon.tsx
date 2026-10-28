"use client";

import { useTheme } from "@/components/ThemeProvider";
import { formatHourTick, formatTime, formatTime24 } from "@/lib/format";
import {
  RATE_SET_2026_11_01,
  periodAt,
  rateSetForInstant,
  seasonForInstant,
  type DayKind,
  type PeriodKey,
  type PlanId,
  type RateSet,
  type Season,
} from "@/lib/rates";

export type RibbonVariant = "hero" | "full" | "compact" | "mini";

export type RibbonProps = {
  plan?: PlanId;
  variant?: RibbonVariant;
  day?: DayKind;
  /** Defaults to the live Toronto season. Pass explicitly for Sample-data demos. */
  season?: Season;
  /** Defaults to the rate set in force now. Pass explicitly for Sample-data demos. */
  rates?: RateSet;
  startMin?: number;
  nowMin?: number;
  winStart?: number;
  winLen?: number;
  winLabel?: string;
  animate?: boolean;
  className?: string;
};

const NAME: Record<PeriodKey, string> = {
  ul: "Ultra-low",
  of: "Off-peak",
  md: "Mid-peak",
  on: "On-peak",
};

const BAND_H: Record<RibbonVariant, number> = {
  hero: 72,
  full: 56,
  compact: 14,
  mini: 30,
};

const RAD: Record<RibbonVariant, number> = {
  hero: 12,
  full: 10,
  compact: 4,
  mini: 6,
};

function hatch(key: PeriodKey, dark: boolean): string {
  const hc = dark ? "rgba(244,243,241," : "rgba(28,29,36,";
  const onc = dark ? "rgba(14,15,19," : "rgba(255,255,255,";
  switch (key) {
    case "ul":
      return `radial-gradient(${hc}.45) 1px, transparent 1.4px)`;
    case "of":
      return `repeating-linear-gradient(0deg, ${hc}.28) 0 1px, transparent 1px 6px)`;
    case "md":
      return `repeating-linear-gradient(45deg, ${hc}.38) 0 1px, transparent 1px 7px)`;
    case "on":
      return `repeating-linear-gradient(45deg, ${onc}.5) 0 1.5px, transparent 1.5px 6px), repeating-linear-gradient(-45deg, ${onc}.5) 0 1.5px, transparent 1.5px 6px)`;
  }
}

function hatchSize(key: PeriodKey): string | undefined {
  return key === "ul" ? "7px 7px" : undefined;
}

function textColor(key: PeriodKey): string {
  if (key === "md") return "var(--tm)";
  if (key === "on") return "var(--to)";
  return "var(--ink)";
}

type Seg = { k: PeriodKey; pr: number; i: number; n: number };

export function Ribbon({
  plan = "TOU",
  variant = "full",
  day = "weekday",
  season: seasonProp,
  rates: ratesProp,
  startMin = 0,
  nowMin = -1,
  winStart = -1,
  winLen = 90,
  winLabel = "",
  animate = false,
  className = "",
}: RibbonProps) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const big = variant === "hero" || variant === "full";
  const bandH = BAND_H[variant];
  const topPad = big ? 30 : 6;
  const botPad = big ? 44 : 6;
  const rad = RAD[variant];
  const totalH = topPad + bandH + botPad;
  const start = startMin;
  const wk = day !== "weekend" && day !== "holiday";

  const now = new Date();
  const rates = ratesProp ?? rateSetForInstant(now);
  const season = seasonProp ?? seasonForInstant(now);

  const raw: Seg[] = [];
  let cur: Seg | null = null;
  for (let i = 0; i < 96; i++) {
    const t = start + i * 15;
    const m = ((t % 1440) + 1440) % 1440;
    const { key, cents } = periodAt(plan, m, { day, season, rates });
    if (cur && cur.k === key && cur.pr === cents) cur.n++;
    else {
      cur = { k: key, pr: cents, i, n: 1 };
      raw.push(cur);
    }
  }

  const segs = raw.map((g, idx) => {
    const w = (g.n / 96) * 100;
    const left = (g.i / 96) * 100;
    let label = `${NAME[g.k]} · ${g.pr}¢`;
    if (plan === "TIERED") {
      label = `Tier 1 · ${rates.cents.tiered.tier1}¢ · same all day`;
    } else if (plan === "ULO" && g.k === "of" && !wk) {
      label = `Weekend off-peak · ${g.pr}¢`;
    } else if (!wk && plan === "TOU") {
      label = `Off-peak · ${g.pr}¢ · all day`;
    }

    const need = variant === "hero" ? (plan === "TIERED" ? 9 : 13) : variant === "full" ? 15 : 99;
    const showLabel = big && w >= need * 0.75;

    return {
      ...g,
      label,
      showLabel,
      left,
      w,
      delay: idx * 0.14,
    };
  });

  const ticks: { label: string; left: number }[] = [];
  if (big) {
    const first = Math.ceil(start / 60) * 60;
    for (let j = 0; ; j++) {
      const tm = first + j * 180;
      const off = tm - start;
      if (off > 1440) break;
      const left = (off / 1440) * 100;
      if (left > 96) continue;
      ticks.push({ label: formatHourTick(tm), left });
    }
  }

  const hasWin = winStart >= 0 && winLen > 0;
  let winLeft = 0;
  let winW = 0;
  if (hasWin) {
    const lo = (((winStart - start) % 1440) + 1440) % 1440;
    winLeft = (lo / 1440) * 100;
    winW = Math.min((winLen / 1440) * 100, 100 - winLeft);
  }

  const hasNow = nowMin >= 0;
  const nowLeft = hasNow ? ((((nowMin - start) % 1440) + 1440) % 1440 / 1440) * 100 : 0;
  const nowLabel = hasNow ? `NOW ${formatTime24(nowMin)}` : "";
  const nowTr = nowLeft < 8 ? "0" : nowLeft > 92 ? "-100%" : "-50%";

  const aria =
    `24-hour price ribbon, ${plan} plan ${wk ? "weekday" : "weekend"}: ` +
    raw
      .map((g) => `${NAME[g.k]} ${g.pr}¢ from ${formatTime(start + g.i * 15)}`)
      .join("; ") +
    (hasWin ? `. Best window starts ${formatTime(winStart)}.` : "");

  return (
    <div
      role="img"
      aria-label={aria}
      className={`relative w-full box-border text-ink ${className}`}
      style={{ height: totalH }}
    >
      <div
        className="absolute left-0 right-0 overflow-hidden border border-hairline bg-surface"
        style={{
          top: topPad,
          height: bandH,
          borderRadius: rad,
        }}
      >
        {segs.map((g, idx) => (
          <div
            key={`${g.k}-${g.i}-${idx}`}
            className="absolute top-0 bottom-0 box-border flex items-center overflow-hidden whitespace-nowrap border-r border-page px-2.5"
            style={{
              left: `${g.left}%`,
              width: `${g.w}%`,
              backgroundColor: `var(--${g.k})`,
              backgroundImage: hatch(g.k, dark),
              backgroundSize: hatchSize(g.k),
              animation: animate ? `psreveal .5s ease-out both` : undefined,
              animationDelay: animate ? `${g.delay}s` : undefined,
            }}
          >
            {g.showLabel ? (
              <span
                className="font-mono-label bg-transparent font-medium"
                style={{
                  fontSize: variant === "hero" ? 11 : 10,
                  color: textColor(g.k),
                }}
              >
                {g.label}
              </span>
            ) : null}
          </div>
        ))}
      </div>

      {ticks.map((t) => (
        <div
          key={t.left}
          className="absolute w-px bg-muted"
          style={{
            top: topPad + bandH,
            left: `${t.left}%`,
            height: 6,
          }}
        >
          <span
            className="font-mono-label absolute top-2 whitespace-nowrap text-[10px] text-muted-strong"
            style={{
              left: 0,
              transform: `translateX(${t.left < 3 ? "0" : "-50%"})`,
            }}
          >
            {t.label}
          </span>
        </div>
      ))}

      {hasWin ? (
        <>
          <div
            className="absolute box-border"
            style={{
              left: `${winLeft}%`,
              width: `${winW}%`,
              top: topPad - 4,
              height: bandH + 8,
              border: "2px solid #DDF247",
              borderRadius: rad + 2,
              boxShadow: "0 0 0 1px var(--ink), inset 0 0 0 1px var(--ink)",
              animation: animate ? "pssnap .4s ease-out both" : undefined,
              animationDelay: animate ? "1.1s" : undefined,
            }}
          />
          {big && winLabel ? (
            <div
              className="font-mono-label absolute whitespace-nowrap rounded bg-ink px-2 py-0.5 text-[10px] font-medium text-page"
              style={{
                left: `${winLeft}%`,
                top: topPad + bandH + 24,
                transform: `translateX(${winLeft > 88 ? "-100%" : "0"})`,
                animation: animate ? "pssnap .4s ease-out both" : undefined,
                animationDelay: animate ? "1.2s" : undefined,
              }}
            >
              {winLabel}
            </div>
          ) : null}
        </>
      ) : null}

      {hasNow ? (
        <>
          <div
            className="absolute w-0.5 bg-accent"
            style={{
              left: `${nowLeft}%`,
              top: big ? 20 : 0,
              bottom: big ? botPad - 10 : 0,
              marginLeft: -1,
              animation: animate ? "psdrop .35s ease-out both" : undefined,
              animationDelay: animate ? "0.8s" : undefined,
            }}
          />
          {big ? (
            <div
              className="font-mono-label absolute whitespace-nowrap rounded bg-accent px-2 py-0.5 text-[10px] font-medium"
              style={{
                left: `${nowLeft}%`,
                top: 0,
                transform: `translateX(${nowTr})`,
                color: "var(--tbl)",
              }}
            >
              {nowLabel}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Sample-data ribbons (Landing / How it works) — fixed Nov 18 2026 winter demo rates. */
export const SAMPLE_RIBBON_RATES = RATE_SET_2026_11_01;
export const SAMPLE_RIBBON_SEASON: Season = "winter";
