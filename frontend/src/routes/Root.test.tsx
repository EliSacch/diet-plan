import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import { setLocale } from "../i18n";
import { axiosFailure, axiosResponse, deferred } from "../test/http";

import App from "../App";

import type { AxiosResponse } from "axios";

describe("Root", () => {
  beforeEach(() => {
    setLocale("en");
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, "", "/");
    vi.restoreAllMocks();
  });

  it("shows the Google button when there is no session", async () => {
    const pending = deferred<AxiosResponse>();
    const getProfile = vi.spyOn(api, "get").mockReturnValue(pending.promise);

    render(<App />);

    expect(screen.getByText("Checking your session…")).toBeTruthy();
    pending.reject(axiosFailure(401, { code: "UNAUTHORIZED" }));

    const link = await screen.findByRole("link", { name: "Sign in with Google" });
    expect(link.getAttribute("href")).toBe("/auth/google");
    expect(getProfile.mock.calls[0]?.[0]).toBe("/api/profile");
    expect(getProfile.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("hides the Google button on Root when signed in", async () => {
    vi.spyOn(api, "get").mockImplementation((url: string) => {
      if (url === "/api/diet-plans/active") {
        return Promise.reject(axiosFailure(404, { code: "NOT_FOUND" }));
      }
      return Promise.resolve(axiosResponse({ id: 1, email: "ada@example.com" }));
    });

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Diet Plan" })).toBeTruthy();
    expect(await screen.findByLabelText("Upload diet plan")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Sign in with Google" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  });
});
