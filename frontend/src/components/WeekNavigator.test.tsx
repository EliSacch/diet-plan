import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { setLocale } from "../i18n";
import WeekNavigator from "./WeekNavigator";

function renderNavigator(weekStart: string) {
  return render(
    <MemoryRouter>
      <WeekNavigator weekStart={weekStart} />
    </MemoryRouter>,
  );
}

function rangeText() {
  return screen.getByRole("navigation", { name: "Week" }).querySelector("p")?.textContent;
}

function normalized(text: string | null | undefined) {
  return text?.replace(/\s/g, " ");
}

describe("WeekNavigator", () => {
  afterEach(() => {
    cleanup();
    setLocale("en");
  });

  it("shows the Monday to Sunday range", () => {
    renderNavigator("2026-11-16");

    expect(normalized(rangeText())).toBe("Nov 16 – 22, 2026");
  });

  it("shows ranges that cross a month or a year", () => {
    renderNavigator("2026-12-28");

    expect(normalized(rangeText())).toBe("Dec 28, 2026 – Jan 3, 2027");
  });

  it("links to the previous and next Mondays", () => {
    renderNavigator("2026-12-28");

    expect(screen.getByRole("link", { name: "Previous week" }).getAttribute("href")).toBe(
      "/weeks/2026-12-21",
    );
    expect(screen.getByRole("link", { name: "Next week" }).getAttribute("href")).toBe(
      "/weeks/2027-01-04",
    );
  });

  it("uses the current locale for the range and the labels", () => {
    setLocale("it");

    renderNavigator("2026-11-30");

    const nav = screen.getByRole("navigation", { name: "Settimana" });
    expect(normalized(nav.querySelector("p")?.textContent)).toBe("30 nov – 06 dic 2026");
    expect(screen.getByRole("link", { name: "Settimana precedente" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Settimana successiva" })).toBeTruthy();
  });

  it("renders nothing for a value that is not a date", () => {
    const { container } = renderNavigator("not-a-date");

    expect(container.firstChild).toBeNull();
  });
});
