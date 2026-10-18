import { describe, expect, it } from "vitest";
import { formatCost, formatTime } from "@/lib/format";
import {
  CHORES,
  DEMO_NOW_MIN,
  TIERED_VERDICT,
  adviceForChore,
  choreCostCents,
  findBestWindow,
} from "@/lib/pricing";
import type { PlanId } from "@/lib/rates/2026-11-01";

/**
 * Golden values from Checks.dc.html / section 8.
 * Wed Nov 18, 2026, 5:30 PM. Winter weekday. Rates as of Nov 1, 2026.
 * 25 checks = 6 chores × 4 fields + 1 Tiered verdict.
 */

type GoldenRow = {
  plan: PlanId;
  chore: keyof typeof CHORES;
  runNow: string;
  bestStart: string;
  bestCost: string;
  saving: string;
};

const GOLDEN: GoldenRow[] = [
  {
    plan: "TOU",
    chore: "Laundry",
    runNow: "57¢",
    bestStart: "7:00 PM",
    bestCost: "27¢",
    saving: "30¢",
  },
  {
    plan: "TOU",
    chore: "Dishwasher",
    runNow: "20¢",
    bestStart: "7:00 PM",
    bestCost: "11¢",
    saving: "9¢",
  },
  {
    plan: "TOU",
    chore: "EV",
    runNow: "$3.68",
    bestStart: "7:00 PM",
    bestCost: "$2.62",
    saving: "$1.06",
  },
  {
    plan: "ULO",
    chore: "Laundry",
    runNow: "$1.13",
    bestStart: "11:00 PM",
    bestCost: "11¢",
    saving: "$1.02",
  },
  {
    plan: "ULO",
    chore: "Dishwasher",
    runNow: "45¢",
    bestStart: "11:00 PM",
    bestCost: "4¢",
    saving: "41¢",
  },
  {
    plan: "ULO",
    chore: "EV",
    runNow: "$10.03",
    bestStart: "11:00 PM",
    bestCost: "$1.07",
    saving: "$8.96",
  },
];

describe("Checks.dc.html golden values (Wed Nov 18 2026, 5:30 PM)", () => {
  for (const row of GOLDEN) {
    const { kwh, durationMin } = CHORES[row.chore];
    const w = findBestWindow(row.plan, DEMO_NOW_MIN, kwh, durationMin, "weekday");

    it(`${row.plan} ${row.chore} Run now`, () => {
      expect(formatCost(w.nowCostCents)).toBe(row.runNow);
    });

    it(`${row.plan} ${row.chore} Best start`, () => {
      expect(formatTime(w.bestStartMin)).toBe(row.bestStart);
    });

    it(`${row.plan} ${row.chore} Best cost`, () => {
      expect(formatCost(w.bestCostCents)).toBe(row.bestCost);
    });

    it(`${row.plan} ${row.chore} Saving`, () => {
      expect(formatCost(w.savingCents)).toBe(row.saving);
    });
  }

  it("Tiered Any chore Verdict", () => {
    expect(TIERED_VERDICT).toBe("Any time. Same price all day.");
  });

  it("TOU weekend Any chore Verdict", () => {
    const a = adviceForChore("TOU", "Laundry", DEMO_NOW_MIN, "weekend");
    expect(a.verdict).toBe(TIERED_VERDICT);
    expect(a.hasSave).toBe(false);
  });
});

describe("pricing helpers match Checks algorithm", () => {
  it("rounds TOU laundry at 5:30 PM to 57¢", () => {
    expect(choreCostCents("TOU", 1050, 3, 90, "weekday")).toBe(57);
  });
});
