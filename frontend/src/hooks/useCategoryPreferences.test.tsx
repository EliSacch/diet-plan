import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { AxiosError } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import { axiosFailure, axiosResponse } from "../test/http";
import type { DayOptions } from "../types/day";
import { useSetCategoryPreference } from "./useCategoryPreferences";
import { dayOptionsQueryOptions, dayQueryOptions } from "./useDay";

const options: DayOptions = {
  day: "Lunedì",
  meals: [
    {
      meal: "Pranzo",
      categories: [
        {
          category: "Primi",
          options: [{ name: "Pasta", amount: 80, unit: "g", position: 0 }],
          custom_options: [],
          current: [],
          multi_select: false,
        },
        {
          category: "Contorni",
          options: [{ name: "Insalata", amount: null, unit: null, position: 0 }],
          custom_options: [],
          current: [],
          multi_select: false,
        },
      ],
    },
  ],
};

function renderWithClient<T>(hook: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(dayOptionsQueryOptions("2026-11-16").queryKey, options);
  client.setQueryData(dayOptionsQueryOptions("2026-11-17").queryKey, null);
  client.setQueryData(dayQueryOptions("2026-11-16").queryKey, {
    date: "2026-11-16",
    choices: [],
  });
  const rendered = renderHook(hook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  return { client, ...rendered };
}

describe("useSetCategoryPreference", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("updates every day's options cache for that category name", async () => {
    const preference = { category: "Contorni", multi_select: true };
    const put = vi.spyOn(api, "put").mockResolvedValue(axiosResponse(preference));

    const { client, result } = renderWithClient(() => useSetCategoryPreference());
    await act(async () => {
      await expect(result.current.mutateAsync(preference)).resolves.toEqual(preference);
    });

    expect(put).toHaveBeenCalledWith("/api/category-preferences", preference);
    expect(client.getQueryData(dayOptionsQueryOptions("2026-11-16").queryKey)).toEqual({
      ...options,
      meals: [
        {
          ...options.meals[0],
          categories: [
            options.meals[0].categories[0],
            { ...options.meals[0].categories[1], multi_select: true },
          ],
        },
      ],
    });
    expect(client.getQueryData(dayOptionsQueryOptions("2026-11-17").queryKey)).toBeNull();
  });

  it("rolls the cache back when saving fails", async () => {
    vi.spyOn(api, "put").mockRejectedValue(axiosFailure(422, { code: "VALIDATION_ERROR" }));

    const { client, result } = renderWithClient(() => useSetCategoryPreference());
    await act(async () => {
      await expect(
        result.current.mutateAsync({ category: "Contorni", multi_select: true }),
      ).rejects.toBeInstanceOf(AxiosError);
    });

    expect(client.getQueryData(dayOptionsQueryOptions("2026-11-16").queryKey)).toEqual(options);
    expect(client.getQueryData(dayOptionsQueryOptions("2026-11-17").queryKey)).toBeNull();
  });

  it("ignores a missing mutation context when the optimistic update fails", async () => {
    const { client, result } = renderWithClient(() => useSetCategoryPreference());
    vi.spyOn(client, "cancelQueries").mockRejectedValue(new Error("cancel failed"));

    await act(async () => {
      await expect(
        result.current.mutateAsync({ category: "Contorni", multi_select: true }),
      ).rejects.toThrow("cancel failed");
    });

    expect(client.getQueryData(dayOptionsQueryOptions("2026-11-16").queryKey)).toEqual(options);
  });
});
