import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "../i18n";
import WeekDayPicker from "./WeekDayPicker";

function renderPicker({
  weekStart = "2026-11-16",
  value = 0,
  onChange = vi.fn(),
  isDayDisabled,
}: {
  weekStart?: string;
  value?: number;
  onChange?: (index: number) => void;
  isDayDisabled?: (index: number) => boolean;
} = {}) {
  return render(
    <MemoryRouter>
      <WeekDayPicker
        weekStart={weekStart}
        value={value}
        onChange={onChange}
        weekHref={(week) => `/somewhere/${week}`}
        isDayDisabled={isDayDisabled}
      />
    </MemoryRouter>,
  );
}

function days(group = "Day") {
  return within(screen.getByRole("group", { name: group })).getAllByRole<HTMLButtonElement>(
    "button",
  );
}

function month() {
  return document.querySelector(".week-day-picker-month")?.textContent?.replace(/\s/g, " ");
}

describe("WeekDayPicker", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 19, 10, 0));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    setLocale("en");
  });

  it("shows the month and the seven days of the week", () => {
    renderPicker();

    expect(month()).toBe("November 2026");
    expect(days().map((day) => day.textContent)).toEqual([
      "16Mon",
      "17Tue",
      "18Wed",
      "19Thu",
      "20Fri",
      "21Sat",
      "22Sun",
    ]);
    expect(days()[0]?.getAttribute("aria-label")).toBe("Monday, November 16");
  });

  it.each([
    ["2026-11-30", "November – December 2026"],
    ["2026-12-28", "December 2026 – January 2027"],
  ])("shows both months for the week of %s", (weekStart, expected) => {
    renderPicker({ weekStart });

    expect(month()).toBe(expected);
  });

  it("marks the selected day and today", () => {
    renderPicker({ value: 2 });

    expect(days().map((day) => day.getAttribute("aria-pressed"))).toEqual([
      "false",
      "false",
      "true",
      "false",
      "false",
      "false",
      "false",
    ]);
    expect(screen.getByRole("button", { current: "date" }).textContent).toBe("19Thu");
  });

  it("does not mark today in another week", () => {
    renderPicker({ weekStart: "2026-11-23" });

    expect(screen.queryByRole("button", { current: "date" })).toBeNull();
  });

  it("reports the clicked day", () => {
    const onChange = vi.fn();
    renderPicker({ onChange });

    fireEvent.click(screen.getByRole("button", { name: "Friday, November 20" }));

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("disables the days the caller marks as unavailable", () => {
    const onChange = vi.fn();
    renderPicker({ onChange, isDayDisabled: (index) => index >= 5 });

    expect(days().map((day) => day.disabled)).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
      true,
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Sunday, November 22" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("links the arrows to the previous and next weeks", () => {
    renderPicker({ weekStart: "2026-12-28" });

    expect(screen.getByRole("link", { name: "Previous week" }).getAttribute("href")).toBe(
      "/somewhere/2026-12-21",
    );
    expect(screen.getByRole("link", { name: "Next week" }).getAttribute("href")).toBe(
      "/somewhere/2027-01-04",
    );
  });

  it("uses the current locale", () => {
    setLocale("it");
    renderPicker();

    expect(month()).toBe("novembre 2026");
    expect(days("Giorno")[0]?.textContent).toBe("16lun");
    expect(screen.getByRole("link", { name: "Settimana precedente" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Settimana successiva" })).toBeTruthy();
  });

  it("renders nothing for a value that is not a date", () => {
    const { container } = renderPicker({ weekStart: "not-a-date" });

    expect(container.firstChild).toBeNull();
  });
});
