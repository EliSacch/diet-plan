import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { AxiosError } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import { axiosFailure, axiosResponse } from "../test/http";
import type { PlanDocument } from "../types/diet-plan";
import type { Week } from "../types/week";
import { useSaveWeek, useWeek, useWeekOptions, weekQueryOptions } from "./useWeek";

const pasta = {
  day: "Lunedì",
  meal: "Pranzo",
  category: "Primi",
  name: "Pasta",
  amount: 80,
  unit: "g",
};

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

function renderWithClient<T>(hook: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rendered = renderHook(hook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  return { client, ...rendered };
}

describe("useWeek", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the saved week", async () => {
    const week: Week = { week_start: "2026-11-16", choices: [pasta] };
    const get = vi.spyOn(api, "get").mockResolvedValue(axiosResponse(week));

    const { result } = renderWithClient(() => useWeek("2026-11-16"));

    await waitFor(() => expect(result.current.data).toEqual(week));
    expect(get.mock.calls[0]?.[0]).toBe("/api/weeks/2026-11-16");
  });

  it("keeps request failures", async () => {
    vi.spyOn(api, "get").mockRejectedValue(axiosFailure(422, { code: "VALIDATION_ERROR" }));

    const { result } = renderWithClient(() => useWeek("2026-11-16"));

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useWeekOptions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the options of the active plan", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue(axiosResponse(plan));

    const { result } = renderWithClient(() => useWeekOptions("2026-11-16"));

    await waitFor(() => expect(result.current.data).toEqual(plan));
    expect(get.mock.calls[0]?.[0]).toBe("/api/weeks/2026-11-16/options");
  });

  it("returns null when there is no active plan", async () => {
    vi.spyOn(api, "get").mockRejectedValue(axiosFailure(404, { code: "NOT_FOUND" }));

    const { result } = renderWithClient(() => useWeekOptions("2026-11-16"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it.each([
    ["a server error", axiosFailure(500, { code: "INTERNAL_ERROR" })],
    ["a network error", new AxiosError("network")],
    ["a non-axios error", new Error("The request was blocked.")],
  ])("keeps %s", async (_label, error) => {
    vi.spyOn(api, "get").mockRejectedValue(error);

    const { result } = renderWithClient(() => useWeekOptions("2026-11-16"));

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useSaveWeek", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("saves the choices and caches the saved week", async () => {
    const saved: Week = { week_start: "2026-11-16", choices: [pasta] };
    const put = vi.spyOn(api, "put").mockResolvedValue(axiosResponse(saved));

    const { client, result } = renderWithClient(() => useSaveWeek("2026-11-16"));
    await act(() => result.current.mutateAsync([pasta]));

    expect(put).toHaveBeenCalledWith("/api/weeks/2026-11-16", { choices: [pasta] });
    expect(client.getQueryData(weekQueryOptions("2026-11-16").queryKey)).toEqual(saved);
    expect(client.getQueryData(weekQueryOptions("2026-11-23").queryKey)).toBeUndefined();
  });

  it("leaves the cached week alone when the save fails", async () => {
    const cached: Week = { week_start: "2026-11-16", choices: [] };
    vi.spyOn(api, "put").mockRejectedValue(axiosFailure(422, { code: "VALIDATION_ERROR" }));

    const { client, result } = renderWithClient(() => useSaveWeek("2026-11-16"));
    client.setQueryData(weekQueryOptions("2026-11-16").queryKey, cached);
    await act(async () => {
      await expect(result.current.mutateAsync([pasta])).rejects.toBeInstanceOf(AxiosError);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData(weekQueryOptions("2026-11-16").queryKey)).toEqual(cached);
  });
});
