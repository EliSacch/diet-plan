import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { AxiosError } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import { axiosFailure, axiosResponse } from "../test/http";
import type { Day } from "../types/day";
import type { PlanDay } from "../types/diet-plan";
import { dayQueryOptions, useDay, useDayOptions, useSaveDay } from "./useDay";

const pasta = {
  meal: "Pranzo",
  category: "Primi",
  name: "Pasta",
  amount: 80,
  unit: "g",
};

const planDay: PlanDay = {
  day: "Giovedì",
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

describe("useDay", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the saved day", async () => {
    const day: Day = { date: "2026-11-19", choices: [pasta] };
    const get = vi.spyOn(api, "get").mockResolvedValue(axiosResponse(day));

    const { result } = renderWithClient(() => useDay("2026-11-19"));

    await waitFor(() => expect(result.current.data).toEqual(day));
    expect(get.mock.calls[0]?.[0]).toBe("/api/days/2026-11-19");
  });

  it("keeps request failures", async () => {
    vi.spyOn(api, "get").mockRejectedValue(axiosFailure(422, { code: "VALIDATION_ERROR" }));

    const { result } = renderWithClient(() => useDay("2026-11-19"));

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useDayOptions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the options for the date", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue(axiosResponse(planDay));

    const { result } = renderWithClient(() => useDayOptions("2026-11-19"));

    await waitFor(() => expect(result.current.data).toEqual(planDay));
    expect(get.mock.calls[0]?.[0]).toBe("/api/days/2026-11-19/options");
  });

  it("returns null when there is no active plan or weekday entry", async () => {
    vi.spyOn(api, "get").mockRejectedValue(axiosFailure(404, { code: "NOT_FOUND" }));

    const { result } = renderWithClient(() => useDayOptions("2026-11-19"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it.each([
    ["a server error", axiosFailure(500, { code: "INTERNAL_ERROR" })],
    ["a network error", new AxiosError("network")],
    ["a non-axios error", new Error("The request was blocked.")],
  ])("keeps %s", async (_label, error) => {
    vi.spyOn(api, "get").mockRejectedValue(error);

    const { result } = renderWithClient(() => useDayOptions("2026-11-19"));

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useSaveDay", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("saves the choices and caches the saved day", async () => {
    const saved: Day = { date: "2026-11-19", choices: [pasta] };
    const put = vi.spyOn(api, "put").mockResolvedValue(axiosResponse(saved));

    const { client, result } = renderWithClient(() => useSaveDay("2026-11-19"));
    await act(() => result.current.mutateAsync([pasta]));

    expect(put).toHaveBeenCalledWith("/api/days/2026-11-19", { choices: [pasta] });
    expect(client.getQueryData(dayQueryOptions("2026-11-19").queryKey)).toEqual(saved);
    expect(client.getQueryData(dayQueryOptions("2026-11-20").queryKey)).toBeUndefined();
  });

  it("leaves the cached day alone when the save fails", async () => {
    const cached: Day = { date: "2026-11-19", choices: [] };
    vi.spyOn(api, "put").mockRejectedValue(axiosFailure(422, { code: "VALIDATION_ERROR" }));

    const { client, result } = renderWithClient(() => useSaveDay("2026-11-19"));
    client.setQueryData(dayQueryOptions("2026-11-19").queryKey, cached);
    await act(async () => {
      await expect(result.current.mutateAsync([pasta])).rejects.toBeInstanceOf(AxiosError);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData(dayQueryOptions("2026-11-19").queryKey)).toEqual(cached);
  });
});
