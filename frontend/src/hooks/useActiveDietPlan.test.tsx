import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import { setLocale } from "../i18n";
import { axiosFailure, axiosResponse } from "../test/http";
import type { PlanDocument } from "../types/diet-plan";
import { dietPlanErrorMessage, useActiveDietPlan } from "./useActiveDietPlan";

import { en } from "../i18n/locales/en";

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
              options: [{ name: "Tè", amount: 200, unit: "ml", position: 0 }],
            },
          ],
        },
      ],
    },
  ],
};

function renderActivePlan() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useActiveDietPlan(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

describe("dietPlanErrorMessage", () => {
  beforeEach(() => {
    setLocale("en");
  });

  it("returns the catalog message for a problem code", () => {
    expect(dietPlanErrorMessage(axiosFailure(422, { code: "VALIDATION_ERROR" }))).toBe(
      en.errors.VALIDATION_ERROR,
    );
    expect(dietPlanErrorMessage(axiosFailure(413, { code: "PAYLOAD_TOO_LARGE" }))).toBe(
      en.errors.PAYLOAD_TOO_LARGE,
    );
    expect(dietPlanErrorMessage(axiosFailure(429, { code: "RATE_LIMITED" }))).toBe(
      en.errors.RATE_LIMITED,
    );
  });

  it("returns the unknown message when the body is not a problem", () => {
    expect(dietPlanErrorMessage(axiosFailure(500, ""))).toBe(en.errors.UNKNOWN);
    expect(dietPlanErrorMessage(axiosFailure(500, null))).toBe(en.errors.UNKNOWN);
    expect(dietPlanErrorMessage(new AxiosError("network"))).toBe(en.errors.UNKNOWN);
  });

  it("returns an error message or the unknown fallback", () => {
    expect(dietPlanErrorMessage(new Error("The request was blocked."))).toBe(
      "The request was blocked.",
    );
    expect(dietPlanErrorMessage("nope")).toBe("Unknown error");
  });
});

describe("useActiveDietPlan", () => {
  it("returns the active plan", async () => {
    vi.spyOn(api, "get").mockResolvedValue(axiosResponse(plan));

    const { result } = renderActivePlan();

    await waitFor(() => expect(result.current.data).toEqual(plan));
  });

  it("returns null when there is no active plan", async () => {
    vi.spyOn(api, "get").mockRejectedValue(axiosFailure(404, { code: "NOT_FOUND" }));

    const { result } = renderActivePlan();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("keeps other request failures", async () => {
    vi.spyOn(api, "get").mockRejectedValue(axiosFailure(500, { code: "INTERNAL_ERROR" }));

    const { result } = renderActivePlan();

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("keeps a failure that is not an axios 404", async () => {
    vi.spyOn(api, "get").mockRejectedValue(new AxiosError("network"));

    const { result } = renderActivePlan();

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("keeps a failure that is not an axios error", async () => {
    vi.spyOn(api, "get").mockRejectedValue(new Error("The request was blocked."));

    const { result } = renderActivePlan();

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
