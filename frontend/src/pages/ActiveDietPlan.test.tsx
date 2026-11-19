import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import { ToastProvider } from "../context/ToastContext";
import { setLocale } from "../i18n";
import { axiosFailure, axiosResponse, deferred } from "../test/http";
import type { PlanDocument } from "../types/diet-plan";
import ActiveDietPlan from "./ActiveDietPlan";

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
              options: [{ name: "Pasta", amount: 80, unit: "g", position: 0 }],
            },
          ],
        },
      ],
    },
  ],
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <ToastProvider>
          <MemoryRouter>{children}</MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );
  }
  return render(<ActiveDietPlan />, { wrapper: Wrapper });
}

describe("ActiveDietPlan", () => {
  afterEach(() => {
    cleanup();
    setLocale("en");
    vi.restoreAllMocks();
  });

  it("shows a loading line while the active plan is loading", () => {
    vi.spyOn(api, "get").mockReturnValue(deferred<AxiosResponse>().promise);

    renderPage();

    expect(screen.getByText("Loading your diet plan…")).toBeTruthy();
  });

  it("shows the upload button when there is no active plan", async () => {
    vi.spyOn(api, "get").mockRejectedValue(axiosFailure(404, { code: "NOT_FOUND" }));

    renderPage();

    expect(await screen.findByLabelText("Upload diet plan")).toBeTruthy();
    expect(screen.getByText(en.labels.NO_DIET_PLAN_YET)).toBeTruthy();
    expect(screen.queryByLabelText("Day")).toBeNull();
  });

  it("shows the catalog message when the active plan request fails", async () => {
    vi.spyOn(api, "get").mockRejectedValue(axiosFailure(500, { code: "INTERNAL_ERROR" }));

    renderPage();

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      en.errors.INTERNAL_ERROR,
    );
  });

  it("renders the active plan", async () => {
    vi.spyOn(api, "get").mockResolvedValue(axiosResponse(plan));

    renderPage();

    expect(await screen.findByText("Pasta 80 g")).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.queryByLabelText("Upload diet plan")).toBeNull();
  });
});
