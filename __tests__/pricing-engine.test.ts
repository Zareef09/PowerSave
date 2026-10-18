import { describe, expect, it } from "vitest";
import { formatCost, formatTime } from "@/lib/format";
import {
  DEMO_NOW_MIN,
  adviceForChore,
  findBestWindow,
  isQuietMinuteOfDay,
} from "@/lib/pricing";
import { addMinutes, choreCostCentsAt, torontoDate } from "@/lib/rates";

describe("done-by deadlines", () => {
  it("dishwasher by 7:30 PM → run now, cheaper time blocked", () => {
    // NOW 5:30 PM, dishwasher 120 min, deadline 7:30 PM = 1170
    // Can finish by 7:30 if start now (ends 7:30). Best unconstrained is 7 PM but that ends 9 PM.
    const a = adviceForChore("TOU", "Dishwasher", DEMO_NOW_MIN, "weekday", 1, {
      deadlineMin: 1170,
    });
    expect(a.kind).toBe("run-now-deadline");
    expect(a.verdict).toBe("Run now.");
    expect(a.sub).toBe("Can't finish by 7:30 PM at a cheaper time, so run now.");
  });

  it("laundry by 6 PM → can't finish", () => {
    const a = adviceForChore("TOU", "Laundry", DEMO_NOW_MIN, "weekday", 1, {
      deadlineMin: 1080,
    });
    expect(a.kind).toBe("cant-meet-deadline");
    expect(a.verdict).toBe("Can't finish by 6:00 PM.");
    expect(a.sub).toContain("7:00 PM");
  });
});

describe("quiet hours", () => {
  it("marks 10 PM–7 AM as quiet", () => {
    expect(isQuietMinuteOfDay(22 * 60)).toBe(true);
    expect(isQuietMinuteOfDay(6 * 60)).toBe(true);
    expect(isQuietMinuteOfDay(12 * 60)).toBe(false);
  });

  it("skips quiet starts when enabled", () => {
    const open = findBestWindow("ULO", DEMO_NOW_MIN, 3, 90, "weekday");
    const quiet = findBestWindow("ULO", DEMO_NOW_MIN, 3, 90, "weekday", {
      quietHours: true,
    });
    // Unconstrained ULO laundry best is 11 PM (quiet). With quiet hours, best must be awake.
    expect(formatTime(open.bestStartMin)).toBe("11:00 PM");
    expect(isQuietMinuteOfDay(quiet.bestStartMin)).toBe(false);
  });
});

describe("midnight crossing", () => {
  it("prices EV starting 11 PM into next calendar day", () => {
    const start = torontoDate(2026, 11, 18, 23, 0);
    const cost = choreCostCentsAt("ULO", start, 28.8, 240);
    expect(formatCost(cost)).toBe("$1.07");
  });
});

describe("TOU weekends and holidays + Tiered", () => {
  it("TOU weekend any time", () => {
    const a = adviceForChore("TOU", "Laundry", DEMO_NOW_MIN, "weekend");
    expect(a.verdict).toBe("Any time. Same price all day.");
    expect(a.hasSave).toBe(false);
  });

  it("TOU holiday any time", () => {
    const a = adviceForChore("TOU", "Laundry", DEMO_NOW_MIN, "holiday");
    expect(a.verdict).toBe("Any time. Same price all day.");
  });

  it("Tiered any time", () => {
    const a = adviceForChore("TIERED", "EV", DEMO_NOW_MIN, "weekday");
    expect(a.verdict).toBe("Any time. Same price all day.");
  });
});

describe("savings and ties", () => {
  it("hides save under 1¢", () => {
    const a = adviceForChore("TOU", "Laundry", DEMO_NOW_MIN, "weekday", 0.01);
    // scaled save rounds below 1
    expect(a.hasSave).toBe(false);
  });

  it("picks earliest on cost ties", () => {
    // Tiered flat → every start same cost; best stays at now
    const w = findBestWindow("TIERED", 1000, 3, 90, "weekday");
    expect(w.bestStartMin).toBe(1000);
    expect(w.savingCents).toBe(0);
  });
});

describe("DST + rate change same day", () => {
  it("Nov 1 2026 evening uses new winter rates", () => {
    const eve = torontoDate(2026, 11, 1, 18, 0);
    // Sunday → weekend off-peak 9.1
    expect(choreCostCentsAt("TOU", eve, 3, 90)).toBe(
      Math.round((9.1 * 3 * 90) / 90),
    );
    // Jump past midnight into Monday Nov 2 winter weekday
    const monMorning = addMinutes(torontoDate(2026, 11, 2, 8, 0), 0);
    // 90 min from 8 AM Mon winter: on-peak 18.9
    const c = choreCostCentsAt("TOU", monMorning, 3, 90);
    expect(c).toBe(Math.round(18.9 * 3));
  });
});
