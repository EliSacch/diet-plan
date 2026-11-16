import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "../i18n";
import WeekPlan from "./WeekPlan";

function CurrentPath() {
  return <output data-testid="path">{useLocation().pathname}</output>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/weeks" element={<WeekPlan />} />
        <Route path="/weeks/:weekStart" element={<WeekPlan />} />
      </Routes>
      <CurrentPath />
    </MemoryRouter>,
  );
}

function path() {
  return screen.getByTestId("path").textContent;
}

describe("WeekPlan", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 19, 10, 0));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    setLocale("en");
  });

  it("opens the current week from /weeks", () => {
    renderAt("/weeks");

    expect(path()).toBe("/weeks/2026-11-16");
    expect(screen.getByRole("heading", { level: 1, name: "Week" })).toBeTruthy();
  });

  it("moves a date that is not a Monday to its week's Monday", () => {
    renderAt("/weeks/2026-11-22");

    expect(path()).toBe("/weeks/2026-11-16");
  });

  it.each(["/weeks/not-a-date", "/weeks/2026-02-30", "/weeks/2026-11-16T00:00"])(
    "opens the current week for %s",
    (url) => {
      renderAt(url);

      expect(path()).toBe("/weeks/2026-11-16");
    },
  );

  it("shows the week and moves between weeks with the arrows", () => {
    renderAt("/weeks/2026-12-28");

    expect(path()).toBe("/weeks/2026-12-28");

    fireEvent.click(screen.getByRole("link", { name: "Next week" }));
    expect(path()).toBe("/weeks/2027-01-04");

    fireEvent.click(screen.getByRole("link", { name: "Previous week" }));
    fireEvent.click(screen.getByRole("link", { name: "Previous week" }));
    expect(path()).toBe("/weeks/2026-12-21");
  });
});
