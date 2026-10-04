import { describe, expect, it, vi } from "vitest";

import { axiosResponse } from "../test/http";
import { logout } from "./auth";
import { api } from "./client";

describe("logout", () => {
  it("posts to the logout endpoint", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue(axiosResponse(undefined));

    await logout();

    expect(post).toHaveBeenCalledWith("/auth/logout");
  });
});
