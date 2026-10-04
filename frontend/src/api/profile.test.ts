import { describe, expect, it, vi } from "vitest";

import { axiosResponse } from "../test/http";
import { api } from "./client";
import { getProfile } from "./profile";

describe("getProfile", () => {
  it("requests /api/profile with the abort signal", async () => {
    const signal = new AbortController().signal;
    const get = vi
      .spyOn(api, "get")
      .mockResolvedValue(axiosResponse({ id: 1, email: "ada@example.com" }));

    await expect(getProfile(signal)).resolves.toEqual({ id: 1, email: "ada@example.com" });
    expect(get).toHaveBeenCalledWith("/api/profile", { signal });
  });
});
