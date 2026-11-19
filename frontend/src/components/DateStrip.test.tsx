import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "../i18n";
import { weekdayIndex } from "../utils/date";
import DateStrip from "./DateStrip";

function renderStrip({
  value = "2026-11-19",
  onChange = vi.fn<(isoDate: string) => void>(),
  isDateDisabled,
}: {
  value?: string;
  onChange?: ReturnType<typeof vi.fn<(isoDate: string) => void>>;
  isDateDisabled?: (date: Date) => boolean;
} = {}) {
  const rendered = render(
    <DateStrip value={value} onChange={onChange} isDateDisabled={isDateDisabled} />,
  );
  return { onChange, ...rendered };
}

function days(group = "Day") {
  return within(screen.getByRole("group", { name: group })).getAllByRole<HTMLButtonElement>(
    "button",
  );
}

function month() {
  return document.querySelector(".date-strip-month")?.textContent?.replace(/\s/g, " ");
}

describe("DateStrip", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 19, 10, 0));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    setLocale("en");
  });

  it("renders a scrollable window around the selected date, centers it, and marks today", () => {
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView");
    const { rerender } = renderStrip({ value: "2026-11-20" });

    expect(month()).toBe("November 2026");
    expect(days()).toHaveLength(31);
    expect(screen.getByRole("button", { pressed: true }).getAttribute("aria-label")).toBe(
      "Friday, November 20",
    );
    expect(screen.getByRole("button", { current: "date" }).textContent).toBe("19Thu");
    expect(scroll).toHaveBeenCalledWith({
      behavior: "instant",
      inline: "center",
      block: "nearest",
    });

    rerender(<DateStrip value="2026-12-01" onChange={vi.fn()} />);
    expect(month()).toBe("December 2026");
    expect(scroll).toHaveBeenLastCalledWith({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
    scroll.mockRestore();
  });

  it("steps one day at a time with the previous and next arrows and reports clicked days", () => {
    const { onChange } = renderStrip({ value: "2026-11-19" });

    fireEvent.click(screen.getByRole("button", { name: "Previous day" }));
    expect(onChange).toHaveBeenCalledWith("2026-11-18");

    fireEvent.click(screen.getByRole("button", { name: "Next day" }));
    expect(onChange).toHaveBeenCalledWith("2026-11-20");

    fireEvent.click(screen.getByRole("button", { name: "Sunday, November 22" }));
    expect(onChange).toHaveBeenCalledWith("2026-11-22");
  });

  it("skips disabled weekdays when stepping and disables arrows when all days are unavailable", () => {
    const { onChange, rerender } = renderStrip({
      value: "2026-11-17",
      isDateDisabled: (date) => weekdayIndex(date) >= 2,
    });

    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Wednesday, November 18" }).disabled,
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Next day" }));
    expect(onChange).toHaveBeenCalledWith("2026-11-23");

    onChange.mockClear();
    rerender(<DateStrip value="2026-11-16" onChange={onChange} isDateDisabled={() => true} />);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Previous day" }).disabled).toBe(
      true,
    );
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Next day" }).disabled).toBe(true);
  });

  it("uses the current locale", () => {
    setLocale("it");
    renderStrip({ value: "2026-11-16" });

    expect(month()).toBe("novembre 2026");
    expect(
      screen.getByRole("button", { pressed: true, name: "lunedì 16 novembre" }).textContent,
    ).toBe("16lun");
    expect(screen.getByRole("button", { name: "Giorno precedente" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Giorno successivo" })).toBeTruthy();
    expect(days("Giorno")).toHaveLength(31);
  });

  it("renders nothing for a value that is not an ISO date", () => {
    const { container } = renderStrip({ value: "not-a-date" });

    expect(container.firstChild).toBeNull();
  });
});
