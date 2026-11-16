import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import { ToastProvider } from "../context/ToastContext";
import { setLocale } from "../i18n";
import { axiosFailure, axiosResponse, deferred } from "../test/http";
import type { PlanDocument } from "../types/diet-plan";
import type { Week, WeekChoice } from "../types/week";
import WeekPlan from "./WeekPlan";

import { en } from "../i18n/locales/en";

import type { AxiosResponse } from "axios";

const plan: PlanDocument = {
  days: [
    {
      day: "Lunedì",
      meals: [
        {
          meal: "Pranzo",
          categories: [
            {
              category: "Primi",
              options: [
                { name: "Pasta", amount: 80, unit: "g", position: 0 },
                { name: "Riso", amount: 70, unit: "g", position: 1 },
              ],
            },
          ],
        },
      ],
    },
    {
      day: "Martedì",
      meals: [
        {
          meal: "Cena",
          categories: [
            {
              category: "Secondi",
              options: [{ name: "Pesce", amount: 150, unit: "g", position: 0 }],
            },
          ],
        },
      ],
    },
  ],
};

const riso: WeekChoice = {
  day: "Lunedì",
  meal: "Pranzo",
  category: "Primi",
  name: "Riso",
  amount: 70,
  unit: "g",
};

function emptyWeek(weekStart: string): Week {
  return { week_start: weekStart, choices: [] };
}

function mockGet({
  options = () => Promise.resolve(axiosResponse<PlanDocument>(plan)),
  week = (weekStart: string) => Promise.resolve(axiosResponse(emptyWeek(weekStart))),
}: {
  options?: () => Promise<AxiosResponse>;
  week?: (weekStart: string) => Promise<AxiosResponse>;
} = {}) {
  return vi.spyOn(api, "get").mockImplementation((url: string) => {
    const [, weekStart = "", options_] = /^\/api\/weeks\/([^/]+)(\/options)?$/.exec(url) ?? [];
    return options_ === undefined ? week(weekStart) : options();
  });
}

function CurrentPath() {
  return <output data-testid="path">{useLocation().pathname}</output>;
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    );
  }
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/weeks" element={<WeekPlan />} />
        <Route path="/weeks/:weekStart" element={<WeekPlan />} />
      </Routes>
      <CurrentPath />
    </MemoryRouter>,
    { wrapper: Wrapper },
  );
}

function path() {
  return screen.getByTestId("path").textContent;
}

function dayButton(name: string) {
  return screen.getByRole<HTMLButtonElement>("button", { name });
}

function pressedDay() {
  return screen.getByRole("button", { pressed: true }).getAttribute("aria-label");
}

function primi() {
  return within(screen.getByRole("radiogroup", { name: "Primi" }));
}

