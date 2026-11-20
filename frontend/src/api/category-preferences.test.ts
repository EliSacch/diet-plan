import { describe, expect, it, vi } from "vitest";

import { axiosResponse } from "../test/http";
import type { CategoryPreference } from "../types/category-preference";
import { setCategoryPreference } from "./category-preferences";
import { api } from "./client";

describe("setCategoryPreference", () => {
  it("puts the preference and returns it", async () => {
    const preference: CategoryPreference = { category: "Contorni", multi_select: true };
    const put = vi.spyOn(api, "put").mockResolvedValue(axiosResponse(preference));

    await expect(setCategoryPreference(preference)).resolves.toEqual(preference);
    expect(put).toHaveBeenCalledWith("/api/category-preferences", preference);
  });
});
