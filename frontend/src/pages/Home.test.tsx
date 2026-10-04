import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import { setLocale } from "../i18n";
import { axiosFailure, axiosResponse, deferred } from "../test/http";
import type { PlanDocument } from "../types/diet-plan";
import Home from "./Home";

import { en } from "../i18n/locales/en";

import type { AxiosResponse } from "axios";

const plan: PlanDocument = {
  days: [
    {
      day: "Lunedì",
      meals: [
        {
          meal: "Colazione",
          categories: [
            {
              category: "Bevande",
              options: [
                {
                  name: "Bevanda a base di avena con calcio e vitamine agg.",
                  amount: 250,
                  unit: "ml",
                  position: 0,
                },
                { name: "Tè", amount: 1, unit: null, position: 1 },
              ],
            },
            {
              category: "Contorni",
              options: [{ name: "Insalata mista", amount: null, unit: null, position: 0 }],
            },
          ],
        },
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

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return render(<Home />, { wrapper: Wrapper });
}

describe("Home", () => {
  afterEach(() => {
    cleanup();
    setLocale("en");
    vi.restoreAllMocks();
  });

  it("shows a loading line while the active plan is loading", () => {
    vi.spyOn(api, "get").mockReturnValue(deferred<AxiosResponse>().promise);

    renderHome();

    expect(screen.getByText("Loading your diet plan…")).toBeTruthy();
  });

  it("shows the upload button when there is no active plan", async () => {
    vi.spyOn(api, "get").mockRejectedValue(axiosFailure(404, { code: "NOT_FOUND" }));

    renderHome();

    expect(await screen.findByRole("button", { name: "Upload diet plan" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Days" })).toBeNull();
  });

  it("shows the catalog message when the active plan request fails", async () => {
    vi.spyOn(api, "get").mockRejectedValue(axiosFailure(500, { code: "INTERNAL_ERROR" }));

    renderHome();

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      en.errors.INTERNAL_ERROR,
    );
  });

  it("lists the selected day and meal, and omits a null amount", async () => {
    vi.spyOn(api, "get").mockResolvedValue(axiosResponse(plan));

    renderHome();

    expect(await screen.findByRole("button", { name: "Lunedì" })).toHaveProperty(
      "ariaPressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Colazione" })).toHaveProperty("ariaPressed", "true");
    expect(screen.getByRole("heading", { name: "Bevande" })).toBeTruthy();
    expect(
      screen.getByText("Bevanda a base di avena con calcio e vitamine agg. 250 ml"),
    ).toBeTruthy();
    expect(screen.getByText("Tè 1")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Contorni" })).toBeTruthy();
    expect(screen.getByText("Insalata mista").textContent).toBe("Insalata mista");
    expect(screen.queryByRole("button", { name: "Upload diet plan" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Pranzo" }));

    expect(screen.getByRole("button", { name: "Pranzo" })).toHaveProperty("ariaPressed", "true");
    expect(screen.getByText("Pasta 80 g")).toBeTruthy();
    expect(screen.queryByText("Insalata mista")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Martedì" }));

    expect(screen.getByRole("button", { name: "Martedì" })).toHaveProperty("ariaPressed", "true");
    expect(screen.getByRole("button", { name: "Cena" })).toHaveProperty("ariaPressed", "true");
    expect(screen.queryByRole("button", { name: "Pranzo" })).toBeNull();
    expect(screen.getByText("Pesce 150 g")).toBeTruthy();
    expect(screen.queryByText("Pasta 80 g")).toBeNull();
  });
});
