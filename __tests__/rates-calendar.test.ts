import { describe, expect, it } from "vitest";
import {
  RATE_SET_2025_11_01,
  RATE_SET_2026_11_01,
  dayKindForInstant,
  holidayIsoDatesForTests,
  isTouHolidayIso,
  periodAt,
  priceCentsAt,
  rateSetForInstant,
  seasonForInstant,
  torontoDate,
} from "@/lib/rates";

describe("OEB holiday calendar", () => {
  it("includes official 2026 pricing days", () => {
    expect(isTouHolidayIso("2026-02-16")).toBe(true);
    expect(isTouHolidayIso("2026-12-28")).toBe(true);
    expect(isTouHolidayIso("2026-12-26")).toBe(false);
  });

  it("includes derived 2027 pricing days from the brief", () => {
    const expected = [
      "2027-01-01",
      "2027-02-15",
      "2027-03-26",
      "2027-05-24",
      "2027-07-01",
      "2027-08-02",
      "2027-09-06",
      "2027-10-11",
      "2027-12-27",
      "2027-12-28",
    ];
    for (const d of expected) {
      expect(isTouHolidayIso(d)).toBe(true);
    }
    expect(holidayIsoDatesForTests().filter((d) => d.startsWith("2027-"))).toEqual(expected);
  });

  it("treats holidays as holiday day-kind", () => {
    expect(dayKindForInstant(torontoDate(2026, 12, 25, 12, 0))).toBe("holiday");
    expect(dayKindForInstant(torontoDate(2026, 11, 21, 12, 0))).toBe("weekend");
    expect(dayKindForInstant(torontoDate(2026, 11, 18, 17, 30))).toBe("weekday");
  });
});

describe("rate sets by effective date", () => {
  it("uses Nov 1 2025 rates before Nov 1 2026", () => {
    const set = rateSetForInstant(torontoDate(2026, 10, 17, 12, 0));
    expect(set.effective).toBe(RATE_SET_2025_11_01.effective);
    expect(set.cents.tou.off).toBe(9.8);
    expect(set.verified).toBe(true);
  });

  it("switches to Nov 1 2026 rates on that morning", () => {
    const set = rateSetForInstant(torontoDate(2026, 11, 1, 0, 30));
    expect(set.effective).toBe(RATE_SET_2026_11_01.effective);
    expect(set.cents.tou.off).toBe(9.1);
    expect(set.cents.ulo.on).toBe(37.7);
    expect(set.verified).toBe(true);
  });

  it("uses summer TOU hours before Nov 1", () => {
    // Wed Oct 14 2026 12:00 — summer on-peak 11–5
    const noon = torontoDate(2026, 10, 14, 12, 0);
    expect(seasonForInstant(noon)).toBe("summer");
    expect(priceCentsAt("TOU", noon)).toBe(20.3);
    // 8 AM summer mid-peak
    expect(priceCentsAt("TOU", torontoDate(2026, 10, 14, 8, 0))).toBe(15.7);
  });

  it("uses winter TOU hours from Nov 1", () => {
    // Mon Nov 2 2026 12:00 — winter mid-peak 11–5
    const noon = torontoDate(2026, 11, 2, 12, 0);
    expect(seasonForInstant(noon)).toBe("winter");
    expect(priceCentsAt("TOU", noon)).toBe(14.6);
    // 8 AM winter on-peak
    expect(priceCentsAt("TOU", torontoDate(2026, 11, 2, 8, 0))).toBe(18.9);
  });

  it("ULO hours do not change by season", () => {
    const summerOn = periodAt("ULO", 17 * 60, {
      day: "weekday",
      season: "summer",
      rates: RATE_SET_2025_11_01,
    });
    const winterOn = periodAt("ULO", 17 * 60, {
      day: "weekday",
      season: "winter",
      rates: RATE_SET_2026_11_01,
    });
    expect(summerOn.key).toBe("on");
    expect(winterOn.key).toBe("on");
  });
});

describe("DST end day Nov 1 2026", () => {
  it("applies new rates and winter season on DST end day", () => {
    // First Sunday of Nov 2026 is Nov 1 — clocks fall back 2 AM → 1 AM.
    const afterRates = torontoDate(2026, 11, 1, 3, 0);
    expect(rateSetForInstant(afterRates).effective).toBe("2026-11-01");
    expect(seasonForInstant(afterRates)).toBe("winter");
    // 8 AM Sunday = weekend off-peak all day on new rates
    expect(dayKindForInstant(torontoDate(2026, 11, 1, 8, 0))).toBe("weekend");
    expect(priceCentsAt("TOU", torontoDate(2026, 11, 1, 8, 0))).toBe(9.1);
  });
});
