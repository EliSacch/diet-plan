import { describe, expect, it, vi } from "vitest";

import { axiosResponse } from "../test/http";
import type { CategoryPreference } from "../types/category-preference";
import { listCategoryPreferences, setCategoryPreference } from "./category-preferences";
import { api } from "./client";

describe("listCategoryPreferences", () => {
  it("gets the saved preferences", async () => {
    const preferences: CategoryPreference[] = [{ category: "Contorni", multi_select: true }];
    const get = vi.spyOn(api, "get").mockResolvedValue(axiosResponse(preferences));
    const signal = new AbortController().signal;

    await expect(listCategoryPreferences(signal)).resolves.toEqual(preferences);
    expect(get).toHaveBeenCalledWith("/api/category-preferences", { signal });
  });
});

describe("setCategoryPreference", () => {
  it("puts the preference and returns it", async () => {
    const preference: CategoryPreference = { category: "Contorni", multi_select: true };
    const put = vi.spyOn(api, "put").mockResolvedValue(axiosResponse(preference));

    await expect(setCategoryPreference(preference)).resolves.toEqual(preference);
    expect(put).toHaveBeenCalledWith("/api/category-preferences", preference);
  });
});
