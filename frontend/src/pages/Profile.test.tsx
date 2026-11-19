import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import { SessionProvider } from "../context/SessionContext";
import { ToastProvider } from "../context/ToastContext";
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

    expect(await screen.findByText("ada@example.com")).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    const dialog = screen.getByRole("dialog", { name: "Sign out?" });
    expect(logout).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("link", { name: "Sign in with Google" })).toBeTruthy();
    expect(logout.mock.calls[0]?.[0]).toBe("/auth/logout");
    expect(
      within(screen.getByRole("region", { name: "Notifications" })).getByText(
        "You've been signed out.",
      ),
    ).toBeTruthy();
  });

  it("stays signed in when sign out is cancelled", async () => {
    window.history.pushState({}, "", "/profile");
    vi.spyOn(api, "get").mockResolvedValue(axiosResponse({ id: 1, email: "ada@example.com" }));
    const logout = vi.spyOn(api, "post");

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("ada@example.com")).toBeTruthy();
    expect(logout).not.toHaveBeenCalled();
  });

  it("shows the profile page when signed in", async () => {
    window.history.pushState({}, "", "/profile");
    vi.spyOn(api, "get").mockResolvedValue(axiosResponse({ id: 1, email: "ada@example.com" }));

    render(<App />);

    expect(screen.getByRole("status", { name: "Checking your session…" })).toBeTruthy();
    expect(await screen.findByText("ada@example.com")).toBeTruthy();
    expect(screen.getByLabelText("Upload diet plan")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign out" }).className).toContain("btn-secondary");
  });

  it("renders nothing on the profile page until the session is signed in", () => {
    const pending = deferred<AxiosResponse>();
    vi.spyOn(api, "get").mockReturnValue(pending.promise);

    render(
      <QueryClientProvider client={new QueryClient()}>
        <ToastProvider>
          <SessionProvider>
            <Profile />
          </SessionProvider>
        </ToastProvider>
      </QueryClientProvider>,
    );

    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  });
});
