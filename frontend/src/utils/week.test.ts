import { afterEach, describe, expect, it, vi } from "vitest";

import {
  addDays,
  addWeeks,
  currentMonday,
  mondayOf,
  parseIsoDate,
  toIsoDate,
  weekDates,
} from "./week";

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

describe("mondayOf", () => {
  it.each([
    ["2026-11-16", "2026-11-16"],
    ["2026-11-18", "2026-11-16"],
    ["2026-11-22", "2026-11-16"],
    ["2026-12-01", "2026-11-30"],
    ["2027-01-01", "2026-12-28"],
  ])("finds the Monday of %s", (day, monday) => {
    expect(toIsoDate(mondayOf(parseIsoDate(day) as Date))).toBe(monday);
  });
});

describe("addDays", () => {
  it("moves across month and year ends", () => {
    expect(toIsoDate(addDays(new Date(2026, 11, 28), 6))).toBe("2027-01-03");
  });
});

describe("addWeeks", () => {
  it.each([
    ["2026-11-16", 1, "2026-11-23"],
    ["2026-11-30", -1, "2026-11-23"],
    ["2026-12-28", 1, "2027-01-04"],
    ["2027-01-04", -1, "2026-12-28"],
    ["2026-03-23", 1, "2026-03-30"],
    ["2026-10-19", 1, "2026-10-26"],
  ])("moves %s by %i week(s)", (start, weeks, expected) => {
    expect(addWeeks(start, weeks)).toBe(expected);
  });

  it("throws for a value that is not an ISO date", () => {
    expect(() => addWeeks("next week", 1)).toThrow(RangeError);
  });
});

describe("weekDates", () => {
  it("returns the seven local dates from Monday to Sunday", () => {
    expect(weekDates("2026-12-28").map(toIsoDate)).toEqual([
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
    ]);
  });

  it("throws for a value that is not an ISO date", () => {
    expect(() => weekDates("this week")).toThrow(RangeError);
  });
});

describe("currentMonday", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the Monday of the current local week", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 22, 23, 30));

    expect(currentMonday()).toBe("2026-11-16");
  });
});
