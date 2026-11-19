import { afterEach, describe, expect, it, vi } from "vitest";

import { addDays, parseIsoDate, shiftIsoDate, todayIso, toIsoDate, weekdayIndex } from "./date";

describe("toIsoDate", () => {
  it("formats the local calendar date with padding", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toIsoDate(new Date(2026, 10, 16, 23, 59))).toBe("2026-11-16");
  });
});

describe("parseIsoDate", () => {
  it("reads a YYYY-MM-DD date as local midnight", () => {
    const date = parseIsoDate("2026-11-16");

    expect(date).toEqual(new Date(2026, 10, 16));
  });

  it.each(["2026-11-16T00:00:00", "20261116", "16/11/2026", "2026-1-5", "", "nope"])(
    "rejects %j",
    (value) => {
      expect(parseIsoDate(value)).toBeNull();
    },
  );

  it.each(["2026-02-30", "2026-13-01", "2026-00-10", "2026-04-31"])(
    "rejects the impossible date %j",
    (value) => {
      expect(parseIsoDate(value)).toBeNull();
    },
  );
});

describe("addDays", () => {
  it("moves across month and year ends", () => {
    expect(toIsoDate(addDays(new Date(2026, 11, 28), 6))).toBe("2027-01-03");
  });
});

describe("shiftIsoDate", () => {
  it.each([
    ["2026-11-19", 1, "2026-11-20"],
    ["2026-11-19", -1, "2026-11-18"],
    ["2026-12-31", 1, "2027-01-01"],
  ])("shifts %s by %i day(s)", (start, days, expected) => {
    expect(shiftIsoDate(start, days)).toBe(expected);
  });

  it("throws for a value that is not an ISO date", () => {
    expect(() => shiftIsoDate("tomorrow", 1)).toThrow(RangeError);
  });
});

describe("weekdayIndex", () => {
  it.each([
    ["2026-11-16", 0],
    ["2026-11-17", 1],
    ["2026-11-19", 3],
    ["2026-11-22", 6],
  ])("maps %s to 0-based Monday-first index %i", (iso, expected) => {
    expect(weekdayIndex(parseIsoDate(iso) as Date)).toBe(expected);
  });
});

describe("todayIso", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns today's local ISO date", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 19, 23, 30));

    expect(todayIso()).toBe("2026-11-19");
  });
});
