import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import { ToastProvider } from "../context/ToastContext";
import { setLocale } from "../i18n";
import { axiosFailure, axiosResponse, deferred } from "../test/http";
import type { Day, DayChoice, DayOptions } from "../types/day";
import type { PlanDocument } from "../types/diet-plan";
import { parseIsoDate, weekdayIndex } from "../utils/date";
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

const riso: DayChoice = {
  meal: "Pranzo",
  category: "Primi",
  name: "Riso",
  amount: 70,
  unit: "g",
};

const pesce: DayChoice = {
  meal: "Cena",
  category: "Secondi",
  name: "Pesce",
  amount: 150,
  unit: "g",
};

const pasta: DayChoice = {
  meal: "Pranzo",
  category: "Primi",
  name: "Pasta",
  amount: 80,
  unit: "g",
};

function dayOptionsFrom(source: PlanDocument, date: string): DayOptions | undefined {
  const planDay = source.days[weekdayIndex(parseIsoDate(date)!)];
  if (planDay === undefined) {
    return undefined;
  }
  return {
    day: planDay.day,
    meals: planDay.meals.map((meal) => ({
      meal: meal.meal,
      categories: meal.categories.map((category) => ({
        ...category,
        custom_options: [],
        current: null,
      })),
    })),
  };
}

