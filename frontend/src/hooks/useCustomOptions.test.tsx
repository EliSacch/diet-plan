import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { AxiosError } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import { axiosFailure, axiosResponse } from "../test/http";
import type { CustomOption, CustomOptionInput } from "../types/custom-option";
import type { Day, DayOptions } from "../types/day";
import { useCreateCustomOption, useDeleteCustomOption } from "./useCustomOptions";
import { dayOptionsQueryOptions, dayQueryOptions } from "./useDay";

const farro: CustomOptionInput = {
  meal: "Pranzo",
  category: "Primi",
  name: "Pasta di farro",
  amount: 70,
  unit: "g",
};

const options: DayOptions = { day: "Lunedì", meals: [] };
const day: Day = { date: "2026-11-16", choices: [] };

function renderWithClient<T>(hook: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(dayOptionsQueryOptions("2026-11-16").queryKey, options);
  client.setQueryData(dayOptionsQueryOptions("2026-11-17").queryKey, options);
  client.setQueryData(dayQueryOptions("2026-11-16").queryKey, day);
  const rendered = renderHook(hook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  const invalidated = (queryKey: readonly unknown[]) =>
    client.getQueryState(queryKey)?.isInvalidated;
  return { client, invalidated, ...rendered };
}

describe("useCreateCustomOption", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates the option and marks every day's options as stale", async () => {
    const stored: CustomOption = { id: 7, ...farro };
    const post = vi.spyOn(api, "post").mockResolvedValue(axiosResponse(stored));

    const { invalidated, result } = renderWithClient(() => useCreateCustomOption());
    await act(async () => {
      await expect(result.current.mutateAsync(farro)).resolves.toEqual(stored);
    });

    expect(post).toHaveBeenCalledWith("/api/custom-options", farro);
    expect(invalidated(dayOptionsQueryOptions("2026-11-16").queryKey)).toBe(true);
    expect(invalidated(dayOptionsQueryOptions("2026-11-17").queryKey)).toBe(true);
    expect(invalidated(dayQueryOptions("2026-11-16").queryKey)).toBe(false);
  });

  it("leaves the cached options alone when creating fails", async () => {
    vi.spyOn(api, "post").mockRejectedValue(axiosFailure(409, { code: "CONFLICT" }));

    const { invalidated, result } = renderWithClient(() => useCreateCustomOption());
    await act(async () => {
      await expect(result.current.mutateAsync(farro)).rejects.toBeInstanceOf(AxiosError);
    });

    expect(invalidated(dayOptionsQueryOptions("2026-11-16").queryKey)).toBe(false);
  });
});

describe("useDeleteCustomOption", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deletes the option and marks every day's options as stale", async () => {
    const remove = vi.spyOn(api, "delete").mockResolvedValue(axiosResponse(""));

    const { invalidated, result } = renderWithClient(() => useDeleteCustomOption());
    await act(() => result.current.mutateAsync(7));

    expect(remove).toHaveBeenCalledWith("/api/custom-options/7");
    expect(invalidated(dayOptionsQueryOptions("2026-11-16").queryKey)).toBe(true);
    expect(invalidated(dayOptionsQueryOptions("2026-11-17").queryKey)).toBe(true);
    expect(invalidated(dayQueryOptions("2026-11-16").queryKey)).toBe(false);
  });

  it("leaves the cached options alone when deleting fails", async () => {
    vi.spyOn(api, "delete").mockRejectedValue(axiosFailure(404, { code: "NOT_FOUND" }));

    const { invalidated, result } = renderWithClient(() => useDeleteCustomOption());
    await act(async () => {
      await expect(result.current.mutateAsync(7)).rejects.toBeInstanceOf(AxiosError);
    });

    expect(invalidated(dayOptionsQueryOptions("2026-11-16").queryKey)).toBe(false);
  });
});
