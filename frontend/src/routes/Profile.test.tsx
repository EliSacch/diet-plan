import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import { SessionProvider } from "../context/SessionContext";
import { setLocale } from "../i18n";
import { axiosResponse, deferred } from "../test/http";
import Profile from "./Profile";

import App from "../App";

import type { AxiosResponse } from "axios";

describe("Profile", () => {
  beforeEach(() => {
    setLocale("en");
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, "", "/");
    vi.restoreAllMocks();
  });

  it("shows the signed-in email and returns to the Google button after sign out", async () => {
    window.history.pushState({}, "", "/profile");
    vi.spyOn(api, "get").mockResolvedValue(axiosResponse({ id: 1, email: "ada@example.com" }));
    const logout = vi.spyOn(api, "post").mockResolvedValue(axiosResponse(undefined));

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Profile" })).toBeTruthy();
    expect(screen.getByText("ada@example.com")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("link", { name: "Sign in with Google" })).toBeTruthy();
    expect(logout.mock.calls[0]?.[0]).toBe("/auth/logout");
  });

  it("shows the profile page when signed in", async () => {
    window.history.pushState({}, "", "/profile");
    vi.spyOn(api, "get").mockResolvedValue(axiosResponse({ id: 1, email: "ada@example.com" }));

    render(<App />);

    expect(screen.getByText("Checking your session…")).toBeTruthy();
    expect(await screen.findByRole("heading", { name: "Profile" })).toBeTruthy();
    expect(screen.getByText("ada@example.com")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Upload diet plan" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
  });

  it("renders nothing on the profile page until the session is signed in", () => {
    const pending = deferred<AxiosResponse>();
    vi.spyOn(api, "get").mockReturnValue(pending.promise);

    render(
      <QueryClientProvider client={new QueryClient()}>
        <SessionProvider>
          <Profile />
        </SessionProvider>
      </QueryClientProvider>,
    );

    expect(screen.queryByRole("heading", { name: "Profile" })).toBeNull();
  });
});