describe("WeekPlan", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 19, 10, 0));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    setLocale("en");
  });

  it("opens the current week from /weeks", () => {
    mockGet();
    renderAt("/weeks");

    expect(path()).toBe("/weeks/2026-11-16");
    expect(screen.getByRole("heading", { level: 1, name: "Week" })).toBeTruthy();
  });

  it("moves a date that is not a Monday to its week's Monday", () => {
    mockGet();
    renderAt("/weeks/2026-11-22");

    expect(path()).toBe("/weeks/2026-11-16");
  });

  it.each(["/weeks/not-a-date", "/weeks/2026-02-30", "/weeks/2026-11-16T00:00"])(
    "opens the current week for %s",
    (url) => {
      mockGet();
      renderAt(url);

      expect(path()).toBe("/weeks/2026-11-16");
    },
  );

  it("moves between weeks with the arrows and loads each week", async () => {
    const get = mockGet();
    renderAt("/weeks/2026-12-28");

    expect(path()).toBe("/weeks/2026-12-28");

    fireEvent.click(screen.getByRole("link", { name: "Next week" }));
    expect(path()).toBe("/weeks/2027-01-04");

    fireEvent.click(screen.getByRole("link", { name: "Previous week" }));
    fireEvent.click(screen.getByRole("link", { name: "Previous week" }));
    expect(path()).toBe("/weeks/2026-12-21");

    await screen.findByRole("radiogroup", { name: "Primi" });
    expect(get).toHaveBeenCalledWith("/api/weeks/2026-12-21", expect.anything());
    expect(get).toHaveBeenCalledWith("/api/weeks/2026-12-21/options", expect.anything());
  });

  it("selects today while the current week is loading", () => {
    mockGet({ week: () => deferred<AxiosResponse>().promise });
    renderAt("/weeks/2026-11-16");

    expect(pressedDay()).toBe("Thursday, November 19");
  });

  it("selects Monday in another week", () => {
    mockGet({ week: () => deferred<AxiosResponse>().promise });
    renderAt("/weeks/2026-11-23");

    expect(pressedDay()).toBe("Monday, November 23");
  });

  it("disables the days the plan doesn't have and falls back to Monday", async () => {
    mockGet();
    renderAt("/weeks/2026-11-16");

    await screen.findByRole("radiogroup", { name: "Primi" });
    expect(pressedDay()).toBe("Monday, November 16");
    expect(dayButton("Tuesday, November 17").disabled).toBe(false);
    expect(dayButton("Wednesday, November 18").disabled).toBe(true);
    expect(dayButton("Sunday, November 22").disabled).toBe(true);
  });

  it("shows the clicked day of the plan", async () => {
    mockGet();
    renderAt("/weeks/2026-11-16");

    await screen.findByRole("radiogroup", { name: "Primi" });
    fireEvent.click(dayButton("Tuesday, November 17"));

    expect(pressedDay()).toBe("Tuesday, November 17");
    expect(screen.getByRole("heading", { level: 2, name: "Cena" })).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: "Secondi" })).toBeTruthy();
    expect(screen.queryByRole("radiogroup", { name: "Primi" })).toBeNull();
  });

  it("shows a loading line while the week is loading", () => {
    mockGet({ week: () => deferred<AxiosResponse>().promise });
    renderAt("/weeks/2026-11-16");

    expect(screen.getByRole("status", { name: "Loading your week…" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Next week" })).toBeTruthy();
  });

  it("shows the upload button when there is no active plan", async () => {
    mockGet({ options: () => Promise.reject(axiosFailure(404, { code: "NOT_FOUND" })) });
    renderAt("/weeks/2026-11-16");

    expect(await screen.findByText(en.labels.NO_DIET_PLAN_YET)).toBeTruthy();
    expect(screen.getByLabelText("Upload diet plan")).toBeTruthy();
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("shows the catalog message when the options request fails", async () => {
    mockGet({ options: () => Promise.reject(axiosFailure(500, { code: "INTERNAL_ERROR" })) });
    renderAt("/weeks/2026-11-16");

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      en.errors.INTERNAL_ERROR,
    );
  });

  it("shows the catalog message when the week request fails", async () => {
    mockGet({
      week: () => Promise.reject(axiosFailure(422, { code: "VALIDATION_ERROR" })),
    });
    renderAt("/weeks/2026-11-16");

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      en.errors.VALIDATION_ERROR,
    );
  });

  it("saves the picks, confirms with a toast and shows them after a reload", async () => {
    const saved: Week = { week_start: "2026-11-16", choices: [riso] };
    mockGet();
    const put = vi.spyOn(api, "put").mockResolvedValue(axiosResponse(saved));
    renderAt("/weeks/2026-11-16");

    fireEvent.click(await screen.findByRole("radio", { name: "Riso 70 g" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText(en.labels.WEEK_SAVED)).toBeTruthy();
    expect(put).toHaveBeenCalledWith("/api/weeks/2026-11-16", { choices: [riso] });
    await waitFor(() =>
      expect(screen.getByRole<HTMLButtonElement>("button", { name: "Save" }).disabled).toBe(true),
    );

    cleanup();
    mockGet({ week: () => Promise.resolve(axiosResponse(saved)) });
    renderAt("/weeks/2026-11-16");

    const reloaded = await screen.findByRole<HTMLInputElement>("radio", { name: "Riso 70 g" });
    expect(reloaded.checked).toBe(true);
    expect(primi().getByRole<HTMLInputElement>("radio", { name: "Pasta 80 g" }).checked).toBe(
      false,
    );
  });

  it("shows an error toast and keeps the picks when the save fails", async () => {
    mockGet();
    vi.spyOn(api, "put").mockRejectedValue(axiosFailure(422, { code: "VALIDATION_ERROR" }));
    renderAt("/weeks/2026-11-16");

    fireEvent.click(await screen.findByRole("radio", { name: "Riso 70 g" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      en.errors.VALIDATION_ERROR,
    );
    expect(primi().getByRole<HTMLInputElement>("radio", { name: "Riso 70 g" }).checked).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Save" }).disabled).toBe(false);
  });
});
