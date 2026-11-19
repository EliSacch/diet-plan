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
import Home from "./Home";

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

const fullWeekPlan: PlanDocument = {
  days: ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"].map(
    (day) => ({
      day,
      meals: [
        {
          meal: "Pranzo",
          categories: [
            {
              category: "Primi",
              options: [{ name: "Pasta", amount: 80, unit: "g", position: 0 }],
            },
          ],
        },
      ],
    }),
  ),
};

const riso: WeekChoice = {
  day: "Lunedì",
  meal: "Pranzo",
  category: "Primi",
  name: "Riso",
  amount: 70,
  unit: "g",
};

const pesce: WeekChoice = {
  day: "Martedì",
  meal: "Cena",
  category: "Secondi",
  name: "Pesce",
  amount: 150,
  unit: "g",
};

const thursdayPasta: WeekChoice = {
  day: "Giovedì",
  meal: "Pranzo",
  category: "Primi",
  name: "Pasta",
  amount: 80,
  unit: "g",
};

function mockGet({
  activePlan = () => Promise.resolve(axiosResponse<PlanDocument>(plan)),
  week = (weekStart: string) =>
    Promise.resolve(axiosResponse<Week>({ week_start: weekStart, choices: [] })),
}: {
  activePlan?: () => Promise<AxiosResponse>;
  week?: (weekStart: string) => Promise<AxiosResponse>;
} = {}) {
  return vi.spyOn(api, "get").mockImplementation((url: string) => {
    if (url === "/api/diet-plans/active") {
      return activePlan();
    }
    const [, weekStart = ""] = /^\/api\/weeks\/([^/]+)$/.exec(url) ?? [];
    return week(weekStart);
  });
}

function CurrentUrl() {
  const location = useLocation();
  return <output data-testid="url">{`${location.pathname}${location.search}`}</output>;
}

function renderHome(path = "/") {
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
        <Route path="/" element={<Home />} />
      </Routes>
      <CurrentUrl />
    </MemoryRouter>,
    { wrapper: Wrapper },
  );
}

function dayButton(name: string) {
  return screen.getByRole<HTMLButtonElement>("button", { name });
}

function pressedDay() {
  return screen.getByRole("button", { pressed: true }).getAttribute("aria-label");
}

function currentUrl() {
  return screen.getByTestId("url").textContent;
}

