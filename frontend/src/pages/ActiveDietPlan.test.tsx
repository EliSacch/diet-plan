import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import { ToastProvider } from "../context/ToastContext";
import { setLocale } from "../i18n";
import { axiosFailure, axiosResponse, deferred } from "../test/http";
import type { CategoryPreference } from "../types/category-preference";
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

function mockGets(preferences: CategoryPreference[] = []) {
  return vi.spyOn(api, "get").mockImplementation((url) => {
    if (url === "/api/category-preferences") {
      return Promise.resolve(axiosResponse(preferences));
    }
    return Promise.resolve(axiosResponse(plan));
  });
}

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

  it("renders the active plan and one switch per category", async () => {
    mockGets([{ category: "Primi", multi_select: true }]);

    renderPage();

    expect(await screen.findByText("Pasta 80 g")).toBeTruthy();
    expect(screen.queryByRole("switch")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: en.labels.PLAN_OPTIONS }));
    expect(screen.getByRole("switch", { name: "Multiple, Primi" })).toHaveProperty("checked", true);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.queryByLabelText("Upload diet plan")).toBeNull();
  });

  it("keeps showing the loading line while preferences are loading", async () => {
    const preferences = deferred<AxiosResponse>();
    vi.spyOn(api, "get").mockImplementation((url) => {
      if (url === "/api/category-preferences") {
        return preferences.promise;
      }
      return Promise.resolve(axiosResponse(plan));
    });

    renderPage();

    expect(await screen.findByText(en.labels.LOADING_YOUR_DIET_PLAN)).toBeTruthy();
    expect(screen.queryByText("Pasta 80 g")).toBeNull();

    preferences.resolve(axiosResponse([]));

    expect(await screen.findByText("Pasta 80 g")).toBeTruthy();
  });

  it("shows the catalog message when preferences fail to load", async () => {
    vi.spyOn(api, "get").mockImplementation((url) => {
      if (url === "/api/category-preferences") {
        return Promise.reject(axiosFailure(500, { code: "INTERNAL_ERROR" }));
      }
      return Promise.resolve(axiosResponse(plan));
    });

    renderPage();

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      en.errors.INTERNAL_ERROR,
    );
  });

  it("saves a multiple-choice preference from the plan switch", async () => {
    mockGets();
    const put = vi
      .spyOn(api, "put")
      .mockResolvedValue(axiosResponse({ category: "Primi", multi_select: true }));

    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: en.labels.PLAN_OPTIONS }));
    fireEvent.click(screen.getByRole("switch", { name: "Multiple, Primi" }));

    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("/api/category-preferences", {
        category: "Primi",
        multi_select: true,
      }),
    );
    expect(screen.getByRole("switch", { name: "Multiple, Primi" })).toHaveProperty("checked", true);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows an error toast when saving a multiple-choice preference fails", async () => {
    mockGets([{ category: "Primi", multi_select: true }]);
    vi.spyOn(api, "put").mockRejectedValue(axiosFailure(422, { code: "VALIDATION_ERROR" }));

    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: en.labels.PLAN_OPTIONS }));
    fireEvent.click(screen.getByRole("switch", { name: "Multiple, Primi" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      en.errors.VALIDATION_ERROR,
    );
    expect(screen.getByRole("switch", { name: "Multiple, Primi" })).toHaveProperty("checked", true);
  });
});
