import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import { setLocale } from "../i18n";
import { axiosFailure } from "../test/http";

import App from "../App";

describe("RequireSession", () => {
  beforeEach(() => {
    setLocale("en");
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, "", "/");
    vi.restoreAllMocks();
  });

  it("redirects /profile home when signed out", async () => {
    window.history.pushState({}, "", "/profile");
    vi.spyOn(api, "get").mockRejectedValue(axiosFailure(401, { code: "UNAUTHORIZED" }));

    render(<App />);

    expect(await screen.findByRole("link", { name: "Sign in with Google" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Profile" })).toBeNull();
  });
});