function mockGet({
  activePlan = () => Promise.resolve(axiosResponse<PlanDocument>(plan)),
  day = (date: string) => Promise.resolve(axiosResponse<Day>({ date, choices: [] })),
  options = (date: string) => {
    const found = dayOptionsFrom(plan, date);
    return found === undefined
      ? Promise.reject(axiosFailure(404, { code: "NOT_FOUND" }))
      : Promise.resolve(axiosResponse(found));
  },
}: {
  activePlan?: () => Promise<AxiosResponse>;
  day?: (date: string) => Promise<AxiosResponse>;
  options?: (date: string) => Promise<AxiosResponse>;
} = {}) {
  return vi.spyOn(api, "get").mockImplementation((url: string) => {
    if (url === "/api/diet-plans/active") {
      return activePlan();
    }
    const [, optionsDate] = /^\/api\/days\/([^/]+)\/options$/.exec(url) ?? [];
    if (optionsDate !== undefined) {
      return options(optionsDate);
    }
    const [, date = ""] = /^\/api\/days\/([^/]+)$/.exec(url) ?? [];
    return day(date);
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
    expect(screen.getByRole("heading", { name: "DietPlan", level: 1 })).toBeTruthy();
    expect(screen.getByText(en.labels.WELCOME_UPLOAD_MEAL_PLAN)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Next day" })).toBeNull();
    expect(get).not.toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/days\//),
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
      day: (date) => Promise.resolve(axiosResponse<Day>({ date, choices: [pasta] })),
    });

    renderHome();

    expect(await screen.findByText("Pasta 80 g")).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(pressedDay()).toBe("Thursday, November 19");
    expect(screen.getByRole("heading", { level: 2, name: "Pranzo" })).toBeTruthy();
    expect(screen.queryByText("Primi")).toBeNull();
    expect(screen.getByRole("button", { name: en.labels.EDIT })).toBeTruthy();
  });

  it("disables unavailable weekdays, falls back to the latest available day, and switches days fluidly", async () => {
    const get = mockGet({
      day: (date) =>
        Promise.resolve(
          axiosResponse<Day>({
            date,
            choices: date === "2026-11-17" ? [pesce] : [riso],
          }),
        ),
    });

    renderHome();

    expect(await screen.findByText("Pesce 150 g")).toBeTruthy();
    expect(pressedDay()).toBe("Tuesday, November 17");
    expect(dayButton("Monday, November 16").disabled).toBe(false);
    expect(dayButton("Wednesday, November 18").disabled).toBe(true);
    expect(get).toHaveBeenCalledWith("/api/days/2026-11-17", expect.anything());

    fireEvent.click(screen.getByRole("button", { name: "Previous day" }));

    expect(currentUrl()).toBe("/?date=2026-11-16");
    expect(pressedDay()).toBe("Monday, November 16");
    expect(await screen.findByText("Riso 70 g")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next day" }));
    expect(currentUrl()).toBe("/?date=2026-11-17");
  });

  it("clears the date query param when returning to today", async () => {
    mockGet({
      activePlan: () => Promise.resolve(axiosResponse(fullWeekPlan)),
      day: (date) =>
        Promise.resolve(
          axiosResponse<Day>({ date, choices: date === "2026-11-20" ? [riso] : [pasta] }),
        ),
    });

    renderHome();

    expect(await screen.findByText("Pasta 80 g")).toBeTruthy();
    expect(currentUrl()).toBe("/");

    fireEvent.click(screen.getByRole("button", { name: "Next day" }));
    expect(currentUrl()).toBe("/?date=2026-11-20");
    expect(await screen.findByText("Riso 70 g")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Previous day" }));
    expect(currentUrl()).toBe("/");
    expect(await screen.findByText("Pasta 80 g")).toBeTruthy();
  });

  it("opens the planner drawer, saves the day, keeps it open, and steps days", async () => {
    const saved: Day = { date: "2026-11-17", choices: [pesce] };
    mockGet({
      day: (date) =>
        Promise.resolve(axiosResponse<Day>({ date, choices: date === "2026-11-16" ? [riso] : [] })),
    });
    const put = vi.spyOn(api, "put").mockResolvedValue(axiosResponse(saved));

    renderHome();

    expect(await screen.findByText(en.labels.NO_CHOICES_FOR_DAY)).toBeTruthy();
    expect(pressedDay()).toBe("Tuesday, November 17");

    fireEvent.click(screen.getByRole("button", { name: en.labels.PLAN_THIS_DAY }));

    const drawer = screen.getByRole("dialog", { name: en.labels.PLAN_THIS_DAY });
    expect(within(drawer).getByText("Tuesday, November 17")).toBeTruthy();

    fireEvent.click(await within(drawer).findByRole("button", { name: /^Secondi/ }));
    fireEvent.click(within(drawer).getByRole("radio", { name: "Pesce 150 g" }));
    fireEvent.click(within(drawer).getByRole("button", { name: "Save" }));

    expect(await screen.findByText(en.labels.DAY_SAVED)).toBeTruthy();
    expect(put).toHaveBeenCalledWith("/api/days/2026-11-17", { choices: [pesce] });
    expect(screen.getByRole("dialog", { name: en.labels.PLAN_THIS_DAY })).toBeTruthy();
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
    expect(await screen.findByText("Riso 70 g")).toBeTruthy();
  });

  it("opens the planner drawer from Edit and shows an error toast when saving fails", async () => {
    mockGet({
      day: (date) => Promise.resolve(axiosResponse<Day>({ date, choices: [pesce] })),
    });
    vi.spyOn(api, "put").mockRejectedValue(axiosFailure(422, { code: "VALIDATION_ERROR" }));

    renderHome();

    expect(await screen.findByText("Pesce 150 g")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: en.labels.EDIT }));

    const drawer = screen.getByRole("dialog", { name: en.labels.PLAN_THIS_DAY });
    fireEvent.click(await within(drawer).findByRole("button", { name: /^Secondi/ }));
    fireEvent.click(within(drawer).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    cleanup();
    mockGet({
      day: (date) => Promise.resolve(axiosResponse<Day>({ date, choices: [riso] })),
    });
    vi.spyOn(api, "put").mockRejectedValue(axiosFailure(422, { code: "VALIDATION_ERROR" }));

    renderHome("/?date=2026-11-16");
    expect(await screen.findByText("Riso 70 g")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: en.labels.EDIT }));
    const mondayDrawer = screen.getByRole("dialog", { name: en.labels.PLAN_THIS_DAY });
    fireEvent.click(await within(mondayDrawer).findByRole("button", { name: /^Primi/ }));
    fireEvent.click(within(mondayDrawer).getByRole("radio", { name: "Pasta 80 g" }));
    fireEvent.click(within(mondayDrawer).getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      en.errors.VALIDATION_ERROR,
    );
    expect(
      within(mondayDrawer).getByRole<HTMLInputElement>("radio", { name: "Pasta 80 g" }).checked,
    ).toBe(true);
    expect(
      within(mondayDrawer).getByRole<HTMLButtonElement>("button", { name: "Save" }).disabled,
    ).toBe(false);
  });

  it("requests the day's options only once the planner opens", async () => {
    const get = mockGet();

    renderHome();

    expect(await screen.findByText(en.labels.NO_CHOICES_FOR_DAY)).toBeTruthy();
    expect(get).not.toHaveBeenCalledWith("/api/days/2026-11-17/options", expect.anything());

    fireEvent.click(screen.getByRole("button", { name: en.labels.PLAN_THIS_DAY }));

    const drawer = screen.getByRole("dialog", { name: en.labels.PLAN_THIS_DAY });
    expect(within(drawer).getByRole("status", { name: "Loading your day…" })).toBeTruthy();
    expect(await within(drawer).findByRole("button", { name: /^Secondi/ })).toBeTruthy();
    expect(get).toHaveBeenCalledWith("/api/days/2026-11-17/options", expect.anything());
  });

  it("builds the planner from the day's options rather than the plan document", async () => {
    const tuesday: DayOptions = {
      day: "Martedì",
      meals: [
        {
          meal: "Merenda",
          categories: [
            {
              category: "Frutta",
              options: [{ name: "Mela", amount: 150, unit: "g", position: 0 }],
              custom_options: [],
              current: null,
            },
          ],
        },
      ],
    };
    mockGet({ options: () => Promise.resolve(axiosResponse(tuesday)) });

    renderHome();
    fireEvent.click(await screen.findByRole("button", { name: en.labels.PLAN_THIS_DAY }));

    const drawer = screen.getByRole("dialog", { name: en.labels.PLAN_THIS_DAY });
    expect(await within(drawer).findByRole("button", { name: /^Frutta/ })).toBeTruthy();
    expect(within(drawer).queryByRole("button", { name: /^Secondi/ })).toBeNull();
  });

  it("saves an edited amount for the selected day only", async () => {
    const edited: DayChoice = { ...pesce, amount: 180 };
    mockGet({
      day: (date) => Promise.resolve(axiosResponse<Day>({ date, choices: [pesce] })),
    });
    const put = vi
      .spyOn(api, "put")
      .mockResolvedValue(axiosResponse<Day>({ date: "2026-11-17", choices: [edited] }));

    renderHome();
    expect(await screen.findByText("Pesce 150 g")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: en.labels.EDIT }));

    const drawer = screen.getByRole("dialog", { name: en.labels.PLAN_THIS_DAY });
    fireEvent.click(await within(drawer).findByRole("button", { name: /^Secondi/ }));
    fireEvent.click(within(drawer).getByRole("button", { name: en.labels.EDIT_PICK }));
    fireEvent.change(within(drawer).getByRole("spinbutton", { name: en.labels.AMOUNT }), {
      target: { value: "180" },
    });
    fireEvent.click(within(drawer).getByRole("button", { name: en.labels.APPLY }));
    fireEvent.click(within(drawer).getByRole("button", { name: "Save" }));

    expect(await screen.findByText(en.labels.DAY_SAVED)).toBeTruthy();
    expect(put).toHaveBeenCalledExactlyOnceWith("/api/days/2026-11-17", { choices: [edited] });
  });

  it("deletes a custom option from the planner and refreshes the options", async () => {
    const withSalmone = dayOptionsFrom(plan, "2026-11-17")!;
    withSalmone.meals[0]!.categories[0]!.custom_options = [
      { id: 7, name: "Salmone", amount: 120, unit: "g" },
    ];
    let optionsResponse = withSalmone;
    const get = mockGet({ options: () => Promise.resolve(axiosResponse(optionsResponse)) });
    const remove = vi.spyOn(api, "delete").mockImplementation(() => {
      optionsResponse = dayOptionsFrom(plan, "2026-11-17")!;
      return Promise.resolve(axiosResponse(""));
    });

    renderHome();
    fireEvent.click(await screen.findByRole("button", { name: en.labels.PLAN_THIS_DAY }));
    const drawer = screen.getByRole("dialog", { name: en.labels.PLAN_THIS_DAY });
    fireEvent.click(await within(drawer).findByRole("button", { name: /^Secondi/ }));
    fireEvent.click(within(drawer).getByRole("button", { name: "Delete Salmone 120 g" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: en.labels.DELETE_CUSTOM_OPTION_TITLE })).getByRole(
        "button",
        { name: "Delete" },
      ),
    );

    expect(await screen.findByText(en.labels.CUSTOM_OPTION_DELETED)).toBeTruthy();
    expect(remove).toHaveBeenCalledWith("/api/custom-options/7");
    await waitFor(() =>
      expect(
        within(drawer).queryByRole("radio", { name: "Salmone 120 g Custom option" }),
      ).toBeNull(),
    );
    expect(get.mock.calls.filter(([url]) => url === "/api/days/2026-11-17/options")).toHaveLength(
      2,
    );
  });

  it("shows an error toast when deleting a custom option fails", async () => {
    const withSalmone = dayOptionsFrom(plan, "2026-11-17")!;
    withSalmone.meals[0]!.categories[0]!.custom_options = [
      { id: 7, name: "Salmone", amount: 120, unit: "g" },
    ];
    mockGet({ options: () => Promise.resolve(axiosResponse(withSalmone)) });
    vi.spyOn(api, "delete").mockRejectedValue(axiosFailure(404, { code: "NOT_FOUND" }));

    renderHome();
    fireEvent.click(await screen.findByRole("button", { name: en.labels.PLAN_THIS_DAY }));
    const drawer = screen.getByRole("dialog", { name: en.labels.PLAN_THIS_DAY });
    fireEvent.click(await within(drawer).findByRole("button", { name: /^Secondi/ }));
    fireEvent.click(within(drawer).getByRole("button", { name: "Delete Salmone 120 g" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: en.labels.DELETE_CUSTOM_OPTION_TITLE })).getByRole(
        "button",
        { name: "Delete" },
      ),
    );

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", en.errors.NOT_FOUND);
    expect(within(drawer).getByRole("radio", { name: "Salmone 120 g Custom option" })).toBeTruthy();
  });

  it("shows a message in the planner when the plan has no options for the day", async () => {
    mockGet({ options: () => Promise.reject(axiosFailure(404, { code: "NOT_FOUND" })) });

    renderHome();
    fireEvent.click(await screen.findByRole("button", { name: en.labels.PLAN_THIS_DAY }));

    const drawer = screen.getByRole("dialog", { name: en.labels.PLAN_THIS_DAY });
    expect(await within(drawer).findByText(en.labels.NO_OPTIONS_FOR_DAY)).toBeTruthy();
  });

  it("shows the catalog message in the planner when the options request fails", async () => {
    mockGet({ options: () => Promise.reject(axiosFailure(500, { code: "INTERNAL_ERROR" })) });

    renderHome();
    fireEvent.click(await screen.findByRole("button", { name: en.labels.PLAN_THIS_DAY }));

    const drawer = screen.getByRole("dialog", { name: en.labels.PLAN_THIS_DAY });
    expect(await within(drawer).findByRole("alert")).toHaveProperty(
      "textContent",
      en.errors.INTERNAL_ERROR,
    );
  });

  it("shows the date strip and a loading indicator while the day is loading", async () => {
    mockGet({
      activePlan: () => Promise.resolve(axiosResponse(fullWeekPlan)),
      day: () => deferred<AxiosResponse>().promise,
    });

    renderHome();

    expect(await screen.findByRole("status", { name: "Loading your day…" })).toBeTruthy();
    expect(pressedDay()).toBe("Thursday, November 19");
    expect(screen.getByRole("button", { name: "Next day" })).toBeTruthy();
  });

  it("shows the catalog message when the day request fails", async () => {
    mockGet({
      day: () => Promise.reject(axiosFailure(500, { code: "INTERNAL_ERROR" })),
    });

    renderHome();

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      en.errors.INTERNAL_ERROR,
    );
    expect(screen.getByRole("button", { name: "Next day" })).toBeTruthy();
  });

  it("falls back to today when the date query param is invalid", async () => {
    const get = mockGet({
      activePlan: () => Promise.resolve(axiosResponse(fullWeekPlan)),
    });

    renderHome("/?date=not-a-date");

    expect(await screen.findByText(en.labels.NO_CHOICES_FOR_DAY)).toBeTruthy();
    expect(pressedDay()).toBe("Thursday, November 19");
    expect(get).toHaveBeenCalledWith("/api/days/2026-11-19", expect.anything());
  });

  it("renders only the disabled date strip when the active plan has no days", async () => {
    mockGet({
      activePlan: () => Promise.resolve(axiosResponse<PlanDocument>({ days: [] })),
    });

    renderHome();

    expect(await screen.findByRole("button", { name: "Next day" })).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByRole("status", { name: "Loading your day…" })).toBeNull(),
    );
    expect(dayButton("Thursday, November 19").disabled).toBe(true);
    expect(screen.queryByText(en.labels.NO_CHOICES_FOR_DAY)).toBeNull();
    expect(screen.queryByRole("button", { name: en.labels.EDIT })).toBeNull();
  });
});