describe("Home", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 19, 10, 0));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    setLocale("en");
    vi.restoreAllMocks();
    document.body.style.overflow = "";
  });

  it("shows a loading line while the active plan is loading", () => {
    vi.spyOn(api, "get").mockReturnValue(deferred<AxiosResponse>().promise);

    renderHome();

    expect(screen.getByText("Loading your diet plan…")).toBeTruthy();
  });

  it("shows the upload button when there is no active plan", async () => {
    const get = mockGet({
      activePlan: () => Promise.reject(axiosFailure(404, { code: "NOT_FOUND" })),
    });

    renderHome();

    expect(await screen.findByLabelText("Upload diet plan")).toBeTruthy();
    expect(screen.getByText(en.labels.NO_DIET_PLAN_YET)).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Next week" })).toBeNull();
    expect(get).not.toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/weeks\//),
      expect.anything(),
    );
  });

  it("shows the catalog message when the active plan request fails", async () => {
    mockGet({
      activePlan: () => Promise.reject(axiosFailure(500, { code: "INTERNAL_ERROR" })),
    });

    renderHome();

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      en.errors.INTERNAL_ERROR,
    );
  });

  it("selects today and shows today's picked options", async () => {
    mockGet({
      activePlan: () => Promise.resolve(axiosResponse(fullWeekPlan)),
      week: (weekStart) =>
        Promise.resolve(axiosResponse<Week>({ week_start: weekStart, choices: [thursdayPasta] })),
    });

    renderHome();

    expect(await screen.findByText("Pasta 80 g")).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(pressedDay()).toBe("Thursday, November 19");
    expect(screen.getByRole("heading", { level: 2, name: "Pranzo" })).toBeTruthy();
    expect(screen.queryByText("Primi")).toBeNull();
    expect(screen.getByRole("button", { name: en.labels.EDIT })).toBeTruthy();
  });

  it("disables unavailable days, falls back to Monday, and switches days", async () => {
    mockGet({
      week: (weekStart) =>
        Promise.resolve(axiosResponse<Week>({ week_start: weekStart, choices: [riso, pesce] })),
    });

    renderHome();

    expect(await screen.findByText("Riso 70 g")).toBeTruthy();
    expect(pressedDay()).toBe("Monday, November 16");
    expect(dayButton("Tuesday, November 17").disabled).toBe(false);
    expect(dayButton("Wednesday, November 18").disabled).toBe(true);
    expect(screen.queryByText("Pesce 150 g")).toBeNull();

    fireEvent.click(dayButton("Tuesday, November 17"));

    expect(pressedDay()).toBe("Tuesday, November 17");
    expect(screen.getByRole("heading", { level: 2, name: "Cena" })).toBeTruthy();
    expect(screen.getByText("Pesce 150 g")).toBeTruthy();
    expect(screen.queryByText("Riso 70 g")).toBeNull();
  });

  it("opens the planner drawer on the selected day, steps days, saves and keeps it open", async () => {
    const saved: Week = { week_start: "2026-11-16", choices: [riso, pesce] };
    mockGet({
      week: (weekStart) =>
        Promise.resolve(axiosResponse<Week>({ week_start: weekStart, choices: [riso] })),
    });
    const put = vi.spyOn(api, "put").mockResolvedValue(axiosResponse(saved));

    renderHome();

    expect(await screen.findByText("Riso 70 g")).toBeTruthy();

    fireEvent.click(dayButton("Tuesday, November 17"));
    expect(screen.getByText(en.labels.NO_CHOICES_FOR_DAY)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: en.labels.PLAN_THIS_WEEK }));

    const drawer = screen.getByRole("dialog", { name: en.labels.PLAN_THIS_WEEK });
    expect(within(drawer).getByText("Tuesday, November 17")).toBeTruthy();

    fireEvent.click(within(drawer).getByRole("button", { name: /^Secondi/ }));
    fireEvent.click(within(drawer).getByRole("radio", { name: "Pesce 150 g" }));
    fireEvent.click(within(drawer).getByRole("button", { name: "Save" }));

    expect(await screen.findByText(en.labels.WEEK_SAVED)).toBeTruthy();
    expect(put).toHaveBeenCalledWith("/api/weeks/2026-11-16", { choices: [riso, pesce] });
    expect(screen.getByRole("dialog", { name: en.labels.PLAN_THIS_WEEK })).toBeTruthy();
    await waitFor(() =>
      expect(within(drawer).getByRole<HTMLButtonElement>("button", { name: "Save" }).disabled).toBe(
        true,
      ),
    );

    fireEvent.click(within(drawer).getByRole("button", { name: "Previous day" }));
    expect(within(drawer).getByText("Monday, November 16")).toBeTruthy();
    expect(pressedDay()).toBe("Monday, November 16");

    fireEvent.click(within(drawer).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Riso 70 g")).toBeTruthy();

    fireEvent.click(dayButton("Tuesday, November 17"));
    expect(screen.getByText("Pesce 150 g")).toBeTruthy();
  });

  it("opens the planner drawer from Edit and shows an error toast when saving fails", async () => {
    mockGet({
      week: (weekStart) =>
        Promise.resolve(axiosResponse<Week>({ week_start: weekStart, choices: [riso] })),
    });
    vi.spyOn(api, "put").mockRejectedValue(axiosFailure(422, { code: "VALIDATION_ERROR" }));

    renderHome();

    expect(await screen.findByText("Riso 70 g")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: en.labels.EDIT }));

    const drawer = screen.getByRole("dialog", { name: en.labels.PLAN_THIS_WEEK });
    fireEvent.click(within(drawer).getByRole("button", { name: /^Primi/ }));
    fireEvent.click(within(drawer).getByRole("radio", { name: "Pasta 80 g" }));
    fireEvent.click(within(drawer).getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      en.errors.VALIDATION_ERROR,
    );
    expect(
      within(drawer).getByRole<HTMLInputElement>("radio", { name: "Pasta 80 g" }).checked,
    ).toBe(true);
    expect(within(drawer).getByRole<HTMLButtonElement>("button", { name: "Save" }).disabled).toBe(
      false,
    );
  });

  it("shows the day picker and a loading indicator while the week is loading", async () => {
    mockGet({
      activePlan: () => Promise.resolve(axiosResponse(fullWeekPlan)),
      week: () => deferred<AxiosResponse>().promise,
    });

    renderHome();

    expect(await screen.findByRole("status", { name: "Loading your week…" })).toBeTruthy();
    expect(pressedDay()).toBe("Thursday, November 19");
    expect(screen.getByRole("link", { name: "Next week" })).toBeTruthy();
  });

  it("shows the catalog message when the week request fails", async () => {
    mockGet({
      week: () => Promise.reject(axiosFailure(500, { code: "INTERNAL_ERROR" })),
    });

    renderHome();

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      en.errors.INTERNAL_ERROR,
    );
    expect(screen.getByRole("link", { name: "Next week" })).toBeTruthy();
  });

  it("moves between weeks with the arrows and loads each week's choices", async () => {
    const get = mockGet({
      activePlan: () => Promise.resolve(axiosResponse(fullWeekPlan)),
      week: (weekStart) =>
        Promise.resolve(
          axiosResponse<Week>({
            week_start: weekStart,
            choices:
              weekStart === "2026-11-23"
                ? [
                    {
                      day: "Lunedì",
                      meal: "Pranzo",
                      category: "Primi",
                      name: "Riso",
                      amount: 70,
                      unit: "g",
                    },
                  ]
                : [thursdayPasta],
          }),
        ),
    });

    renderHome();

    expect(await screen.findByText("Pasta 80 g")).toBeTruthy();
    expect(pressedDay()).toBe("Thursday, November 19");

    fireEvent.click(screen.getByRole("link", { name: "Next week" }));

    expect(currentUrl()).toBe("/?week=2026-11-23");
    expect(await screen.findByText("Riso 70 g")).toBeTruthy();
    expect(pressedDay()).toBe("Monday, November 23");
    expect(get).toHaveBeenCalledWith("/api/weeks/2026-11-23", expect.anything());

    fireEvent.click(screen.getByRole("link", { name: "Previous week" }));

    expect(currentUrl()).toBe("/?week=2026-11-16");
    expect(await screen.findByText("Pasta 80 g")).toBeTruthy();
    expect(pressedDay()).toBe("Thursday, November 19");
  });

  it("normalizes non-Monday week query params and ignores invalid ones", async () => {
    const get = mockGet({
      activePlan: () => Promise.resolve(axiosResponse(fullWeekPlan)),
    });

    renderHome("/?week=2026-11-25");

    expect(await screen.findByText(en.labels.NO_CHOICES_FOR_DAY)).toBeTruthy();
    expect(pressedDay()).toBe("Monday, November 23");
    expect(get).toHaveBeenCalledWith("/api/weeks/2026-11-23", expect.anything());

    cleanup();
    renderHome("/?week=not-a-date");

    expect(await screen.findByText(en.labels.NO_CHOICES_FOR_DAY)).toBeTruthy();
    expect(pressedDay()).toBe("Thursday, November 19");
    expect(get).toHaveBeenCalledWith("/api/weeks/2026-11-16", expect.anything());
  });
});
